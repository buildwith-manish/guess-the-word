/**
 * StateEndScreen (task 5b): the closing card of Video 4.
 * Adapted from src/EndScreen.tsx (reveal order, slam-in headline, confetti burst, cue timing); the copy is about the
 * score, not the word quiz. Content, top half: the comment prompt ("Your score out of 50"), the subscribe prompt,
 * and a pointer to the next video from states-settings.json `nextVideo` (hidden while title is empty).
 *
 * CLEAR SPACE FOR YOUTUBE'S END-SCREEN ELEMENTS: the whole bottom half (below y = 360 of the 720 reference, i.e.
 * 50 % of the height) holds nothing but three faint outlines marking where the elements go (YouTube draws the
 * elements itself): two video slots and a subscribe circle between them, see END_SLOTS (1280x720 reference px,
 * px() scales them). The slots end at y = 602; nothing else is drawn below y = 360. The outlines are guides only: delete the `Outlines` layer if you do not want them
 * visible behind the elements. The slots are visible from `SLOTS_AT`; the elements themselves are placed in YouTube
 * Studio (end screens run 5-20 s at the end of the video).
 * NOTE: the segment (state-timing: root endScreen.frames = 340 ticks = 11.3 s, longer only if the outro clip needs
 * it) is shorter than 20 s; the whole segment is the end-screen window.
 *
 * Beats (design ticks from the start of the end-screen segment):
 *   3   eyebrow in
 *   9   headline slams in, boom, confetti
 *   52  subscribe prompt in, jingle
 *   SLOTS_AT  next-video line, slot outlines pop in, ding
 *   SUBSCRIBE_AT  subscribe circle outline pulses, ding-hi
 * Outro voiceover: manifest.outro (via voiceOutro) starts `voiceover.offsetFrames` into the segment; state-timing
 * stretches the segment to offset + clip + tail, so the hold fits the clip. The clip is returned by `endScreenVoice()`.
 *
 * Time: `frame` = design ticks (30 per second) since the segment started. Not rendered or viewed.
 */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Background } from '../../Background';
import { Confetti } from '../../Fx';
import { COLORS, FONTS, K, glass, px } from '../../style';
import { prog, slamIn, revealIn, clamp01 } from '../../anim';
import { elasticOut } from '../../gsap-helpers';
import root from '../../../settings.json';
import settings from '../states-settings.json';
import { LEVELS, TOTAL, voiceOutro } from '../state-timing';
import type { VoClip } from '../state-timing';
import type { StateCue, StateSfx } from './stateRoundCues';

// ------------------------------------------------------------------ copy and layout
/** Copy (not data). */
const COPY = {
  eyebrow: 'COMMENT BELOW',
  headA: 'YOUR SCORE',
  headB: `OUT OF ${TOTAL}`,
  subscribe: 'SUBSCRIBE',
  subscribeSub: 'FOR MORE STATE QUIZZES',
  nextLabel: 'WATCH NEXT',
  slotLabel: 'WATCH NEXT',
};

type R = { x: number; y: number; w: number; h: number };
/**
 * Where YouTube's end-screen elements sit, 1280x720 reference px (multiply with px()). Bottom half only
 * (y >= 360). Two 16:9 video slots left and right, the subscribe circle (a round element) centred between them.
 */
export const END_SLOTS: { videoLeft: R; videoRight: R; subscribe: R } = {
  videoLeft: { x: 130, y: 400, w: 360, h: 202 },
  videoRight: { x: 790, y: 400, w: 360, h: 202 },
  subscribe: { x: 570, y: 431, w: 140, h: 140 },
};

// ------------------------------------------------------------------ timing
export const EB = {
  eyebrowAt: 3,
  headAt: 9,
  subscribeAt: 52,
  /** next-video line and the slot outlines */
  slotsAt: 96,
  /** the subscribe circle starts pulsing */
  subscribeSlotAt: 120,
};

/** Outro clip and its start tick (voiceover.offsetFrames into the segment); undefined without a clip. */
export const endScreenVoice = (): (VoClip & { start: number }) | undefined => {
  const clip = voiceOutro();
  return clip ? { ...clip, start: root.voiceover.offsetFrames } : undefined;
};

/** Cues, ticks from the start of the end-screen segment (absolute tick = seg.from + cue.frame). Voice: endScreenVoice(). */
export const stateEndScreenCues = (): StateCue[] => {
  const cues: StateCue[] = [];
  const add = (frame: number, sfx: StateSfx, extra: Partial<StateCue> = {}) => cues.push({ frame: Math.round(frame), sfx, ...extra });
  add(EB.headAt, 'boom');
  add(EB.subscribeAt, 'jingle-cta');
  add(EB.slotsAt, 'ding');
  add(EB.subscribeSlotAt, 'ding-hi');
  return cues;
};

// ------------------------------------------------------------------ parts
const slotBox = (r: R): React.CSSProperties => ({ position: 'absolute', left: px(r.x), top: px(r.y), width: px(r.w), height: px(r.h), boxSizing: 'border-box' });

