/**
 * BonusVoiceOnly (task 4f): bonus 5, "VoiceOver" idea. Voice only: no sealed bubble.
 *
 * - The category text is on screen at tick 0, then fades out as the voice starts; only the
 *   mic glow + waveform stay, with a small "Listen" label.
 * - A tiny drawn mic in the top-right corner pulses to the voice.
 * - About 1 s after the voice line ends a faint caption of the category fades in (muted viewers).
 * - At the reveal the answer fades in as text.
 *
 * Text comes from data.ts (prompt, voiceIntro, voiceReveal, answer); timing from timing.ts and
 * BonusWrapper's phase ticks. Sizes are 1280x720 reference units through px(). No hearts.
 */
import React from 'react';
import { AbsoluteFill, Audio, Sequence } from 'remotion';
import { bonuses, type Bonus } from '../data';
import { BonusWrapper, px, useBonus } from '../components/BonusWrapper';
import { sfxSrc, type SfxId } from '../sfx';
import { clamp01 } from '../shared/fade';
import { colours, fontHeadline, springAt } from '../system';
import { FPS, TIME_SCALE, bonusClipId, clipSec, bonusTicksFor } from '../timing';

const BONUS_N = 5;
const bonus5 = (): Bonus => bonuses.find((b) => b.n === BONUS_N) as Bonus;
/** Phase boundaries of this bonus; intro and reveal stretch to their voice clips. */
const bonusTicks = bonusTicksFor(BONUS_N);

/** UI copy owned by this scene (not in data.ts). */
const LISTEN_LABEL = 'Listen';

/** Layout in 1280x720 reference units, relative to the wrapper's mechanic slot (x 128..1152, y 262..648). */
const L = {
  slotW: 1024,
  slotH: 386,
  glowW: 620,
  glowH: 200,
  barW: 16,
  barGap: 14,
  barMaxH: 120,
  barMinH: 14,
  listenTop: 262,
  captionBottom: 4,
  micRight: 1152, // absolute
  micTop: 76, // absolute
  micSize: 36,
} as const;

const BARS = 9;
const VOICE_START = 6; // tick the intro voice starts
const FALLBACK_WORDS_PER_SEC = 2.6; // used only until a measured clip exists
const CAPTION_LAG_SEC = 1; // decision 15: about 1 s after the voice line ends
const TEXT_FADE = 14; // ticks for the category text to fade out
const CAPTION_FADE = 20;
const CAPTION_MAX = 0.5; // faint at phone size
const REVEAL_VOICE_SEC = 0.9; // "Violin." is short; measured clip replaces this
const ANSWER_LAG = 12; // ticks after the reveal phase starts

const words = (s: string): number => s.split(/\s+/).filter(Boolean).length;

/** Category text for the screen: the prompt without its "(spoken)" suffix. */
export const voiceOnlyCategory = (b: Bonus = bonus5()): string => b.prompt.replace(/\s*\([^)]*\)\s*$/, '').trim();

const answerOf = (b: Bonus): string => (Array.isArray(b.answer) ? b.answer[0] : b.answer);

/** Voice windows in design ticks (30 fps), local to the bonus start. */
export const voiceOnlyTicks = () => {
  const b = bonus5();
  const introSec = clipSec(bonusClipId(b.n, 'intro')) ?? words(b.voiceIntro) / FALLBACK_WORDS_PER_SEC;
  const revealSec = clipSec(bonusClipId(b.n, 'reveal')) ?? REVEAL_VOICE_SEC;
  const introEnd = VOICE_START + Math.round(introSec * FPS);
  const revealStart = bonusTicks.play;
  return {
    introStart: VOICE_START,
    introEnd,
    captionAt: introEnd + Math.round(CAPTION_LAG_SEC * FPS),
    revealStart,
    revealEnd: revealStart + Math.round(revealSec * FPS),
    answerAt: revealStart + ANSWER_LAG,
  } as const;
};

