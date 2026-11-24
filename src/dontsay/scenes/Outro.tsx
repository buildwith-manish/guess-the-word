/**
 * Outro.tsx: the 30 s outro of "Don't Say The Same As Me" (task 4h).
 *
 *   0 s to (outroSec - endScreenSec): three on-screen asks, one at a time, in this order:
 *     1. "Comment your rank, and screenshot your card"
 *     2. "Which round got you? Tell me the number"
 *     3. "Subscribe so you do not miss the next game"   (the only subscribe ask; nothing earlier in the video asks)
 *   last endScreenSec: ask 3 glides to the top; a next-video slot and a subscribe button; the rank card
 *     miniature in the bottom-left corner; a final fade to black over the last outroFadeSec.
 *
 * Durations come from timing.ts (outroSec, endScreenSec, outroFadeSec). Rank names and ranges come from
 * data.ts. The only copy owned here is the three asks (given in the brief) and the end-screen labels
 * (OUTRO_COPY). Sizes are 1280x720 reference units through px(). Asks sit inside the centre 80 %.
 * No hearts are drawn. The wallpaper is level 1 (cool blue), as after the last bonus.
 */
import React from 'react';
import { ranks } from '../data';
import { WIDTH, outroSecFor, endScreenSec, outroFadeSec, secToTicks, secToFrames, segments, useDontSayFrame, voiceCues } from '../timing';
import { colours, fontHeadline, fontNumeric, levelBackground, springAt } from '../system';
import { clamp01 } from '../shared/fade';
import '../shared/fonts';
import type { SfxId } from '../sfx';

const px = (v: number): number => (v * WIDTH) / 1280;
const ease = (x: number): number => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(x));

/* ------------------------------------------------------------------ */
/* Copy                                                                */
/* ------------------------------------------------------------------ */
export const OUTRO_ASKS = [
  'Comment your rank, and screenshot your card',
  'Which round got you? Tell me the number',
  'Subscribe so you do not miss the next game',
] as const;
export const OUTRO_COPY = { subscribe: 'Subscribe', nextSlot: 'Next game' } as const;

/* ------------------------------------------------------------------ */
/* Timing (local design ticks, 30 fps, outro clock)                    */
/* ------------------------------------------------------------------ */
const ASK_COUNT = OUTRO_ASKS.length;
/** The ask phase is everything before the end screen; the outro is max(outroSec, its clips + gaps + pad). */
const ASK_PHASE_TICKS = secToTicks(outroSecFor() - endScreenSec);
const IN_LEAD = 4; // ticks after a voice line starts before its ask springs in
const OUT_TICKS = 8; // fade-out before the next ask starts

/** Each ask appears with its voice line: the start ticks come from voiceCues (timing.ts), the only source. */
const outroVoiceTicks = (): number[] => {
  const seg = segments.find((x) => x.kind === 'outro');
  if (!seg) throw new Error('Outro: no outro segment in timing.ts');
  const cues = voiceCues(seg);
  if (cues.length !== ASK_COUNT) throw new Error(`Outro: ${ASK_COUNT} asks but ${cues.length} voice clips`);
  return cues.map((c) => c.tick);
};

export const outroTicks = {
  /** Start of each ask: the tick its voice line starts. */
  askAt: outroVoiceTicks(),
  endScreen: ASK_PHASE_TICKS,
  subscribeIn: ASK_PHASE_TICKS + 6,
  slotIn: ASK_PHASE_TICKS + 10,
  miniIn: ASK_PHASE_TICKS + 14,
  end: secToTicks(outroSecFor()),
  fadeFrom: secToTicks(outroSecFor() - outroFadeSec),
} as const;

export const outroFrames = secToFrames(outroSecFor());

export type OutroCue = { name: string; id: SfxId; tick: number; volume: number };
export const outroCues: OutroCue[] = [
  ...OUTRO_ASKS.map((_, i): OutroCue => ({ name: `ask-${i + 1}`, id: 'card-in', tick: outroTicks.askAt[i] + IN_LEAD, volume: 0.6 })),
  { name: 'end-screen', id: 'end-sting', tick: outroTicks.endScreen, volume: 0.8 },
  { name: 'subscribe', id: 'chip-land', tick: outroTicks.subscribeIn, volume: 0.6 },
];

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */
const glass = (radius: number, alpha = 0.1): React.CSSProperties => ({
  boxSizing: 'border-box',
  borderRadius: px(radius),
  background: `linear-gradient(160deg, rgba(255,255,255,${alpha + 0.06}), rgba(255,255,255,${alpha * 0.4}))`,
  border: `${px(0.5)}px solid ${colours.hairline}`,
  backdropFilter: `blur(${px(40)}px) saturate(1.8)`,
  WebkitBackdropFilter: `blur(${px(40)}px) saturate(1.8)`,
  boxShadow: `inset 0 ${px(1)}px 0 ${colours.hairlineBright}, 0 ${px(14)}px ${px(40)}px ${colours.shadow}, 0 ${px(4)}px ${px(12)}px ${colours.shadowSoft}`,
});

const Bell: React.FC<{ size: number }> = ({ size }) => (
  <svg width={px(size)} height={px(size)} viewBox="0 0 48 48" style={{ display: 'block' }}>
    <path d="M24 6c-7 0-12 5-12 12v8l-4 6h32l-4-6v-8c0-7-5-12-12-12z" fill="#fff" />
    <path d="M19 38a5 5 0 0 0 10 0z" fill="#fff" />
  </svg>
);

const Play: React.FC<{ size: number }> = ({ size }) => (
  <svg width={px(size)} height={px(size)} viewBox="0 0 48 48" style={{ display: 'block' }}>
    <circle cx="24" cy="24" r="22" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" />
    <path d="M19 14l16 10-16 10z" fill="rgba(255,255,255,0.8)" />
  </svg>
);

