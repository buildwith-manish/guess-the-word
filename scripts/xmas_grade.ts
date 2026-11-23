/**
 * xmas_grade.ts: the colour grade of the finished video (XMAS-Full.mp4 -> graded.mp4). Needs ffmpeg on PATH.
 *
 *   npx tsx scripts/xmas_grade.ts                         grade XMAS-Full.mp4 into graded.mp4
 *   npx tsx scripts/xmas_grade.ts in.mp4 out.mp4          other files
 *   SECONDS=20 npx tsx scripts/xmas_grade.ts              test slice: only the first 20 s (START=<s> to move it)
 *   DRY_RUN=1 npx tsx scripts/xmas_grade.ts               print the ffmpeg command, run nothing
 *
 * Grade (the values are the director's): contrast 1.05, saturation 1.08, gamma 0.98, vignette PI/9, then x264 CRF 14,
 * preset slow, yuv420p, tagged BT.709, audio copied untouched. The tags only label the file; they convert nothing,
 * so the render is assumed to be BT.709 already. Windows safe: no shell, arguments are passed as an array.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

export const GRADE = {
  contrast: 1.05,
  saturation: 1.08,
  gamma: 0.98,
  vignette: 'PI/9',
  crf: 14,
  preset: 'slow',
} as const;

/** The -vf chain. */
export const gradeFilter = (): string =>
  `eq=contrast=${GRADE.contrast}:saturation=${GRADE.saturation}:gamma=${GRADE.gamma},vignette=${GRADE.vignette}`;

/** The full ffmpeg argument list. `seconds` (> 0) limits the output to a slice that starts at `start`. */
export const gradeArgs = (input: string, output: string, seconds = 0, start = 0): string[] => [
  '-y',
  ...(seconds > 0 ? ['-ss', String(start), '-t', String(seconds)] : []),
  '-i', input,
  '-vf', gradeFilter(),
  '-c:v', 'libx264', '-crf', String(GRADE.crf), '-preset', GRADE.preset,
  '-pix_fmt', 'yuv420p',
  '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
  '-c:a', 'copy',
  output,
];

const main = () => {
  const input = process.argv[2] ?? 'XMAS-Full.mp4';
  const output = process.argv[3] ?? 'graded.mp4';
  const seconds = Number(process.env.SECONDS ?? 0);
  const start = Number(process.env.START ?? 0);
  if (!(seconds >= 0) || !(start >= 0)) throw new Error('SECONDS and START must be numbers of 0 or more');
  const args = gradeArgs(input, output, seconds, start);
  console.log(['ffmpeg', ...args.map((a) => (/[\s|]/.test(a) ? `"${a}"` : a))].join(' '));
  if (process.env.DRY_RUN) return;
  if (!existsSync(input)) {
    console.error(`input not found: ${input}`);
    process.exit(1);
  }
  const r = spawnSync('ffmpeg', args, { stdio: 'inherit' });
  if (r.error) {
    console.error(`could not run ffmpeg (${r.error.message}); is it on PATH?`);
    process.exit(1);
  }
  process.exit(r.status ?? 1);
};

if (process.argv[1] && /xmas_grade\.[tj]s$/.test(process.argv[1])) main();
