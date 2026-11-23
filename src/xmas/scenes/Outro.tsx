import React from 'react';
import { AbsoluteFill } from 'remotion';
import { meta, outroAsks, ranks } from '../data';
import { cue } from '../sfx';
import type { SfxCue } from '../sfx';
import {
  BOKEH,
  backgroundStyle,
  bokehStyle,
  colors,
  frameBorderStyle,
  glassSurface,
  px,
  springAt,
  textStyle,
  useXmasFonts,
  useXmasFrame,
} from '../system';
import {
  endScreenInSec,
  endScreenSec,
  outroAskExitSec,
  outroAskLeadSec,
  outroAskTailSec,
  outroFadeSec,
  outroSec,
  outroVoiceLagSec,
  secToTicks,
  segments,
  subscribePressSec,
  ticksToFrames,
} from '../timing';
import { UI, showPartTwoAsk } from '../ui';

/**
 * Outro (timing.ts `outroSec`, 25 s). Local tick 0 = the first tick of the outro segment; place it in a Sequence.
 *   asks        first outroSec - endScreenSec: the asks appear one after the other and stay stacked, each spoken
 *               (text from data.ts outroAsks; the optional part-two line from ui.ts, only when showPartTwoAsk is true,
 *               inserted just before the last ask, the subscribe ask)
 *   end screen  last endScreenSec: the asks fade out, then a next-video slot, a subscribe button and a miniature of the
 *               rank card come in; the button presses once; the last outroFadeSec fades to black
 * Every time comes from timing.ts, every string from data.ts and ui.ts. Frame numbers are design ticks.
 */

/** The asks shown, in order: the data asks, plus the optional line before the last one (the subscribe ask). */
export const outroAsksShown = (): { text: string; spoken: boolean }[] => {
  const asks = outroAsks.map((text) => ({ text, spoken: true }));
  if (!showPartTwoAsk || asks.length === 0) return asks;
  return [...asks.slice(0, -1), { text: UI.partTwoAsk, spoken: false }, asks[asks.length - 1]];
};

const outroSegment = (() => {
  const s = segments.find((x) => x.kind === 'outro');
  if (!s || s.kind !== 'outro') throw new Error('Outro: timing.ts has no outro segment');
  return s;
})();

export const outroTicks: number = outroSegment.to - outroSegment.from;
/** Length of the scene in render frames. */
export const outroFrames: number = ticksToFrames(outroTicks);

export type OutroBeats = {
  /** local tick the asks start appearing, one per ask */
  asks: number[];
  /** local tick the end screen starts (the asks fade out here) */
  endScreen: number;
  slot: number;
  subscribe: number;
  rankCard: number;
  press: number;
  /** local tick the final fade to black starts */
  fade: number;
  end: number;
};

export const outroBeats = (): OutroBeats => {
  const endScreen = outroTicks - secToTicks(endScreenSec);
  const shown = outroAsksShown();
  const lead = secToTicks(outroAskLeadSec);
  const window = endScreen - lead - secToTicks(outroAskTailSec);
  // each ask gets a share of the window in proportion to its text length (a stand-in for how long it is spoken)
  const total = shown.reduce((sum, a) => sum + a.text.length, 0);
  let used = 0;
  const asks = shown.map((a) => {
    const at = Math.round(lead + (window * used) / total);
    used += a.text.length;
    return at;
  });
  return {
    asks,
    endScreen,
    slot: endScreen + secToTicks(endScreenInSec.slot),
    subscribe: endScreen + secToTicks(endScreenInSec.subscribe),
    rankCard: endScreen + secToTicks(endScreenInSec.rankCard),
    press: endScreen + secToTicks(subscribePressSec),
    fade: outroTicks - secToTicks(outroFadeSec),
    end: outroTicks,
  };
};

/** The voice marks for the audio task: local tick each ask is spoken at. The optional part-two line has no clip (spoken: false). */
export const outroVoiceMarks = (start = 0): { text: string; tick: number; spoken: boolean }[] => {
  const b = outroBeats();
  return outroAsksShown().map((a, i) => ({ ...a, tick: start + b.asks[i] + secToTicks(outroVoiceLagSec) }));
};

/** Sounds of the outro at absolute design tick `start`. Sorted by tick. */
export const outroCues = (start = 0): SfxCue[] => {
  const b = outroBeats();
  return [
    ...b.asks.map((t) => cue('widget-pop', start + t)),
    cue('swipe', start + b.slot),
    cue('bulb-on', start + b.subscribe),
    cue('gold-bulb', start + b.rankCard),
    cue('flash-blip', start + b.press),
  ].sort((a, c) => a.frame - c.frame);
};

/** Layout, reference units (1280x720). Text stays inside the centre 80% (x 128..1152, y 72..648). */
export const OUTRO_LAYOUT = {
  asks: { x: 128, w: 1024, top: 72, bottom: 648, gap: 22, padX: 40, padY: 28, radius: 40, size: 42 },
  slot: { x: 128, y: 190, w: 640, h: 360, radius: 36 },
  subscribe: { x: 840, y: 392, w: 312, h: 96 },
  rankCard: { x: 840, y: 72, w: 312, h: 232, radius: 32 },
} as const;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const AskCard: React.FC<{ text: string; t: number; at: number; accent?: string }> = ({ text, t, at, accent }) => {
  const k = springAt(t, at, 'smooth');
  const L = OUTRO_LAYOUT.asks;
  return (
    <div
      style={{
        boxSizing: 'border-box',
        width: px(L.w),
        padding: `${px(L.padY)}px ${px(L.padX)}px`,
        opacity: clamp01(k * 1.6),
        transform: `translateY(${px(30 * (1 - k))}px)`,
        ...glassSurface(L.radius, { edge: 0.8, depth: 0.6, base: colors.glassBase, ...(accent ? { tint: accent, tintPercent: 20 } : {}) }),
      }}
    >
      <div style={{ ...textStyle('body'), fontSize: px(L.size), fontWeight: 600, lineHeight: 1.18, textAlign: 'center' }}>{text}</div>
    </div>
  );
};

