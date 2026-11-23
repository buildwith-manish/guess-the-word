// Bundles scripts/nfl_contrast.ts with esbuild (the font loader is stubbed: it fetches over HTTP) and runs it.
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
const out = 'node_modules/.cache/nfl_contrast.mjs';
await build({
  entryPoints: ['scripts/nfl_contrast.ts'], bundle: true, platform: 'node', format: 'esm', outfile: out, logLevel: 'error',
  loader: { '.json': 'json', '.csv': 'text' },
  plugins: [{ name: 'stub-fonts', setup(b) { b.onResolve({ filter: /ios\/fonts$/ }, () => ({ path: 'fonts-stub', namespace: 'stub' })); b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: '', loader: 'js' })); } }],
});
await import(pathToFileURL(process.cwd() + '/' + out).href);
