/**
 * check_no_legacy_imports.ts: guard for the iOS-style video.
 *
 * Fails (exit 1) if any .ts / .tsx file in VIDEO_DIR:
 *   1. has a relative import that resolves outside the allowed places:
 *        - VIDEO_DIR itself
 *        - src/ios
 *        - data files (DATA_EXT) under docs/ or public/
 *      That covers the old shared files in the root of src (anim, gsap-helpers, Hook, ...).
 *   2. uses one of the banned easings in BANNED.
 * Package imports (react, remotion, ...) are not checked.
 *
 * The file is parsed with the TypeScript compiler, so comments and strings are not flagged.
 * Run: npm run check:imports
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import ts from 'typescript';

const VIDEO_DIR = 'src/dontsay';
const ALLOWED_CODE_DIRS = [VIDEO_DIR, 'src/ios'];
const DATA_DIRS = ['docs', 'public'];
const DATA_EXT = new Set(['.json', '.csv', '.tsv', '.txt', '.yaml', '.yml']);
const BANNED = new Set(['backOut', 'elasticOut', 'bounceEase', 'slamIn']);

const ROOT = path.resolve(__dirname, '..');

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return walk(full);
    return /\.tsx?$/.test(e.name) ? [full] : [];
  });

const inside = (target: string, dir: string): boolean => target === dir || target.startsWith(`${dir}/`);

/** The module specifier of a node that imports something, if it is one. */
const specifierOf = (node: ts.Node): ts.Expression | undefined => {
  if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return node.moduleSpecifier;
  if (ts.isExternalModuleReference(node)) return node.expression;
  if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) return node.argument.literal as ts.Expression;
  if (ts.isCallExpression(node)) {
    const callee = node.expression;
    if (callee.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(callee) && callee.text === 'require')) {
      return node.arguments[0];
    }
  }
  return undefined;
};

const importAllowed = (file: string, spec: string): boolean => {
  if (!spec.startsWith('.') && !spec.startsWith('/')) return true; // a package
  const target = path.relative(ROOT, path.resolve(path.dirname(file), spec)).split(path.sep).join('/');
  if (ALLOWED_CODE_DIRS.some((d) => inside(target, d))) return true;
  return DATA_DIRS.some((d) => inside(target, d)) && DATA_EXT.has(path.extname(target).toLowerCase());
};

const videoRoot = path.join(ROOT, VIDEO_DIR);
if (!fs.existsSync(videoRoot)) {
  console.error(`check:imports: ${VIDEO_DIR} does not exist`);
  process.exit(1);
}

const files = walk(videoRoot).sort();
const findings: string[] = [];

for (const file of files) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const report = (node: ts.Node, message: string): void => {
    const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
    findings.push(`${path.relative(ROOT, file)}:${line}  ${message}`);
  };
  const visit = (node: ts.Node): void => {
    const spec = specifierOf(node);
    if (spec && ts.isStringLiteralLike(spec) && !importAllowed(file, spec.text)) {
      report(node, `import not allowed: '${spec.text}'`);
    }
    if (ts.isIdentifier(node) && BANNED.has(node.text)) report(node, `banned easing: ${node.text}`);
    // Easing['elasticOut'] style access
    if (ts.isElementAccessExpression(node) && ts.isStringLiteralLike(node.argumentExpression) && BANNED.has(node.argumentExpression.text)) {
      report(node, `banned easing: ${node.argumentExpression.text}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}

if (findings.length) {
  console.error(`check:imports FAILED: ${findings.length} finding(s) in ${VIDEO_DIR} (${files.length} files)`);
  for (const f of findings) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`check:imports OK: ${files.length} files in ${VIDEO_DIR}, no legacy imports or banned easings`);
