/**
 * Hook.tsx: the 8 s opening of "Don't Say The Same As Me" (task 3b).
 *
 *   0:00-0:03  lock-screen notification over a blurred card (HookLockNotification, 1 s, takes a start frame)
 *   0:03-0:06  level-1 wallpaper fades up, small sealed ink bubble + lock click, hearts spring in,
 *              listening glow wakes on "Let's go"
 *   0:06-0:08  round 1 is live (prompt text visible, countdown running). It plays once, here, and is cut
 *              off by the end of the hook; it is not a full round.
 *
 * Everything the viewer reads or hears that is data comes from data.ts and timing.ts: the prompt and
 * level come from `rounds[0]`, the hook length from `hookSec`, the timer from `timerSecFor`. The only
 * copy owned here is the narration (`hookVoice`) and the notification's app line / time label.
 * Sizes are written in 1280x720 reference units and rendered through px(). No hearts are ever removed.
 */
import React from 'react';
import { Sequence } from 'remotion';
import { rounds, bonuses, type Round } from '../data';
import { FPS, WIDTH, hookSec, secToTicks, ticksToFrames, timerSecFor, useDontSayFrame, clipPath } from '../timing';
import { colours, fontHeadline, levelBackground, springAt } from '../system';
import { clamp01 } from '../shared/fade';
import '../shared/fonts';
import { HeartsPill, HEART_COUNT } from '../components/HeartsPill';
import { ListeningGlow } from '../components/ListeningGlow';
import { CountdownNumber } from '../components/CountdownNumber';
import { InkBubble } from '../components/InkBubble';
import type { SfxId } from '../sfx';

/** 1280x720 reference units -> render pixels (2560x1440). */
const px = (v: number): number => (v * WIDTH) / 1280;
const ease = (x: number): number => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(x));

/* ------------------------------------------------------------------ */
/* Narration. Starts are ESTIMATES: no voice clip is measured yet      */
/* (timings.generated.ts is empty). Replace `startSec` with clip data. */
/* ------------------------------------------------------------------ */
const numberWord = (n: number): string => ({ 3: 'Three', 50: 'Fifty' } as Record<number, string>)[n] ?? String(n);
const questionCount = rounds.length + bonuses.length;

export type HookVoiceLine = { id: string; text: string; startSec: number; tick: number; clip: string };
const line = (i: number, text: string, startSec: number): HookVoiceLine => ({
  id: `hook_${String(i).padStart(2, '0')}`,
  text,
  startSec,
  tick: secToTicks(startSec),
  clip: clipPath(`hook_${String(i).padStart(2, '0')}`),
});

export const hookVoice: HookVoiceLine[] = [
  line(1, 'My answer is locked.', 0.2),
  line(2, 'Say yours before the timer ends.', 1.2),
  line(3, 'Say the same as me and you lose a heart.', 2.4),
  line(4, `${numberWord(HEART_COUNT)} hearts every level.`, 4.2),
  line(5, `${numberWord(questionCount)} rounds.`, 5.1),
  line(6, "Let's go.", 5.6),
];

/* ------------------------------------------------------------------ */
/* Beats (seconds on the hook clock), then ticks.                      */
/* ------------------------------------------------------------------ */
const BEAT_SEC = {
  lockIn: 0,
  lockOut: 2.6, // the notification starts leaving; gone by 3.0
  wallpaperIn: 3.0,
  bubbleIn: 3.0,
  heartsIn: hookVoice[3].startSec, // "Three hearts every level"
  wake: hookVoice[5].startSec, // "Let's go"
  roundLive: hookSec - 2, // 0:06
} as const;

const T = {
  lockIn: secToTicks(BEAT_SEC.lockIn),
  lockOut: secToTicks(BEAT_SEC.lockOut),
  wallpaperIn: secToTicks(BEAT_SEC.wallpaperIn),
  bubbleIn: secToTicks(BEAT_SEC.bubbleIn),
  heartsIn: secToTicks(BEAT_SEC.heartsIn),
  wake: secToTicks(BEAT_SEC.wake),
  roundLive: secToTicks(BEAT_SEC.roundLive),
  end: secToTicks(hookSec),
};

