import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs'
import { dirname, extname, relative, resolve, sep } from 'node:path'
import ts from 'typescript'
import { expect, it } from 'vitest'
import { translations } from './translations'

type Use = { key: string; path: string; line: number; syntax: 't' | 'T' | 'key-value' }
const root = realpathSync(resolve(__dirname, '..'))
const languages = ['es', 'en', 'fr', 'pt', 'it', 'de', 'zh', 'hi', 'ar', 'ru', 'ja', 'ko', 'tr', 'vi', 'pl']
const sourceExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs']
const entryNames = /^(?:page|layout|template|default|not-found|error|global-error|loading|route)\.(?:tsx?|jsx?)$/
const keyNamespaces = new Set(Object.keys(translations.es).map(key => key.split('.')[0]))

function entries(folder: string): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(folder, entry.name)
    return entry.isDirectory() ? entries(path) : entryNames.test(entry.name) ? [path] : []
  })
}

function localModule(owner: string, specifier: string): string | null {
  const bare = specifier.startsWith('@/') ? resolve(root, specifier.slice(2)) : specifier.startsWith('.') ? resolve(dirname(owner), specifier) : null
  if (!bare) return null
  for (const candidate of [bare, ...sourceExtensions.map(extension => bare + extension), ...sourceExtensions.map(extension => resolve(bare, 'index' + extension))]) {
    if (!sourceExtensions.includes(extname(candidate)) || !existsSync(candidate) || !statSync(candidate).isFile()) continue
    const real = realpathSync(candidate)
    if (real.startsWith(root + sep)) return real
  }
  return null
}

function literal(node: ts.Node | undefined): string | null {
  return node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : null
}

function literalAlternatives(node: ts.Node | undefined): string[] | null {
  const direct = literal(node)
  if (direct !== null) return [direct]
  if (!node) return null
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isNonNullExpression(node)) return literalAlternatives(node.expression)
  if (ts.isConditionalExpression(node)) {
    const yes = literalAlternatives(node.whenTrue), no = literalAlternatives(node.whenFalse)
    return yes && no ? [...new Set([...yes, ...no])] : null
  }
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = literalAlternatives(node.left), right = literalAlternatives(node.right)
    return left && right && left.length * right.length <= 100 ? left.flatMap(a => right.map(b => a + b)) : null
  }
  return null
}

// Some DOM helpers wrap the catalogue with a local t(key) which adds a namespace.
// Infer the namespace from its actual indexed lookup; do not exclude its calls.
function localTranslationPrefix(source: ts.SourceFile): string {
  const prefixes = new Set<string>()
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 't' && node.initializer &&
      (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) {
      const parameter = node.initializer.parameters[0]?.name
      if (parameter && ts.isIdentifier(parameter)) {
        const inspect = (lookup: ts.Node) => {
          if (ts.isElementAccessExpression(lookup) && ts.isBinaryExpression(lookup.argumentExpression) && lookup.argumentExpression.operatorToken.kind === ts.SyntaxKind.PlusToken &&
            ts.isIdentifier(lookup.argumentExpression.right) && lookup.argumentExpression.right.text === parameter.text) {
            const prefix = literal(lookup.argumentExpression.left)
            if (prefix !== null) prefixes.add(prefix)
          }
          ts.forEachChild(lookup, inspect)
        }
        inspect(node.initializer.body)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  expect(prefixes.size, 'Multiple local t namespaces require explicit lexical resolution: ' + source.fileName).toBeLessThanOrEqual(1)
  return [...prefixes][0] || ''
}

function translationFunctionNames(source: ts.SourceFile): Set<string> {
  const names = new Set(['t'])
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isObjectBindingPattern(node.name)) {
      for (const element of node.name.elements) {
        if (element.propertyName?.getText(source) === 't' && ts.isIdentifier(element.name)) names.add(element.name.text)
      }
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer &&
      ts.isPropertyAccessExpression(node.initializer) && node.initializer.name.text === 't') names.add(node.name.text)
    ts.forEachChild(node, visit)
  }
  visit(source)
  return names
}