/** Rank card miniature: five rows, names and ranges from data.ts, level accents as bars. */
const RankMini: React.FC<{ progress: number }> = ({ progress }) => {
  const W = 160;
  const rowH = 18;
  const gap = 4;
  const pad = 8;
  const H = pad * 2 + ranks.length * rowH + (ranks.length - 1) * gap;
  return (
    <div
      style={{
        position: 'absolute',
        left: px(48),
        bottom: px(36),
        width: px(W),
        height: px(H),
        padding: px(pad),
        ...glass(16, 0.12),
        opacity: progress,
        transform: `translateY(${px((1 - progress) * 16)}px) scale(${0.94 + 0.06 * progress})`,
        transformOrigin: 'left bottom',
        display: 'flex',
        flexDirection: 'column',
        gap: px(gap),
      }}
    >
      {ranks.map((r, i) => {
        const accent = colours.level[(Math.min(i, 4) + 1) as 1 | 2 | 3 | 4 | 5];
        return (
          <div
            key={r.name}
            style={{
              height: px(rowH),
              borderRadius: px(6),
              background: `${accent}55`,
              borderLeft: `${px(4)}px solid ${accent}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: `0 ${px(6)}px`,
              color: colours.ink,
              fontFamily: fontHeadline,
              fontWeight: 700,
              fontSize: px(10),
              whiteSpace: 'nowrap',
            }}
          >
            <span>{r.name}</span>
            <span style={{ fontFamily: fontNumeric, fontVariantNumeric: 'tabular-nums' }}>
              {r.min}-{r.max}
            </span>
          </div>
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */
export type OutroProps = { frame?: number };

export const Outro: React.FC<OutroProps> = ({ frame }) => {
  const clock = useDontSayFrame();
  const f = frame ?? clock;
  const T = outroTicks;

  // Ask visibility: each ask springs in, fades before the next slot; the last one stays.
  const askStyle = (i: number): { opacity: number; lift: number; scale: number } => {
    const p = springAt(f, T.askAt[i] + IN_LEAD, 'snappy');
    const last = i === ASK_COUNT - 1;
    const out = last ? 0 : ease((f - (T.askAt[i + 1] - OUT_TICKS)) / OUT_TICKS);
    return { opacity: clamp01(p) * (1 - out), lift: (1 - p) * 20, scale: 0.96 + 0.04 * clamp01(p) };
  };

  // Ask 3 glides from the middle to the top when the end screen starts.
  const glide = ease((f - T.endScreen) / 14);
  const askY = 330 + (150 - 330) * glide; // centre y, ref units
  const askSize = 48 + (40 - 48) * glide;

  const subP = springAt(f, T.subscribeIn, 'pop');
  const slotP = springAt(f, T.slotIn, 'smooth');
  const miniP = springAt(f, T.miniIn, 'snappy');
  const pulse = f > T.subscribeIn + 20 ? 1 + 0.02 * Math.sin(((f - T.subscribeIn) / 30) * Math.PI) : 1;

  const fade = ease((f - T.fadeFrom) / (T.end - T.fadeFrom));

  return (
    <div style={{ position: 'absolute', inset: 0, background: levelBackground[1], overflow: 'hidden', fontFamily: fontHeadline }}>
      {OUTRO_ASKS.map((text, i) => {
        const s = askStyle(i);
        if (s.opacity <= 0.001) return null;
        const last = i === ASK_COUNT - 1;
        const cy = last ? askY : 330;
        const size = last ? askSize : 48;
        return (
          <div
            key={text}
            style={{
              position: 'absolute',
              left: px(160),
              width: px(960),
              top: px(cy) - px(size * 1.4),
              height: px(size * 2.8),
              ...glass(34, 0.12),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: `0 ${px(40)}px`,
              color: colours.ink,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              lineHeight: 1.12,
              fontSize: px(size),
              opacity: s.opacity,
              transform: `translateY(${px(s.lift)}px) scale(${s.scale})`,
            }}
          >
            {text}
          </div>
        );
      })}

      {/* end screen: next-video slot (right) + subscribe button (left) */}
      {f >= T.endScreen && (
        <>
          <div
            style={{
              position: 'absolute',
              left: px(640),
              top: px(290),
              width: px(480),
              height: px(270),
              ...glass(24, 0.06),
              border: `${px(2)}px dashed ${colours.hairlineBright}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: px(14),
              color: colours.muted,
              fontWeight: 600,
              fontSize: px(28),
              opacity: slotP,
              transform: `scale(${0.96 + 0.04 * slotP})`,
            }}
          >
            <Play size={64} />
            <span>{OUTRO_COPY.nextSlot}</span>
          </div>
          <div
            style={{
              position: 'absolute',
              left: px(180),
              top: px(377),
              width: px(360),
              height: px(96),
              borderRadius: px(48),
              background: `linear-gradient(180deg, ${colours.collision}, #D92A20)`,
              boxShadow: `inset 0 ${px(1)}px 0 rgba(255,255,255,0.35), 0 ${px(14)}px ${px(36)}px rgba(255,59,48,0.35)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: px(14),
              color: '#fff',
              fontWeight: 800,
              fontSize: px(36),
              letterSpacing: '-0.01em',
              opacity: clamp01(subP),
              transform: `scale(${(0.9 + 0.1 * subP) * pulse})`,
            }}
          >
            <Bell size={36} />
            <span>{OUTRO_COPY.subscribe}</span>
          </div>
          <RankMini progress={clamp01(miniP)} />
        </>
      )}

      <div style={{ position: 'absolute', inset: 0, background: '#000', opacity: fade, pointerEvents: 'none' }} />
    </div>
  );
};