/** Audio cues in design ticks (local). */
export const bonusVoiceOnlyCues = (): { id: SfxId; at: number; volume: number }[] => {
  const t = voiceOnlyTicks();
  return [
    { id: 'listening-start', at: t.introStart - 2, volume: 0.6 },
    { id: 'chip-land', at: t.answerAt, volume: 0.6 },
  ];
};

/** Voice text and start ticks. Clip hooks replace the estimated length once clips exist. */
export const bonusVoiceOnlyVoice = () => {
  const b = bonus5();
  const t = voiceOnlyTicks();
  return { intro: b.voiceIntro, introAt: t.introStart, reveal: b.voiceReveal, revealAt: t.revealStart };
};

/** Deterministic 0..1 hash (no Math.random). */
const hash = (n: number): number => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Voice level 0..1 at a tick: speech windows are lively, silence is a slow breath. */
const level = (tick: number): number => {
  const t = voiceOnlyTicks();
  const speaking =
    (tick >= t.introStart && tick < t.introEnd) || (tick >= t.revealStart && tick < t.revealEnd);
  if (!speaking) return 0.06 + 0.04 * Math.sin(tick * 0.12);
  // syllable-like envelope: fast wobble times a slower phrase swell
  const syl = Math.abs(Math.sin(tick * 0.85)) * (0.55 + 0.45 * Math.abs(Math.sin(tick * 0.31 + 1)));
  return clamp01(0.25 + 0.75 * syl);
};

/** Our own drawn mic (no system symbols). */
const Mic: React.FC<{ size: number; colour: string }> = ({ size, colour }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="8.5" y="2.5" width="7" height="12" rx="3.5" fill={colour} />
    <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" stroke={colour} strokeWidth="2" strokeLinecap="round" />
    <path d="M12 18v3.5" stroke={colour} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/** Colours for the glow blobs (drawn, not system assets). */
const GLOW = ['#0A84FF', '#BF5AF2', '#FF375F', '#FF9F0A'] as const;

const Stage: React.FC = () => {
  const { bonus, tick } = useBonus();
  const t = voiceOnlyTicks();
  const category = voiceOnlyCategory(bonus);

  const amp = level(tick);

  // Category text: visible from tick 0, fades out as the voice starts.
  const textIn = springAt(tick, 0, 'gentle');
  const textOut = 1 - clamp01((tick - t.introStart) / TEXT_FADE);
  const textOpacity = textIn * textOut;

  // Glow + waveform wake as the text leaves; they dim into the reveal.
  const wake = clamp01((tick - t.introStart) / TEXT_FADE);
  const revealP = clamp01((tick - t.revealStart) / 12);
  const stageOpacity = wake * (1 - 0.75 * revealP);
  const barsOpacity = wake * (1 - revealP);

  // Faint caption, ~1 s after the voice line; leaves at the reveal.
  const captionP = clamp01((tick - t.captionAt) / CAPTION_FADE) * (1 - revealP);

  // Answer at the reveal.
  const ans = springAt(tick, t.answerAt, 'pop');

  return (
    <div style={{ position: 'relative', width: px(L.slotW), height: px(L.slotH) }}>
      {/* category text, large, centre */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: textOpacity,
          transform: `scale(${0.96 + 0.04 * textIn})`,
          textAlign: 'center',
          fontFamily: fontHeadline,
          fontWeight: 800,
          fontSize: px(64),
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
          color: colours.ink,
        }}
      >
        {category}
      </div>

      {/* mic glow */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: px(L.glowH / 2 + 24),
          width: px(L.glowW),
          height: px(L.glowH),
          transform: `translate(-50%, -50%) scale(${1 + 0.12 * amp})`,
          opacity: stageOpacity,
          filter: `blur(${px(34)}px)`,
          background: [
            `radial-gradient(closest-side at 22% 55%, ${GLOW[0]}CC, transparent)`,
            `radial-gradient(closest-side at 45% 40%, ${GLOW[1]}CC, transparent)`,
            `radial-gradient(closest-side at 68% 58%, ${GLOW[2]}CC, transparent)`,
            `radial-gradient(closest-side at 85% 45%, ${GLOW[3]}B3, transparent)`,
          ].join(', '),
        }}
      />

      {/* waveform */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: px(24),
          height: px(L.glowH),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: px(L.barGap),
          opacity: barsOpacity,
        }}
      >
        {Array.from({ length: BARS }, (_, i) => {
          const centreBias = 1 - Math.abs(i - (BARS - 1) / 2) / BARS; // taller in the middle
          const wob = 0.55 + 0.45 * Math.abs(Math.sin(tick * (0.5 + hash(i) * 0.5) + hash(i + 9) * 6.28));
          const h = L.barMinH + (L.barMaxH - L.barMinH) * clamp01(amp * wob * (0.45 + 0.55 * centreBias) * 1.25);
          return (
            <div
              key={i}
              style={{
                width: px(L.barW),
                height: px(h),
                borderRadius: px(L.barW),
                background: 'rgba(255,255,255,0.92)',
              }}
            />
          );
        })}
      </div>

      {/* small "Listen" label */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: px(L.listenTop - 40),
          textAlign: 'center',
          opacity: wake * (1 - revealP),
          fontFamily: fontHeadline,
          fontWeight: 700,
          fontSize: px(28),
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: colours.muted,
        }}
      >
        {LISTEN_LABEL}
      </div>

      {/* faint category caption for muted viewers */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: px(L.captionBottom),
          textAlign: 'center',
          opacity: CAPTION_MAX * captionP,
          fontFamily: fontHeadline,
          fontWeight: 600,
          fontSize: px(34),
          letterSpacing: '-0.01em',
          color: colours.ink,
        }}
      >
        {category}
      </div>

      {/* answer at the reveal */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: clamp01(ans),
          transform: `scale(${0.9 + 0.1 * ans})`,
          fontFamily: fontHeadline,
          fontWeight: 800,
          fontSize: px(112),
          letterSpacing: '-0.03em',
          color: colours.ink,
        }}
      >
        {answerOf(bonus)}
      </div>
    </div>
  );
};

