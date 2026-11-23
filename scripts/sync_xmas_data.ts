/**
 * Copies docs/xmas/questions.json to src/xmas/questions.json. docs/ is the source of truth: edit the docs copy, then run this.
 * Run: npx tsx scripts/sync_xmas_data.ts
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const root = resolve(__dirname, '..');
const from = resolve(root, 'docs/xmas/questions.json');
const to = resolve(root, 'src/xmas/questions.json');

if (!existsSync(from)) {
  console.error(`missing ${from}`);
  process.exit(1);
}
mkdirSync(dirname(to), { recursive: true });
copyFileSync(from, to);
console.log('copied docs/xmas/questions.json -> src/xmas/questions.json');
