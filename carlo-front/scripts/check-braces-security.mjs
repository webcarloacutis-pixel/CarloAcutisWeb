import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const front = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(front, 'package.json'));
const selected = process.argv.find(value => value.startsWith('--package='));
const packagePath = selected ? resolve(front, selected.slice('--package='.length)) : join(front, 'vendor/braces');
const braces = require(packagePath);
let passed = 0;
let failed = 0;

function check(name, work) {
  try {
    work();
    passed++;
    console.log(`PASS ${name}`);
  } catch (error) {
    failed++;
    console.error(`FAIL ${name}: ${error.message}`);
  }
}

const fixtures = [
  ['src/**/*.{js,ts,jsx,tsx}', 'src/**/*.(js|ts|jsx|tsx)', ['src/**/*.js', 'src/**/*.ts', 'src/**/*.jsx', 'src/**/*.tsx']],
  ['./{app,pages,components}/**/*.{js,ts,jsx,tsx,mdx}', './(app|pages|components)/**/*.(js|ts|jsx|tsx|mdx)',
    ['app', 'pages', 'components'].flatMap(dir => ['js', 'ts', 'jsx', 'tsx', 'mdx'].map(ext => `./${dir}/**/*.${ext}`))],
  ['{a,{b,c}}', '(a|(b|c))', ['a', 'b', 'c']],
  ['file-{1..3}.js', 'file-([1-3]).js', ['file-1.js', 'file-2.js', 'file-3.js']],
  ['{a..c}', '([a-c])', ['a', 'b', 'c']],
  ['foo\\{bar,baz\\}', 'foo{bar,baz}', ['foo{bar,baz}']],
  ['[{}]/{a,b}', '[{}]/(a|b)', ['[{}]/a', '[{}]/b']],
  ['"{literal}"/{x,y}', '{literal}/(x|y)', ['{literal}/x', '{literal}/y']],
  ['(foo)/{bar,baz}', '(foo)/(bar|baz)', ['(foo)/bar', '(foo)/baz']],
  ['foo/{bar', 'foo/{bar', ['foo/{bar']],
];

for (const [pattern, compiled, expanded] of fixtures) {
  check(`compile ${pattern}`, () => assert.equal(braces.compile(pattern), compiled));
  check(`expand ${pattern}`, () => assert.deepEqual(braces.expand(pattern), expanded));
}
check('deduplicate expansion', () => assert.deepEqual(braces.expand('{a,a,b}', { nodupes: true }), ['a', 'b']));
check('range limit remains enforced', () => assert.throws(() => braces.expand('{1..1001}'), /range limit/));
check('100 nested braces remain supported', () => assert.doesNotThrow(() => braces.compile('{'.repeat(100) + 'x' + '}'.repeat(100))));
check('escaped/quoted/bracket braces remain literals', () => {
  for (const pattern of ['\\{'.repeat(150), '"' + '{'.repeat(150) + '"', '[' + '{'.repeat(150) + ']']) {
    assert.doesNotThrow(() => braces.compile(pattern));
  }
});

