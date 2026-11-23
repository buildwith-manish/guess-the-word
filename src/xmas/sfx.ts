import { staticFile } from 'remotion';
import manifest from '../../public/xmas/sfx/manifest.json';
import { SFX_IDS } from './sfx-ids';

/** Every Christmas quiz sound id (list generated from the manifest by scripts/make_xmas_sfx.py). */
export type SfxId = (typeof SFX_IDS)[number];

export type SfxEntry = {
  id: SfxId;
  /** File name inside public/xmas/sfx/. */
  file: string;
  /** Length in seconds. */
  length: number;
  /** Length in design frames (30 fps, rounded up). */
  frames: number;
  peakDb: number;
  rmsDb: number;
};

/** A sound placed on the timeline. `frame` is an absolute design frame (30 fps). */
export type SfxCue = {
  frame: number;
  sfx: SfxId;
  rate?: number;
  volume?: number;
};

export const sfxManifest = manifest.sfx as unknown as SfxEntry[];

export const sfxIds: readonly SfxId[] = SFX_IDS;

export const sfxEntry = (id: SfxId): SfxEntry => {
  const e = sfxManifest.find((m) => m.id === id);
  if (!e) throw new Error(`Unknown Christmas quiz sfx id: ${id}`);
  return e;
};

/** Length of a sound in seconds. */
export const sfxLength = (id: SfxId): number => sfxEntry(id).length;

/** Length of a sound in design frames (30 fps). */
export const sfxFrames = (id: SfxId): number => sfxEntry(id).frames;

/** Remotion static path for the audio file. */
export const sfxSrc = (id: SfxId): string => staticFile(`xmas/sfx/${sfxEntry(id).file}`);

/** The tick sound for timer segment `n` (1..10). */
export const tickId = (n: number): SfxId => {
  if (!Number.isInteger(n) || n < 1 || n > 10) throw new Error(`tick segment ${n} is outside 1..10`);
  return `tick-${String(n).padStart(2, '0')}` as SfxId;
};

/** Place a sound at an absolute design frame. */
export const cue = (id: SfxId, frame: number, opts: { rate?: number; volume?: number } = {}): SfxCue => ({
  frame,
  sfx: id,
  ...opts,
});
