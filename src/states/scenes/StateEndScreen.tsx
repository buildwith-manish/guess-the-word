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
 * iOS look: calm backdrop, Inter, spring entrances, hairline (not dashed/glowing) slot guides, no confetti. Beats, cues,
 * END_SLOTS and the clear bottom half are unchanged.
 *
 * Time: `frame` = design ticks (30 per second) since the segment started. Not rendered or viewed.
 */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { px } from '../../style';
import { IOS, IosBackground, iosSurface } from '../../ios';
import { spr, stagger } from '../motion';
import {RADIUS, COLOR } from '../look';
import { clamp01 } from '../../anim';
import { rise } from '../ios-rise';
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
  const pop = spr(frame, EB.slotsAt, 'normal');
  const subOn = spr(frame, EB.subscribeSlotAt, 'normal');
  const pulse = 0.5 + 0.5 * Math.sin((frame - EB.subscribeSlotAt) / 24); // slow breathing, no glow
  const common = (r: R, delay: number): React.CSSProperties => {
    const p = spr(frame, EB.slotsAt + delay, 'normal');
    return { ...slotBox(r), opacity: Math.min(1, p * 1.4), transform: `translateY(${(1 - p) * px(24)}px)` };
  };
  return (
    <>
      <div style={{ ...common(END_SLOTS.videoLeft, 0), ...iosSurface(px(RADIUS.panel), 0.3), background: 'transparent' }} />
      <div style={{ ...common(END_SLOTS.videoRight, stagger(2)), ...iosSurface(px(RADIUS.panel), 0.3), background: 'transparent' }} />
      <div
        style={{
          ...slotBox(END_SLOTS.subscribe),
          borderRadius: '50%',
          border: `${px(2)}px solid ${COLOR.alert}`,
          opacity: Math.min(1, subOn * 1.4) * (0.6 + 0.4 * pulse),
          transform: `scale(${0.9 + 0.1 * subOn})`,
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
            top: px(r.y - 36),
            textAlign: 'center',
            fontFamily: IOS.font,
            fontWeight: IOS.weight.medium,
            fontSize: px(20),
            color: COLOR.text.hint,
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
  const e1 = rise(frame, EB.eyebrowAt, 15, 16);
  const e2 = rise(frame, EB.headAt, 30, 28, 'slow'); // hero: the headline
  const e3 = rise(frame, EB.subscribeAt, 15, 20);
  const e4 = rise(frame, EB.slotsAt, 15, 16);
  const last = LEVELS[LEVELS.length - 1];
  const next = settings.nextVideo;
  const nextLine = next.title ? next.title : '';

  return (
    <AbsoluteFill style={{ fontFamily: IOS.font }}>
      <IosBackground accent={last.accent} />
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
          gap: px(12),
        }}
      >
        <div
          style={{
            fontWeight: IOS.weight.semibold,
            fontSize: px(24),
            letterSpacing: px(2),
            color: COLOR.text.label,
            opacity: e1.opacity,
            transform: e1.transform,
          }}
        >
          {COPY.eyebrow}
        </div>
        <div
          style={{
            fontWeight: IOS.weight.bold,
            fontSize: px(92),
            lineHeight: 1.04,
            letterSpacing: px(-2),
            color: COLOR.text.primary,
            opacity: e2.opacity,
            transform: e2.transform,
          }}
        >
          {COPY.headA}
          <br />
          <span style={{ color: last.accent }}>{COPY.headB}</span>
        </div>
        <div
          style={{
            marginTop: px(8),
            padding: `${px(10)}px ${px(26)}px`,
            borderRadius: px(40),
            background: COLOR.alert,
            color: COLOR.onAlert,
            fontWeight: IOS.weight.semibold,
            fontSize: px(26),
            opacity: e3.opacity,
            transform: e3.transform,
          }}
        >
          {COPY.subscribe}
          <span style={{ fontWeight: IOS.weight.medium, fontSize: px(18), marginLeft: px(16), opacity: 0.85 }}>{COPY.subscribeSub}</span>
        </div>
        {nextLine ? (
          <div
            style={{
              fontWeight: IOS.weight.medium,
              fontSize: px(24),
              color: COLOR.text.primary,
              opacity: e4.opacity,
              transform: e4.transform,
            }}
          >
            <span style={{ color: COLOR.text.hint }}>{COPY.nextLabel}: </span>
            {nextLine}
            {next.linkText ? <span style={{ color: COLOR.text.hint }}> {'•'} {next.linkText}</span> : null}
          </div>
        ) : null}
      </div>

      {/* bottom half: only the slot outlines, see END_SLOTS */}
      <Outlines frame={frame} />
    </AbsoluteFill>
  );
};
