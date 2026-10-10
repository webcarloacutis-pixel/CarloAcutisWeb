import { readFileSync, realpathSync, existsSync, mkdirSync, writeFileSync, renameSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

// Backport the reviewed sources without disguising the upstream name/version.
// Refuse unknown package bytes; npm audit's unresolved upstream alert stays visible.
const front = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const modules = realpathSync(resolve(front, 'node_modules'))
const vendor = resolve(front, 'vendor/braces')
const provenance = JSON.parse(readFileSync(resolve(vendor, 'PROVENANCE.json'), 'utf8'))
const lock = JSON.parse(readFileSync(resolve(front, 'package-lock.json'), 'utf8'))
const checkOnly = process.argv.includes('--check')
const hash = value => createHash('sha256').update(value).digest('hex')
const canonical = value => value.toString('utf8').replaceAll('\r\n', '\n')
const files = ['package.json', 'index.js', 'lib/parse.js', 'lib/compile.js', 'lib/expand.js', 'lib/stringify.js', 'lib/constants.js', 'lib/utils.js', 'lib/depth.js']
const entries = Object.keys(lock.packages || {}).filter(key => /(?:^|\/)node_modules\/braces$/.test(key))
if (!entries.length) throw new Error('BRACES_LOCKFILE_ENTRY_REQUIRED')
const patches = []
for (const file of files) {
  const data = canonical(readFileSync(resolve(vendor, file)))
  if (hash(data) !== provenance.patchedFileSha256[file]) throw new Error('BRACES_VENDOR_HASH_MISMATCH: ' + file)
}
// Validate every installed copy before changing any copy.
for (const entry of entries) {
  const folder = realpathSync(resolve(front, entry))
  if (!folder.startsWith(modules + sep)) throw new Error('BRACES_INSTALLED_PATH_OUTSIDE_NODE_MODULES')
  const metadata = JSON.parse(readFileSync(resolve(folder, 'package.json'), 'utf8'))
  if (metadata.name !== 'braces' || metadata.version !== '3.0.3') throw new Error('BRACES_UNREVIEWED_VERSION')
  for (const file of files) {
    const target = resolve(folder, file)
    const parent = realpathSync(dirname(target))
    if (parent !== folder && !parent.startsWith(folder + sep)) throw new Error('BRACES_FILE_PARENT_OUTSIDE_PACKAGE')
    if (existsSync(target) && !realpathSync(target).startsWith(folder + sep)) throw new Error('BRACES_FILE_OUTSIDE_PACKAGE')
    const current = existsSync(target) ? hash(canonical(readFileSync(target))) : null
    const patched = provenance.patchedFileSha256[file]
    const original = provenance.sourceFileSha256[file] || null
    if (current === patched) continue
    if (checkOnly) throw new Error('BRACES_MITIGATION_MISSING: ' + entry + '/' + file)
    if (current !== original) throw new Error('BRACES_UNREVIEWED_SOURCE: ' + entry + '/' + file)
    patches.push({ target, data: canonical(readFileSync(resolve(vendor, file))) })
  }
}
for (const { target, data } of patches) {
  mkdirSync(dirname(target), { recursive: true })
  const temporary = target + '.acutis-patch-' + process.pid
  writeFileSync(temporary, data, 'utf8')
  renameSync(temporary, target)
}
console.log(JSON.stringify({ mitigation: 'GHSA-vfj7-8cjw-p6xm', upstreamVersion: '3.0.3', copies: entries, mode: checkOnly ? 'verified' : 'applied', changedFiles: patches.length, upstreamAuditAlertRemainsApplicable: true }))