function reachableTranslationUses() {
  const entrypoints = entries(resolve(root, 'app'))
  const queue = [...entrypoints]
  const visited = new Set<string>()
  const uses: Use[] = []
  const dynamicSites: Array<{ path: string; line: number; syntax: 't' | 'T'; expression: string }> = []
  const unresolvedLocalImports: Array<{ path: string; specifier: string }> = []
  const localNamespaceAdapters: Array<{ path: string; prefix: string }> = []
  const translationAliases: Array<{ path: string; names: string[] }> = []
  while (queue.length) {
    const file = queue.pop()!
    if (visited.has(file)) continue
    visited.add(file)
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
    const path = relative(root, file).split(sep).join('/')
    const prefix = localTranslationPrefix(source)
    if (prefix) localNamespaceAdapters.push({ path, prefix })
    const functionNames = translationFunctionNames(source)
    if (functionNames.size > 1) translationAliases.push({ path, names: [...functionNames].filter(name => name !== 't') })
    const addUse = (node: ts.Node, argument: ts.Node | undefined, syntax: 't' | 'T') => {
      const keys = literalAlternatives(argument)
      const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1
      if (keys !== null) for (const key of keys) uses.push({ key: (syntax === 't' ? prefix : '') + key, path, line, syntax })
      else dynamicSites.push({ path, line, syntax, expression: argument?.getText(source) || '<missing argument>' })
    }
    const addImport = (specifier: ts.Node | undefined) => {
      const name = literal(specifier)
      const dependency = name && localModule(file, name)
      if (dependency) queue.push(dependency)
      else if (name && (name.startsWith('@/') || name.startsWith('.')) && (!extname(name) || sourceExtensions.includes(extname(name)))) unresolvedLocalImports.push({ path, specifier: name })
    }
    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node) && !node.importClause?.isTypeOnly) addImport(node.moduleSpecifier)
      if (ts.isExportDeclaration(node) && !node.isTypeOnly) addImport(node.moduleSpecifier)
      if (ts.isCallExpression(node)) {
        if (node.expression.kind === ts.SyntaxKind.ImportKeyword || ts.isIdentifier(node.expression) && node.expression.text === 'require') addImport(node.arguments[0])
        if (ts.isIdentifier(node.expression) && functionNames.has(node.expression.text) || ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 't') addUse(node, node.arguments[0], 't')
      }
      if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) && node.tagName.getText(source) === 'T') {
        const key = node.attributes.properties.find(attribute => ts.isJsxAttribute(attribute) && attribute.name.getText(source) === 'k') as ts.JsxAttribute | undefined
        if (key) addUse(node, key.initializer && ts.isJsxExpression(key.initializer) ? key.initializer.expression : key.initializer, 'T')
      }
      // Menu/stat/section data often stores literal keys then calls t(item.key).
      // Check those actual key values as well as direct calls. Dictionary property
      // names and authentic article/verse strings are deliberately not candidates.
      if (ts.isStringLiteral(node) && /^[A-Za-z][\w-]*(?:\.[\w-]+)+$/.test(node.text) && keyNamespaces.has(node.text.split('.')[0])) {
        const parent = node.parent
        if (ts.isArrayLiteralExpression(parent) || ts.isPropertyAssignment(parent) && parent.initializer === node ||
          ts.isVariableDeclaration(parent) && parent.initializer === node || ts.isJsxAttribute(parent) && parent.initializer === node ||
          ts.isConditionalExpression(parent) && (parent.whenTrue === node || parent.whenFalse === node)) {
          uses.push({ key: node.text, path, line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, syntax: 'key-value' })
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
  }
  return { entrypoints, visited, uses, dynamicSites, unresolvedLocalImports, localNamespaceAdapters, translationAliases }
}

it('defines every reachable literal interface translation directly in every supported language without Spanish fallback', () => {
  const graph = reachableTranslationUses()
  expect(graph.entrypoints.length, 'The audit must discover real App Router entrypoints').toBeGreaterThan(10)
  expect(graph.visited.size, 'The audit must follow imported interface components').toBeGreaterThan(50)
  expect(graph.uses.some(use => use.syntax === 'T'), 'The JSX translation component must be audited').toBe(true)
  expect(graph.uses.some(use => use.syntax === 't'), 'Language-hook translation calls must be audited').toBe(true)
  expect(graph.unresolvedLocalImports, 'Unresolved application imports must not silently reduce audit coverage').toEqual([])
  const keys = [...new Set(graph.uses.map(use => use.key))].sort()
  const missing = keys.flatMap(key => {
    const missingLanguages = languages.filter(language => !Object.hasOwn(translations[language] || {}, key) || typeof translations[language][key] !== 'string' || !translations[language][key].trim())
    return missingLanguages.length ? [{ key, languages: missingLanguages, uses: graph.uses.filter(use => use.key === key) }] : []
  })
  console.info('REACHABLE_LITERAL_TRANSLATION_COVERAGE', JSON.stringify({
    entrypoints: graph.entrypoints.length, reachableSourceFiles: graph.visited.size, literalUseSites: graph.uses.length,
    uniqueLiteralKeys: keys.length, missingKeys: missing.length, missingKeyLanguagePairs: missing.reduce((sum, item) => sum + item.languages.length, 0),
    missing, dynamicSites: graph.dynamicSites, localNamespaceAdapters: graph.localNamespaceAdapters, translationAliases: graph.translationAliases,
    limitation: 'Literal t()/T keys, literal conditional branches and named key values in reachable UI config are enforced. Generated keys/runtime error expressions require their own resource/data coverage and remain listed; this is not a religious-content translation scan.',
  }))
  expect(missing, 'Missing direct language entries must be fixed; provider Spanish fallback cannot satisfy coverage').toEqual([])
})
