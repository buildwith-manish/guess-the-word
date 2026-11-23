import React from 'react';
import { AbsoluteFill } from 'remotion';
import { ranks } from '../data';
import { scoreAudio } from '../audioMap';
import { LightString } from '../components/LightString';
import { cue } from '../sfx';
import type { SfxCue } from '../sfx';
import { rimLightStyle } from '../shared/glass';
import { springAt } from '../shared/springs';
import {
  BOKEH,
  backgroundStyle,
  bokehStyle,
  colors,
  fontStack,
  frameBorderStyle,
  glassSurface,
  lightZoneStyle,
  px,
  rankColor,
  textStyle,
  useXmasFonts,
  useXmasFrame,
  weights,
} from '../system';
import { scoreBeats } from '../timing';
import { UI, rankRange } from '../ui';

/**
 * ScoreScene: the score segment (about 20 s). Local tick 0 = the segment's first tick; place it in a Sequence.
 *   endLine  all 50 bulbs glow (LightString mode "all"); the "all fifty" voice line plays; the rank card slides in with
 *            every tier dim
 *   bands    the tiers light from the lowest to the highest, each with its own voice line; earlier tiers stay lit
 *   hold     the final rank card: all five tiers on ONE card, lit, held at least rankCardMinSec (timing.ts), screenshot-ready
 * Tier names and ranges come from data.ts (ranks); the card title and range format from ui.ts; every time from
 * timing.ts (scoreBeats). No like or subscribe ask here. Frame numbers are design ticks.
 */

/** The one rank card, reference units (1280x720). Inside the safe band (y 72..648, x 128..1152). */
export const CARD = {
  x: 240,
  y: 106,
  w: 800,
  h: 536,
  radius: 44,
  pad: 20,
  /** extra space above the title */
  titleTop: 10,
  titleH: 30,
  titleGap: 18,
  rowH: 78,
  rowGap: 12,
  /** concentric corners: outer radius minus the padding between the card edge and the row (44 - 20) */
  rowRadius: 24,
  rowPadX: 24,
  dot: 22,
  fontSize: 40,
} as const;

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
const pct = (v: number): string => `${(v * 100).toFixed(1)}%`;

export const ScoreScene: React.FC = () => {
  useXmasFonts();
  const t = useXmasFrame();
  const beats = scoreBeats();
  const seconds = t / 30;

  const enter = springAt(t, beats.cardFrom, 'smooth');
  const holdK = clamp01((t - beats.hold.from) / 8);
  const count = ranks.length;

  return (
    <AbsoluteFill style={backgroundStyle()}>
      {BOKEH.map((d, i) => (
        <div key={i} style={bokehStyle(d, seconds)} />
      ))}
      <div style={lightZoneStyle('left', 1)} />
      <div style={lightZoneStyle('right', 1)} />
      <div style={frameBorderStyle()} />

      {/* all 50 bulbs glow; a soft ripple runs along the string while the line is spoken */}
      <LightString litUpTo={50} mode="all" pulseFrame={t} />

      <div
        style={{
          position: 'absolute',
          left: px(CARD.x),
          top: px(CARD.y),
          width: px(CARD.w),
          height: px(CARD.h),
          opacity: clamp01(enter),
          transform: `translateY(${px((1 - enter) * 20)}px) scale(${0.97 + 0.03 * enter})`,
          transformOrigin: '50% 50%',
          padding: px(CARD.pad),
          boxSizing: 'border-box',
          ...glassSurface(CARD.radius, { edge: 1, depth: 1, base: colors.glassBase, rim: 'none' }),
        }}
      >
        {/* the same top-left edge light as the tiles (one light source for all the glass) */}
        <div style={rimLightStyle(CARD.radius, { strength: 1 + 0.35 * holdK })} />
        <div style={{ ...textStyle('label'), marginTop: px(CARD.titleTop), height: px(CARD.titleH), display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: '0.14em' }}>
          {UI.rankCard}
        </div>

        <div style={{ marginTop: px(CARD.titleGap), display: 'flex', flexDirection: 'column', gap: px(CARD.rowGap) }}>
          {ranks.map((r, i) => {
            const b = beats.bands[i].band;
            const tier = rankColor(i, count);
            const lit = springAt(t, b.from, 'pop');
            const k = clamp01(lit);
            // the band that is lighting now glows harder; it has fully settled by the band's last tick, so the first frame
            // of the hold (and of the next band) shows every earlier row at rest
            const current = clamp01((t - b.from) / 6) * (1 - clamp01((t - (b.to - 8)) / 8));
            const glow = k * (0.7 + 1.3 * current);
            return (
              <div
                key={r.name}
                style={{
                  height: px(CARD.rowH),
                  display: 'flex',
                  alignItems: 'center',
                  gap: px(16),
                  padding: `0 ${px(CARD.rowPadX)}px`,
                  borderRadius: px(CARD.rowRadius),
                  boxSizing: 'border-box',
                  // colour lives in the dot; the row only gets a faint tint and a neutral hairline
                  background: `color-mix(in srgb, ${tier} ${pct(k * 0.09)}, rgba(255,255,255,0.05))`,
                  border: `${px(1)}px solid rgba(255,255,255,${(0.1 + 0.04 * k).toFixed(3)})`,
                  // a soft glow only while this tier is the one lighting
                  boxShadow: current > 0.01 ? `0 0 ${px(16 * current)}px color-mix(in srgb, ${tier} ${pct(0.22 * current)}, transparent)` : 'none',
                  transform: `scale(${1 + 0.025 * current * Math.min(1.15, lit)})`,
                  transformOrigin: '50% 50%',
                  opacity: 0.5 + 0.5 * k,
                }}
              >
                <div
                  style={{
                    width: px(CARD.dot),
                    height: px(CARD.dot),
                    borderRadius: '50%',
                    flex: '0 0 auto',
                    background: `color-mix(in srgb, ${tier} ${pct(k)}, ${colors.bulbOff})`,
                    boxShadow: k > 0 ? `0 0 ${px(10 * glow)}px color-mix(in srgb, ${tier} ${pct(current > 0.01 ? 0.9 : 0.35)}, transparent)` : 'none',
                  }}
                />
                <div
                  style={{
                    flex: '1 1 auto',
                    fontFamily: fontStack,
                    fontSize: px(CARD.fontSize),
                    fontWeight: weights.bold,
                    letterSpacing: '-0.01em',
                    color: colors.ink,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {r.name}
                </div>
                <div
                  style={{
                    flex: '0 0 auto',
                    fontFamily: fontStack,
                    fontSize: px(CARD.fontSize),
                    fontWeight: weights.semibold,
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '0.02em',
                    // the range is secondary: dim white, so the tier name leads
                    color: colors.muted,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {rankRange(r.min, r.max)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Sounds of the score segment. `start` is the absolute design frame of the segment's first tick. */
export const scoreCues = (start: number): SfxCue[] => {
  const b = scoreBeats();
  return [
    cue('bulb-on', start),
    ...b.bands.map((x) => cue('bulb-on', start + x.band.from)),
    cue('rank-reveal', start + b.hold.from),
  ].sort((a, c) => a.frame - c.frame);
};

/** Voice lines of the segment as ids from the audio map, with the absolute design frame each starts at. */
export const scoreVoice = (start: number): { id: string; frame: number }[] => {
  const b = scoreBeats();
  return [
    { id: scoreAudio.end, frame: start + b.endVoiceFrom },
    ...b.bands.map((x, i) => ({ id: scoreAudio.rank[i], frame: start + x.voiceFrom })),
  ];
};

export default ScoreScene;
