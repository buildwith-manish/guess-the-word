import { staticFile } from 'remotion';
import manifest from '../../public/gta6/sfx/manifest.json';
import { SFX_IDS } from './sfx-ids';

/** Every GTA 6 sound id (list generated from the manifest by scripts/make_gta6_sfx.py). */
export type SfxId = (typeof SFX_IDS)[number];

export type SfxEntry = {
  id: SfxId;
  /** File name inside public/gta6/sfx/. */
  file: string;
  /** Length in seconds. */
  length: number;
  /** Length in design frames (30 fps, rounded up). */
  frames: number;
};

/** A sound placed on the timeline. `frame` is an absolute design frame (30 fps), like `Cue` in the other videos. */
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
  if (!e) throw new Error(`Unknown GTA 6 sfx id: ${id}`);
  return e;
};

/** Length of a sound in seconds. */
export const sfxLength = (id: SfxId): number => sfxEntry(id).length;

/** Length of a sound in design frames. */
export const sfxFrames = (id: SfxId): number => sfxEntry(id).frames;

/** Remotion static path for the audio file. */
export const sfxSrc = (id: SfxId): string => staticFile(`gta6/sfx/${sfxEntry(id).file}`);

/** Place a sound at an absolute design frame. */
export const cue = (id: SfxId, frame: number, opts: { rate?: number; volume?: number } = {}): SfxCue => ({
  frame,
  sfx: id,
  ...opts,
});