const WALLPAPER_TICKS = secToTicks(0.8);
const LOCK_OUT_TICKS = secToTicks(0.4);

/** Sound cues, local design ticks (30 fps) on the hook clock. The audio layer plays them. */
export type HookCue = { name: string; id: SfxId; tick: number; volume: number };
export const hookCues: HookCue[] = [
  { name: 'banner', id: 'card-in', tick: T.lockIn + 4, volume: 0.7 },
  { name: 'lock', id: 'lock-click', tick: T.bubbleIn, volume: 0.9 },
  { name: 'hearts', id: 'card-in', tick: T.heartsIn, volume: 0.5 },
  { name: 'wake', id: 'listening-start', tick: T.wake, volume: 0.8 },
  { name: 'round', id: 'card-in', tick: T.roundLive, volume: 0.6 },
];

/* ------------------------------------------------------------------ */
/* Lock-screen notification: a reusable 1 s animation.                 */
/* ------------------------------------------------------------------ */
export const HOOK_LOCK_TICKS = 30;
/** Local tick at which the 1 s animation has fully landed, for a given start. */
export const hookLockEnd = (at: number): number => at + HOOK_LOCK_TICKS;

const LOCK_COPY = { app: "DON'T SAY THE SAME", time: 'now' } as const;

const LockGlyph: React.FC<{ colour: string }> = ({ colour }) => (
  <svg width={px(44)} height={px(52)} viewBox="0 0 54 66" style={{ display: 'block' }}>
    <path d="M14 26 V18 a13 13 0 0 1 26 0 V26" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
    <rect x="3" y="24" width="48" height="40" rx="11" fill="#fff" />
    <circle cx="27" cy="41" r="4.5" fill={colour} />
    <rect x="25" y="43" width="4" height="9" rx="2" fill={colour} />
  </svg>
);

export type HookLockNotificationProps = {
  /** Current local design tick (30 fps). */
  frame: number;
  /** Start tick of the 1 s animation. */
  at: number;
  /** Optional tick at which the notification starts to leave (fades over LOCK_OUT_TICKS). */
  outAt?: number;
  title: string;
  body: string;
  accent: string;
};