/** Corner mic: tiny, pulses to the voice level. Absolute in the frame. */
const CornerMic: React.FC = () => {
  const { tick } = useBonus();
  const amp = level(tick);
  const arrive = springAt(tick, 8, 'gentle');
  const size = px(L.micSize);
  return (
    <div
      style={{
        position: 'absolute',
        left: px(L.micRight) - size,
        top: px(L.micTop),
        width: size,
        height: size,
        opacity: arrive,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: colours.bonusGold,
          opacity: 0.35 * amp,
          transform: `scale(${1 + 1.1 * amp})`,
          filter: `blur(${px(6)}px)`,
        }}
      />
      <div style={{ position: 'relative', transform: `scale(${1 + 0.2 * amp})` }}>
        <Mic size={size} colour={colours.ink} />
      </div>
    </div>
  );
};

/** Mount in a Sequence of length bonusSec. Bonus 5 only. */
export const BonusVoiceOnly: React.FC = () => {
  const bonus = bonus5();
  const cues = bonusVoiceOnlyCues();
  return (
    <AbsoluteFill>
      {/* data.ts onScreenNote for bonus 5 is a production note, not viewer copy: do not draw it. */}
      <BonusWrapper bonus={{ ...bonus, onScreenNote: undefined }}>
        <Stage />
        <CornerMicSlot />
      </BonusWrapper>
      {cues.map((c, i) => (
        <Sequence key={i} from={Math.max(0, Math.round(c.at * TIME_SCALE))} layout="none">
          <Audio src={sfxSrc(c.id)} volume={c.volume} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

/** The wrapper's slot starts at x 128, y 262: shift the corner mic back to frame coordinates. */
const CornerMicSlot: React.FC = () => (
  <div style={{ position: 'absolute', left: -px(128), top: -px(262), width: px(1280), height: px(720), pointerEvents: 'none' }}>
    <CornerMic />
  </div>
);
