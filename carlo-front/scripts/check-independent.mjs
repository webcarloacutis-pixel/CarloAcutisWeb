import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Run through npm so its own CLI can be invoked without platform-specific shells.
const npmCli = process.env.npm_execpath;
if (!npmCli || !existsSync(npmCli)) throw new Error('Run npm run check:independent from carlo-front');
const source = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  cwd: dirname(fileURLToPath(import.meta.url)), encoding: 'utf8',
}).trim();
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: source, encoding: 'utf8' }).split('\0').filter(Boolean);
const temporary = mkdtempSync(join(tmpdir(), 'acutis-front-independent-'));
const checkout = join(temporary, 'source');
for (const name of tracked) {
  const destination = resolve(checkout, name);
  const local = relative(checkout, destination);
  if (isAbsolute(local) || local === '..' || local.startsWith('..' + sep)) throw new Error('Invalid tracked path');
  if (!lstatSync(join(source, name)).isFile()) throw new Error('Tracked symlinks are not accepted');
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(join(source, name), destination);
}
const front = join(checkout, 'carlo-front');
const backendModules = join(checkout, 'carlo-back', 'node_modules');
if (existsSync(backendModules) || existsSync(join(front, 'node_modules'))) throw new Error('Dependencies must start absent');
const env = { ...process.env, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1', NODE_USE_SYSTEM_CA: '1',
  BACKEND_URL: 'http://127.0.0.1:9', NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3162', CATALOG_STORAGE_PROVIDER: 'supabase',
  npm_config_cache: join(temporary, 'npm-cache'), npm_config_userconfig: join(temporary, 'npm-user-config'),
  npm_config_globalconfig: join(temporary, 'npm-global-config'),
};
for (const key of ['NODE_PATH', 'NODE_OPTIONS', 'DATABASE_URL', 'DIRECT_URL', 'OPENAI_API_KEY', 'JWT_SECRET', 'ADMIN_KEY', 'SUPABASE_ACCESS_TOKEN', 'SUPABASE_SECRET_KEY']) delete env[key];
writeFileSync(env.npm_config_userconfig, '');
writeFileSync(env.npm_config_globalconfig, '');
const results = [];
function run(args, overrides = {}) {
  console.log('Independent frontend:', args.join(' '));
  execFileSync(process.execPath, [npmCli, ...args], { cwd: front, env: { ...env, ...overrides }, stdio: 'inherit' });
  results.push({ command: ['npm', ...args], passed: true });
}
console.log('Isolated checkout (preserved for inspection):', checkout);
run(['ci', '--include=dev']);
run(['run', 'typecheck']);

// Inspect TypeScript's actual dependency graph, including imports from tests.
// This rejects future cross-imports even if a machine happens to provide Express.
const frontendRequire = createRequire(join(front, 'package.json'));
const ts = frontendRequire('typescript');
const configPath = join(front, 'tsconfig.json');
const config = ts.readConfigFile(configPath, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, front);
const program = ts.createProgram(parsed.fileNames, parsed.options);
const backend = resolve(checkout, 'carlo-back') + sep;
if (program.getSourceFiles().some(file => resolve(file.fileName).startsWith(backend))) {
  throw new Error('Frontend typecheck must not import backend source files');
}
run(['run', 'lint']);
run(['test'], { NODE_ENV: 'test' });
run(['run', 'build']);
if (existsSync(backendModules)) throw new Error('Backend dependencies unexpectedly installed');
const report = { node: process.version, results, backendDependenciesInstalled: false, frontendImportsBackend: false, freshNpmCache: true };
writeFileSync(join(temporary, 'result.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
