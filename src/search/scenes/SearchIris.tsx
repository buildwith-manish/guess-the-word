import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { Background } from '../../Background';
import { COLORS, FONTS, glass, px } from '../../style';
import { prog, irisEase } from '../../anim';
import { TIME_SCALE } from '../../timing';
import type { Cue } from '../../sound';
import type { Segment } from '../types';
import { BONUS_THEME, LEVELS } from '../search-timing';
import { SLOTS } from '../components/SearchStage';
import { SearchRound } from './SearchRound';
import '../../fonts';

type IrisSegment = Extract<Segment, { kind: 'iris' }>;
type Variant = NonNullable<IrisSegment['variant']>;

/**
 * The colour wipe between scenes (task 3d). Copy-and-adapt of GTW's Iris: the next theme grows over
 * the old one (circle, sweep or curtain, the variant comes with the segment), with the HUD pill on top.
 *
 * Overlap rule: the next round's first `lead` ticks play INSIDE the wipe. Pass `next` ({ index, lead },
 * lead = the following round segment's `lead`) and the last `lead` ticks of the wipe also draw that
 * round's plan ticks 0..lead, clipped to the part of the screen the wipe has already revealed.
 * The round scene that follows then starts at plan tick `lead` (SearchRound handles that with its
 * `lead` prop). Without `next` (before a bonus, or a level card) the wipe is only the wipe.
 *
 * Sound: searchIrisCues(). Mount this in a Sequence at seg.from: it reads the scene clock itself.
 */

/** Skew of the sweep edge, % of the width (the same value Background uses). */
const SWEEP_SKEW = 12;
/** Circle radius at p = 1, % of the reference radius (the same value Background uses). */
const CIRCLE_MAX = 80;

/** The same clip shapes Background uses for its wipe layer, so the overlap content shows only where the new theme is. */
const wipeClip = (variant: Variant, p: number): string => {
  if (variant === 'sweep') {
    const e = -SWEEP_SKEW + p * (100 + 2 * SWEEP_SKEW);
    return `polygon(0 0, ${e + SWEEP_SKEW}% 0, ${e - SWEEP_SKEW}% 100%, 0 100%)`;
  }
  if (variant === 'curtain') {
    const half = 50 * p;
    return `inset(0 ${50 - half}% 0 ${50 - half}%)`;
  }
  return `circle(${CIRCLE_MAX * p}% at 50% 50%)`;
};

const isBonus = (t: [string, string]) => t.join() === BONUS_THEME.join();

/** Sound cues, design ticks from the start of the wipe: the whoosh. */
export const searchIrisCues = (): Cue[] => [{ frame: 0, sfx: 'whoosh' }];

export const SearchIris: React.FC<{ frame: number; seg: IrisSegment; next?: { index: number; lead: number } }> = ({
  frame,
  seg,
  next,
}) => {
  const p = prog(frame, 0, seg.duration, irisEase);
  // search backdrops are calm; only the bonus backdrop is already at full energy
  const fromEnergy = isBonus(seg.fromTheme) ? undefined : 0;
  const toEnergy = isBonus(seg.toTheme) ? undefined : 0;

  const accent = LEVELS.find((l) => l.name === seg.hud.label)?.accent ?? BONUS_THEME[0];
  const pill = SLOTS.hud;
  const H = px(pill.h);

  const overlapStart = next ? seg.duration - next.lead : Infinity;
  const planTick = frame - overlapStart; // plan tick of the incoming round (0 at the start of the overlap)

  return (
    <AbsoluteFill>
      <Background
        frame={frame}
        theme={seg.fromTheme}
        energy={fromEnergy}
        iris={{ theme: seg.toTheme, p, variant: seg.variant, energy: toEnergy }}
      />

      {/* HUD pill, same look and place as SearchStage's. It shows the OLD round; the incoming round's
          own pill covers it as the wipe reaches it. */}
      {(
        <div
          style={{
            position: 'absolute',
            left: px(pill.x),
            top: px(pill.y),
            height: H,
            padding: `0 ${H * 0.5}px`,
            display: 'flex',
            alignItems: 'center',
            gap: H * 0.3,
            fontFamily: FONTS.display,
            fontSize: H * 0.55,
            letterSpacing: H * 0.05,
            whiteSpace: 'pre',
            ...glass(H / 2),
          }}
        >
          <span style={{ color: accent }}>{seg.hud.label}</span>
          <span style={{ color: COLORS.ink }}>
            {seg.hud.number}/{seg.hud.total}
          </span>
        </div>
      )}

      {next && planTick >= 0 ? (
        <AbsoluteFill style={{ clipPath: wipeClip(seg.variant ?? 'circle', p) }}>
          {/* the child scene reads its own clock, so it gets a Sequence that starts at the overlap */}
          <Sequence from={Math.round(overlapStart * TIME_SCALE)}>
            <SearchRound frame={planTick} index={next.index} lead={0} />
          </Sequence>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