export const HookLockNotification: React.FC<HookLockNotificationProps> = ({ frame, at, outAt, title, body, accent }) => {
  const t = frame - at;
  if (t < 0) return null;
  const cardIn = clamp01(t / 6);
  const banner = springAt(frame, at + 4, 'snappy');
  const out = outAt === undefined ? 1 : 1 - clamp01((frame - outAt) / LOCK_OUT_TICKS);
  if (out <= 0) return null;
  const W = 960; // centre 80% of 1280 is 1024; stay inside it
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: out }}>
      {/* the blurred card behind the banner */}
      <div style={{
        position: 'absolute', left: '50%', top: px(250), width: px(W), height: px(230), marginLeft: -px(W) / 2,
        borderRadius: px(36), background: colours.glassStrong, border: `${px(0.75)}px solid ${colours.hairline}`,
        filter: `blur(${px(14)}px) brightness(0.85)`, opacity: cardIn,
      }}>
        <div style={{ position: 'absolute', left: px(48), top: px(56), width: px(520), height: px(34), borderRadius: px(17), background: 'rgba(255,255,255,0.5)' }} />
        <div style={{ position: 'absolute', left: px(48), top: px(120), width: px(360), height: px(34), borderRadius: px(17), background: 'rgba(255,255,255,0.32)' }} />
      </div>
      {/* the banner */}
      <div style={{
        position: 'absolute', left: '50%', top: px(96), width: px(W), marginLeft: -px(W) / 2,
        boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: px(22), padding: px(22),
        borderRadius: px(36), background: colours.glassStrong, border: `${px(0.75)}px solid ${colours.hairline}`,
        backdropFilter: `blur(${px(20)}px) saturate(1.8)`, WebkitBackdropFilter: `blur(${px(20)}px) saturate(1.8)`,
        boxShadow: `inset 0 ${px(0.75)}px 0 ${colours.hairlineBright}, 0 ${px(14)}px ${px(40)}px ${colours.shadow}`,
        transform: `translateY(${-px(260) * (1 - Math.min(1, banner))}px)`, opacity: clamp01(banner * 1.5),
      }}>
        <div style={{ width: px(76), height: px(76), flex: 'none', borderRadius: px(20), background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LockGlyph colour={accent} />
        </div>
        <div style={{ flex: 1, minWidth: 0, fontFamily: fontHeadline }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: px(18), fontWeight: 600, letterSpacing: px(1.5), color: colours.muted }}>
            <span>{LOCK_COPY.app}</span>
            <span>{LOCK_COPY.time}</span>
          </div>
          <div style={{ fontSize: px(40), fontWeight: 700, color: colours.ink, marginTop: px(4), lineHeight: 1.15 }}>{title}</div>
          <div style={{ fontSize: px(28), fontWeight: 500, color: colours.muted, marginTop: px(2), lineHeight: 1.2 }}>{body}</div>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Round-1 card (prompt as text, centre 80% of the frame).             */
/* ------------------------------------------------------------------ */
const CARD = { left: 200, top: 140, width: 880, height: 240, radius: 44 } as const;

const PromptCard: React.FC<{ frame: number; at: number; round: Round }> = ({ frame, at, round }) => {
  const p = Math.min(1, springAt(frame, at, 'snappy'));
  return (
    <div style={{
      position: 'absolute', left: px(CARD.left), top: px(CARD.top), width: px(CARD.width), height: px(CARD.height),
      boxSizing: 'border-box', borderRadius: px(CARD.radius), display: 'flex', alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: `0 ${px(40)}px`,
      background: 'linear-gradient(160deg, rgba(255,255,255,0.16), rgba(255,255,255,0.04))',
      border: `${px(0.75)}px solid ${colours.hairline}`,
      backdropFilter: `blur(${px(20)}px) saturate(1.8)`, WebkitBackdropFilter: `blur(${px(20)}px) saturate(1.8)`,
      boxShadow: `inset 0 ${px(0.75)}px 0 ${colours.hairlineBright}, 0 ${px(14)}px ${px(40)}px ${colours.shadow}`,
      opacity: clamp01(p * 1.4), transform: `translateY(${px(30) * (1 - p)}px) scale(${0.96 + 0.04 * p})`,
    }}>
      <span style={{ fontFamily: fontHeadline, fontSize: px(80), fontWeight: 800, color: colours.ink, lineHeight: 1.1, letterSpacing: px(-1) }}>
        {round.prompt}
      </span>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* The scene                                                           */
/* ------------------------------------------------------------------ */
export const Hook: React.FC<{ round?: Round }> = ({ round = rounds[0] }) => {
  const f = useDontSayFrame();
  const accent = colours.level[round.level];
  const wallpaper = ease((f - T.wallpaperIn) / WALLPAPER_TICKS);
  const timerStart = T.roundLive;

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#050A14' }}>
      {/* wallpaper follows the LEVEL, never the hearts */}
      <div style={{ position: 'absolute', inset: 0, background: levelBackground[round.level], opacity: wallpaper }} />

      <HookLockNotification
        frame={f} at={T.lockIn} outAt={T.lockOut}
        title={hookVoice[0].text} body={hookVoice[1].text} accent={accent}
      />

      {/* sealed ink bubble: small, corner, from the lock click. State is forced small: the hook never reveals. */}
      <Sequence from={ticksToFrames(T.bubbleIn)}>
        <InkBubble answer={round.answer} state="small" seed={round.n} accent={accent} sfx={false} />
      </Sequence>

      {f >= T.heartsIn - 1 && <HeartsPill at={T.heartsIn} frame={f} />}

      {f >= T.wake && (
        <>
          <ListeningGlow round={round.n} wakeAt={T.wake} dimAt={T.end} offAt={T.end + FPS} frame={f} card={CARD} />
          <PromptCard frame={f} at={T.wake} round={round} />
        </>
      )}

      {f >= T.roundLive && <CountdownNumber level={round.level} at={timerStart} durationSec={timerSecFor(round.level)} top={520} frame={f} />}
    </div>
  );
};
