/**
 * iOS look: the wipe is a soft cross-fade between the two calm backdrops (no circle / sweep / curtain / pixel cells);
 * the look names below only decide the sound cues. Original description follows.
 *
 * StateIris (task 3e): the colour wipe between questions, between a question and a bonus, and into a
 * level card. Adapted from src/Iris.tsx (props `frame` + the `iris` segment, same layers: old backdrop,
 * the new theme growing over it, HUD pill, watermark, optional title lockup).
 *
 * Looks (picked from the DESTINATION theme, so the four levels get four looks):
 *   - the first `settings.transitions.byLevel.length` levels use the segment's own `variant`
 *     (circle, sweep, curtain: states-timeline sets it from root settings.json transitions.byLevel),
 *     drawn by the shared Background `iris` prop;
 *   - any level beyond that list (EXPERT) gets a pixel-dissolve: the new backdrop shows through a grid
 *     of square cells that switch on in a seeded random order, centre first. This is drawn here
 *     (Background has no such variant): two Backgrounds, the top one clipped by an SVG clipPath.
 *   - a wipe whose destination is not a level (the bonus backdrop) keeps the segment's variant.
 *
 * Overlap rule (unchanged from the word quiz): the NEXT question's first `lead` ticks play inside this
 * wipe. This scene does not draw them: the caller (Main) mounts the round on top with
 * `frame = local - (duration - lead)` once that is >= 0. `stateIrisOverlap` gives both numbers, and the
 * question's own cues are counted from `seg.from - lead` (see stateRoundCues).
 *
 * Time: `frame` = design ticks (30 per second) since the wipe segment started.
 * Not rendered or viewed: written against the component props only.
 */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Watermark } from '../../Watermark';
import { S, px } from '../../style';
import { IOS, IosBackground, iosSurface } from '../../ios';
import { prog } from '../../anim';
import { iosOut } from '../motion';
import rootSettings from '../../../settings.json';
import { BONUS_THEME, HEIGHT, LEVELS, QUESTIONS, WIDTH } from '../state-timing';
import type { Hud, IrisVariant, Segment } from '../types';
import { StateTitleLockup } from '../components/StateTitleLockup';
import { STAGE_LAYOUT } from '../components/StateStage';
import type { StateCue } from './stateRoundCues';

export type IrisSegment = Extract<Segment, { kind: 'iris' }>;

/** The four wipe looks: the three Background variants plus the pixel-dissolve drawn in this file. */
export type StateIrisLook = IrisVariant | 'pixel';

/** Pixel-dissolve look. `cell` is in 1280x720 reference px (px() scales it); `noise` is how much of a
 *  cell's switch-on time is random (the rest is its distance from the centre). */
const PIXEL_WIPE = { cell: 40, noise: 0.6, seed: 4, blipAt: 0.45 };

/** Same look as the HUD pill of StateStage (those constants are private there). */
const HUD_LOOK = { font: 24, radius: 40, padX: 20, gap: 12 };

const sameTheme = (a: [string, string], b: [string, string]) => a[0] === b[0] && a[1] === b[1];

/** Level index whose wipe theme is `theme`, or -1 (bonus backdrop). */
const levelIndexOfTheme = (theme: [string, string]) => LEVELS.findIndex((l) => sameTheme(l.theme, theme));

/** Which look this wipe has (see the file header). */
export const irisLook = (seg: IrisSegment): StateIrisLook => {
  const to = levelIndexOfTheme(seg.toTheme);
  const standard = (rootSettings.transitions.byLevel as string[]).length;
  if (to >= standard) return 'pixel';
  return seg.variant ?? 'circle';
};

/** Wipe progress 0..1 at `frame` (iosOut over the whole segment). */
export const irisProgress = (frame: number, seg: IrisSegment) => prog(frame, 0, seg.duration, iosOut);

/**
 * The overlap with the next question: `lead` ticks of it play inside this wipe; it starts being drawn
 * at wipe tick `startsAt = duration - lead`, with round frame = frame - startsAt (matches Main's `rf`).
 */
export const stateIrisOverlap = (seg: IrisSegment, next?: Segment): { lead: number; startsAt: number } => {
  const lead = next && next.kind === 'question' ? (next.lead ?? 0) : 0;
  return { lead, startsAt: seg.duration - lead };
};

/** Cues of one wipe, ticks from the start of the wipe segment (absolute tick = seg.from + cue.frame). */
export const stateIrisCues = (seg: IrisSegment): StateCue[] => {
  const cues: StateCue[] = [{ frame: 0, sfx: 'whoosh' }];
  if (irisLook(seg) === 'pixel') cues.push({ frame: Math.round(seg.duration * PIXEL_WIPE.blipAt), sfx: 'blip' });
  return cues;
};

/** The small level + number pill (top left). `hud.label` 'BONUS' shows the bonus colour and slot. */
export const StateHudPill: React.FC<{ hud: Hud }> = ({ hud }) => {
  const isBonus = hud.label === 'BONUS';
  const q = isBonus ? undefined : QUESTIONS[hud.number - 1];
  const cfg = q ? LEVELS.find((l) => l.name === q.level) : undefined;
  const name = cfg?.name ?? hud.label;
  return (
    <div
      style={{
        ...iosSurface(px(HUD_LOOK.radius), 0.6),
        position: 'absolute',
        left: S.hudLeft,
        top: S.hudTop,
        padding: `${px(8)}px ${px(HUD_LOOK.padX)}px`,
        display: 'flex',
        alignItems: 'baseline',
        gap: px(HUD_LOOK.gap),
        fontFamily: IOS.font,
        fontWeight: IOS.weight.semibold,
        fontSize: px(HUD_LOOK.font),
        whiteSpace: 'pre',
      }}
    >
      <span style={{ color: IOS.color.secondary }}>{name}</span>
      <span style={{ color: IOS.color.label }}>{`${hud.number} / ${hud.total}`}</span>
    </div>
  );
};

/** The static title lockup in the stage's title slot (still on screen through the wipe / pop-up). */
export const StateTitleSlot: React.FC<{ frame: number }> = ({ frame }) => {
  const t = STAGE_LAYOUT.title;
  return (
    <div style={{ position: 'absolute', left: t.x, top: t.y, width: t.w, height: t.h, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <StateTitleLockup frame={frame} animate={false} />
    </div>
  );
};

/** Accent of a wipe's backdrop: the level's colour, or the bonus colour. */
const accentOfTheme = (theme: [string, string]): string => LEVELS.find((l) => sameTheme(l.theme, theme))?.accent ?? BONUS_THEME[0];

export const StateIris: React.FC<{ frame: number; seg: IrisSegment }> = ({ frame, seg }) => {
  const p = irisProgress(frame, seg);
  return (
    <AbsoluteFill>
      <IosBackground accent={accentOfTheme(seg.fromTheme)} />
      <div style={{ position: 'absolute', inset: 0, opacity: p }}>
        <IosBackground accent={accentOfTheme(seg.toTheme)} />
      </div>
      {seg.title ? <StateTitleSlot frame={frame} /> : null}
      <StateHudPill hud={seg.hud} />
      {seg.watermark ? <Watermark /> : null}
    </AbsoluteFill>
  );
};
