import {staticFile} from 'remotion';
import {SFX_IDS, SFX_ROWS} from './sfx-ids';

/**
 * NFL quiz sound effects. Ids and lengths come from the generated `sfx-ids.ts`
 * (scripts/make_nfl_sfx.py); the files are in public/nfl/sfx/.
 */
export type SfxId = (typeof SFX_IDS)[number];

export type SfxEntry = {
  id: SfxId;
  file: string;
  /** seconds */
  length: number;
  /** design frames at 30 fps, rounded up */
  frames: number;
};

/** `frame` is a design tick (30 fps), like the manifest's `frames`. `rate` = playbackRate, `volume` = gain 0..1. */
export type SfxCue = {frame: number; sfx: SfxId; rate?: number; volume?: number};

export const sfxIds: readonly SfxId[] = SFX_IDS;
export const sfxManifest: readonly SfxEntry[] = SFX_ROWS;

export const sfxEntry = (id: SfxId): SfxEntry => {
  const e = sfxManifest.find((m) => m.id === id);
  if (!e) throw new Error(`Unknown sfx id: ${id}`);
  return e;
};
export const sfxLength = (id: SfxId): number => sfxEntry(id).length;
export const sfxFrames = (id: SfxId): number => sfxEntry(id).frames;
export const sfxSrc = (id: SfxId): string => staticFile(`nfl/sfx/${sfxEntry(id).file}`);

export const cue = (sfx: SfxId, frame: number, opts: {rate?: number; volume?: number} = {}): SfxCue => ({
  frame,
  sfx,
  ...opts,
});

export type ClueNumber = 1 | 2 | 3 | 4 | 5;
export type PointsLeft = 1 | 2 | 3 | 4 | 5;

/** clue-flip-1..5: the pitch rises with the clue number. */
export const clueFlipId = (clue: ClueNumber): SfxId => `clue-flip-${clue}`;
/** points-drop-5..1: the pitch falls with the points left after the drop. */
export const pointsDropId = (points: PointsLeft): SfxId => `points-drop-${points}`;