/** Faint outlines where YouTube's elements go: two video slots and the subscribe circle. Guides only. */
const Outlines: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < EB.slotsAt) return null;
  const pop = prog(frame, EB.slotsAt, 22, elasticOut);
  const pulse = 0.5 + 0.5 * Math.sin((frame - EB.subscribeSlotAt) / 12);
  const subOn = prog(frame, EB.subscribeSlotAt, 16, elasticOut);
  const line = `${px(3)}px dashed rgba(255,255,255,0.35)`;
  const common = (r: R, delay: number): React.CSSProperties => {
    const p = prog(frame, EB.slotsAt + delay, 22, elasticOut);
    return { ...slotBox(r), opacity: clamp01(p * 1.2), transform: `translateY(${(1 - p) * 40 * K}px) scale(${0.8 + 0.2 * p})` };
  };
  return (
    <>
      <div style={{ ...common(END_SLOTS.videoLeft, 0), ...glass(px(20), 0.05), border: line, borderRadius: px(20) }} />
      <div style={{ ...common(END_SLOTS.videoRight, 4), ...glass(px(20), 0.05), border: line, borderRadius: px(20) }} />
      <div
        style={{
          ...slotBox(END_SLOTS.subscribe),
          borderRadius: '50%',
          border: `${px(3)}px dashed ${COLORS.yellow}`,
          opacity: clamp01(subOn * 1.2) * (0.55 + 0.45 * pulse),
          transform: `scale(${0.7 + 0.3 * subOn})`,
          boxShadow: `0 0 ${px(40 * (0.6 + 0.4 * pulse))}px rgba(255,214,10,0.4)`,
        }}
      />
      {/* label above the slots (nothing below them, so the YouTube elements stay clear) */}
      {[END_SLOTS.videoLeft, END_SLOTS.videoRight].map((r, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: px(r.x),
            width: px(r.w),
            top: px(r.y - 34),
            textAlign: 'center',
            fontFamily: FONTS.body,
            fontWeight: 800,
            fontSize: px(18),
            letterSpacing: px(6),
            color: 'rgba(255,255,255,0.7)',
            opacity: clamp01(pop),
          }}
        >
          {COPY.slotLabel}
        </div>
      ))}
    </>
  );
};

// ------------------------------------------------------------------ scene
export const StateEndScreen: React.FC<{ frame: number }> = ({ frame }) => {
  const e1 = revealIn(frame, EB.eyebrowAt, 15, 24);
  const e2 = slamIn(frame, EB.headAt, 16);
  const e3 = revealIn(frame, EB.subscribeAt, 15, 24);
  const e4 = revealIn(frame, EB.slotsAt, 15, 24);
  const theme = LEVELS[LEVELS.length - 1].theme;
  const next = settings.nextVideo;
  const nextLine = next.title ? next.title : '';

  return (
    <AbsoluteFill>
      <Background frame={frame} theme={theme} />
      {/* top half only: copy */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: px(30),
          height: px(330),
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: px(10),
        }}
      >
        <div
          style={{
            fontFamily: FONTS.body,
            fontWeight: 800,
            fontSize: px(22),
            letterSpacing: px(9),
            color: 'rgba(255,255,255,0.8)',
            opacity: e1.opacity,
            transform: e1.transform,
          }}
        >
          {COPY.eyebrow}
        </div>
        <div
          style={{
            fontFamily: FONTS.display,
            fontSize: px(96),
            lineHeight: 1.02,
            letterSpacing: px(3),
            color: '#fff',
            opacity: e2.opacity,
            transform: e2.transform,
            filter: e2.filter,
          }}
        >
          {COPY.headA}
          <br />
          <b style={{ color: COLORS.yellow, fontWeight: 400 }}>{COPY.headB}</b>
        </div>
        <div
          style={{
            marginTop: px(6),
            padding: `${px(10)}px ${px(28)}px`,
            borderRadius: px(40),
            background: COLORS.yellow,
            color: '#2a1d00',
            fontFamily: FONTS.display,
            fontSize: px(26),
            letterSpacing: px(5),
            opacity: e3.opacity,
            transform: e3.transform,
          }}
        >
          {COPY.subscribe}
          <span style={{ fontFamily: FONTS.body, fontWeight: 800, fontSize: px(16), letterSpacing: px(4), marginLeft: px(16) }}>{COPY.subscribeSub}</span>
        </div>
        {nextLine ? (
          <div
            style={{
              fontFamily: FONTS.body,
              fontWeight: 800,
              fontSize: px(22),
              letterSpacing: px(4),
              color: '#fff',
              opacity: e4.opacity,
              transform: e4.transform,
            }}
          >
            <span style={{ color: COLORS.yellow }}>{COPY.nextLabel}: </span>
            {nextLine}
            {next.linkText ? <span style={{ color: 'rgba(255,255,255,0.7)' }}> {'•'} {next.linkText}</span> : null}
          </div>
        ) : null}
      </div>

      {/* bottom half: only the slot outlines, see END_SLOTS */}
      <Outlines frame={frame} />

      {frame >= EB.headAt ? <Confetti frame={frame} start={EB.headAt} seed={2024} count={40} origin={{ x: 640, y: 200 }} /> : null}
    </AbsoluteFill>
  );
};