// Each hostile case gets a small stack and a fixed timeout in a separate local
// process. No HTTP, provider, database or application server is involved.
const attackCases = [
  ['deep braces default API', "braces(deep)", 'SyntaxError', 'max depth'],
  ['deep braces parse', "braces.parse(deep)", 'SyntaxError', 'max depth'],
  ['deep braces compile', "braces.compile(deep)", 'SyntaxError', 'max depth'],
  ['deep braces expand', "braces.expand(deep)", 'SyntaxError', 'max depth'],
  ['deep braces stringify', "braces.stringify(deep)", 'SyntaxError', 'max depth'],
  ['deep parentheses', "braces.compile('('.repeat(3000)+'x'+')'.repeat(3000))", 'SyntaxError', 'max depth'],
  ['combined nesting', "braces.parse('{('.repeat(51)+'x'+')}'.repeat(51))", 'SyntaxError', 'max depth'],
  ['depth option cannot raise cap', "braces.compile(deep,{maxDepth:10000})", 'SyntaxError', 'max depth'],
  ['nonfinite depth cannot raise cap', "braces.compile(deep,{maxDepth:Infinity})", 'SyntaxError', 'max depth'],
  ['NaN depth cannot raise cap', "braces.compile(deep,{maxDepth:NaN})", 'SyntaxError', 'max depth'],
  ['depth option can lower cap', "braces.parse('{{x}}',{maxDepth:1})", 'SyntaxError', 'max depth'],
  ['direct compile AST depth', "braces.compile(ast)", 'RangeError', 'max depth'],
  ['direct expand AST depth', "braces.expand(ast)", 'RangeError', 'max depth'],
  ['direct stringify AST depth', "braces.stringify(ast)", 'RangeError', 'max depth'],
  ['internal compile AST depth', "require(path+'/lib/compile')(ast)", 'RangeError', 'max depth'],
  ['internal expand AST depth', "require(path+'/lib/expand')(ast)", 'RangeError', 'max depth'],
  ['internal stringify AST depth', "require(path+'/lib/stringify')(ast)", 'RangeError', 'max depth'],
  ['compile AST child cycle', "braces.compile(cycle)", 'RangeError', 'cycle'],
  ['expand AST child cycle', "braces.expand(cycle)", 'RangeError', 'cycle'],
  ['stringify AST child cycle', "braces.stringify(cycle)", 'RangeError', 'cycle'],
  ['expand AST parent cycle', "braces.expand(parentCycle)", 'RangeError', 'parent chain'],
  ['expand AST excessive parent chain', "braces.expand(parentDepth)", 'RangeError', 'parent chain'],
  ['compile malformed node reference', "braces.compile({type:'root',nodes:[null]})", 'TypeError', 'Invalid braces AST'],
  ['expand malformed children', "braces.expand({type:'root',nodes:{}})", 'TypeError', 'Invalid braces AST'],
  ['stringify malformed children', "braces.stringify({type:'root',nodes:[42]})", 'TypeError', 'Invalid braces AST'],
];
for (const [name, expression, errorName, message] of attackCases) {
  check(name, () => {
    const childCode = `
      const assert=require('node:assert/strict');
      const path=${JSON.stringify(packagePath)};
      const braces=require(path);
      const deep='{'.repeat(3000)+'x'+'}'.repeat(3000);
      assert.ok(deep.length<10000);
      const ast={type:'root',nodes:[]}; let node=ast;
      for(let i=0;i<3000;i++){const child={type:'paren',nodes:[],parent:node};node.nodes=[child];node=child;}
      node.nodes=[{type:'text',value:'x',parent:node}];
      const cycle={type:'root',nodes:[]};cycle.nodes=[cycle];
      const parentCycle={type:'root',nodes:[]};const paren={type:'paren',nodes:[]};paren.parent=paren;parentCycle.nodes=[paren];
      const parentDepth={type:'root',nodes:[]};const first={type:'paren',nodes:[]};parentDepth.nodes=[first];let owner=first;
      for(let i=0;i<3000;i++){const parent={type:'paren',nodes:[]};owner.parent=parent;owner=parent;}
      assert.throws(()=>${expression},error=>error.name===${JSON.stringify(errorName)}&&error.message.includes(${JSON.stringify(message)})&&!error.message.includes('Maximum call stack'));
      process.stdout.write('GUARDED');
    `;
    const result = spawnSync(process.execPath, ['--stack-size=512', '-e', childCode], {
      timeout: 3000,
      maxBuffer: 64 * 1024,
      encoding: 'utf8',
      env: { SystemRoot: process.env.SystemRoot, PATH: process.env.PATH },
    });
    assert.equal(result.error, undefined, result.error?.message);
    assert.equal(result.status, 0, result.stderr.slice(0, 700));
    assert.equal(result.stdout, 'GUARDED');
  });
}
console.log(JSON.stringify({ packagePath, node: process.version, passed, failed }));
if (failed > 0) process.exitCode = 1;