/** Miniature of the rank card: the label, the top rank name and its score range, all from data.ts and ui.ts. */
export const RankCardMini: React.FC<{ k: number }> = ({ k }) => {
  const L = OUTRO_LAYOUT.rankCard;
  const top = ranks.slice().sort((a, b) => a.min - b.min)[ranks.length - 1];
  return (
    <div
      style={{
        position: 'absolute',
        left: px(L.x),
        top: px(L.y),
        width: px(L.w),
        height: px(L.h),
        opacity: clamp01(k * 1.6),
        transform: `translateY(${px(-20 * (1 - k))}px) scale(${0.94 + 0.06 * k})`,
        transformOrigin: 'top right',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: px(12),
        padding: px(20),
        textAlign: 'center',
        ...glassSurface(L.radius, { edge: 1, depth: 0.8, base: colors.glassBase, tint: colors.gold, tintPercent: 18 }),
      }}
    >
      <div style={{ ...textStyle('caption'), fontSize: px(22), color: colors.muted }}>{UI.rankCard}</div>
      <div style={{ ...textStyle('title'), fontSize: px(36), lineHeight: 1.1, color: colors.gold }}>{top.name}</div>
      <div style={{ ...textStyle('label'), fontSize: px(26), color: colors.ink }}>{`${top.min}\u2013${top.max} / ${meta.maxScore}`}</div>
    </div>
  );
};

export const Outro: React.FC = () => {
  useXmasFonts();
  const t = useXmasFrame();
  const b = outroBeats();
  const shown = outroAsksShown();
  const A = OUTRO_LAYOUT.asks;
  const S = OUTRO_LAYOUT.slot;
  const B = OUTRO_LAYOUT.subscribe;

  const asksOut = 1 - clamp01((t - b.endScreen) / secToTicks(outroAskExitSec));
  const slot = springAt(t, b.slot, 'smooth');
  const sub = springAt(t, b.subscribe, 'pop');
  const card = springAt(t, b.rankCard, 'smooth');
  // the button presses once: a quick dip and a glow flash
  const press = clamp01((t - b.press) / 3) * (1 - clamp01((t - b.press - 3) / 8));
  const fade = clamp01((t - b.fade) / (b.end - b.fade));

  return (
    <AbsoluteFill style={backgroundStyle()}>
      {BOKEH.map((d, i) => (
        <div key={i} style={bokehStyle(d, t / 30)} />
      ))}
      <div style={frameBorderStyle()} />

      {/* the asks: stacked, stable positions (hidden ones keep their space) */}
      <div
        style={{
          position: 'absolute',
          left: px(A.x),
          top: px(A.top),
          width: px(A.w),
          height: px(A.bottom - A.top),
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: px(A.gap),
          opacity: asksOut,
          visibility: asksOut <= 0 ? 'hidden' : 'visible',
        }}
      >
        {shown.map((a, i) => (
          <AskCard key={i} text={a.text} t={t} at={b.asks[i]} accent={i === shown.length - 1 ? colors.red : undefined} />
        ))}
      </div>

      {/* end screen */}
      <div
        style={{
          position: 'absolute',
          left: px(S.x),
          top: px(S.y),
          width: px(S.w),
          height: px(S.h),
          boxSizing: 'border-box',
          opacity: clamp01(slot * 1.6),
          transform: `translateY(${px(26 * (1 - slot))}px)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: px(22),
          ...glassSurface(S.radius, { edge: 1, depth: 1, base: colors.glassBase }),
        }}
      >
        <div
          style={{
            width: px(104),
            height: px(104),
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.14)',
            border: `${px(1.5)}px solid rgba(255,255,255,0.35)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              marginLeft: px(8),
              width: 0,
              height: 0,
              borderTop: `${px(20)}px solid transparent`,
              borderBottom: `${px(20)}px solid transparent`,
              borderLeft: `${px(34)}px solid ${colors.ink}`,
            }}
          />
        </div>
        <div style={{ ...textStyle('label'), fontSize: px(28), color: colors.muted }}>{UI.nextVideo}</div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: px(B.x),
          top: px(B.y),
          width: px(B.w),
          height: px(B.h),
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: clamp01(sub * 1.6),
          transform: `scale(${(0.86 + 0.14 * sub) * (1 - 0.06 * press)})`,
          borderRadius: px(B.h / 2),
          background: `linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 45%), ${colors.red}`,
          border: `${px(1.5)}px solid rgba(255,255,255,0.35)`,
          boxShadow: `0 ${px(14)}px ${px(40)}px rgba(255,69,58,${0.35 + 0.3 * press}), 0 0 ${px(60 * press)}px rgba(255,69,58,${0.6 * press})`,
        }}
      >
        <span style={{ ...textStyle('title'), fontSize: px(32), letterSpacing: '0.1em', color: '#fff' }}>{UI.subscribe}</span>
      </div>

      <RankCardMini k={card} />

      <AbsoluteFill style={{ background: '#000', opacity: fade, pointerEvents: 'none' }} />
    </AbsoluteFill>
  );
};

export default Outro;
