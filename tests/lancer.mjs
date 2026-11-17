// Lance les tests : compile les fichiers TypeScript avec esbuild (déjà installé avec Vite), puis node --test.
// Usage : TEST_DATABASE_URL=postgres://postgres:test@localhost:5432/postgres node tests/lancer.mjs
import { build } from 'esbuild';
import { readdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const out = 'tests/.compile';
rmSync(out, { recursive: true, force: true });
const entries = readdirSync('tests').filter((f) => f.endsWith('.test.ts')).map((f) => `tests/${f}`);
await build({ entryPoints: entries, bundle: true, platform: 'node', format: 'esm', target: 'node20', outdir: out, packages: 'external', outExtension: { '.js': '.mjs' }, logLevel: 'error' });
const files = readdirSync(out).map((f) => `${out}/${f}`);
const r = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...files], { stdio: 'inherit' });
process.exit(r.status ?? 1);
