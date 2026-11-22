/**
 * ControlCenterLook (task 3e): iOS Control Center. The question sits in a frosted card, the four options are large
 * toggle tiles, a vertical slider fills as the timer runs (the item's own `timerSec`, 9 s for bonuses, via
 * `phases.timer`). At the reveal every tile flips over; on the back the wrong ones are dimmed and off, the correct
 * one is lit green with its switch on, and the buzz cue lands at that moment (see `controlCenterCues`).
 *
 * Extras (from `extraIds(item)`):
 *   waveform   -> MusicPlayerCard (silent moving waveform, no album art, no text). Bonus 1.
 *   scoreBadge -> ScoreBadge (Metacritic-style green square, counts up at the reveal to the numeric correct
 *                 option; no logo). Bonus 3. The badge shows no number before the count starts, so it cannot
 *                 give the answer away.
 *
 * Props are the shell's context subset. All text comes from `item`; the look has no text of its own.
 * Beat lengths are written in seconds in `CONTROL` below and converted with `secToTicks`.
 * The flip is a scaleX squash (front to 0, back from 0), not a 3D rotation, so backdrop blur stays intact.
 */
import React from 'react';
import { extraIds } from '../../data';
import { FRAME, SAFE, colors, radius, springAt, textStyle, u, blurPx } from '../../system';
import { secToTicks } from '../../timing';
import { FrostCard, timerMath } from '../../components';
import type { ShellContext } from '../../components/QuestionShell';
import { cue } from '../../sfx';
import type { SfxCue } from '../../sfx';

export type ControlCenterLookProps = Pick<ShellContext, 'item' | 'phase' | 'localFrame' | 'phases'>;

/** Seconds. */
export const CONTROL = {
  tileStaggerSec: 0.1, // gap between tiles entering
  flipSec: 0.5, // one tile's flip
  countSec: 1, // score badge count-up
  wavePeriodSec: 1.6, // waveform motion
} as const;

const LETTERS = ['A', 'B', 'C', 'D'];
const TILE = { w: 560, h: 260, gap: 24 };
const GRID_W = 2 * TILE.w + TILE.gap;
const GRID_H = 2 * TILE.h + TILE.gap;
const GRID_TOP = FRAME.h - SAFE.bottom - GRID_H;
const SLIDER = { w: 160, h: GRID_H, left: FRAME.w - SAFE.x - 160 };
const SIDE = { left: SAFE.x + GRID_W + 40, w: SLIDER.left - 40 - (SAFE.x + GRID_W + 40), h: TILE.h };
const QUESTION = { left: SAFE.x + 200 + 40, top: SAFE.top, width: 1000 };

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const mixHex = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

/** Local tick at which the flips start (the end of the hold, i.e. the start of the reveal phase). */
const flipFrom = (phases: ControlCenterLookProps['phases']) => phases.reveal.from;
/** Local tick at which the correct switch turns on. */
export const switchOnAt = (phases: ControlCenterLookProps['phases']): number => flipFrom(phases) + secToTicks(CONTROL.flipSec);

/** Sfx cues in LOCAL ticks of the item (add the item's start tick before handing them to the soundtrack). */
export const controlCenterCues = (phases: ControlCenterLookProps['phases']): SfxCue[] => [cue('buzz-small', switchOnAt(phases))];

export const ControlCenterLook: React.FC<ControlCenterLookProps> = ({ item, localFrame, phases }) => {
  const extras = extraIds(item);
  const accent = colors.level[item.level];
  const enterAt = phases.read.from;
  const tilesAt = enterAt + secToTicks(CONTROL.tileStaggerSec);
  const stagger = secToTicks(CONTROL.tileStaggerSec);
  const fromFlip = flipFrom(phases);
  const flipTicks = secToTicks(CONTROL.flipSec);
  const onAt = switchOnAt(phases);
  const timer = timerMath(localFrame, phases.timer.from, phases.timer.to - phases.timer.from);
  const sliderFill = clamp01(timer.fill);
  const score = Number(item.options[item.answer]);

  return (
    <>
      {localFrame >= enterAt ? (
        <div style={{ position: 'absolute', left: u(QUESTION.left), top: u(QUESTION.top) }}>
          <FrostCard frame={localFrame} at={enterAt} level={item.level} width={QUESTION.width} padding={36} radius={radius.lg}>
            <div style={{ ...textStyle('question'), color: colors.ink }}>{item.q}</div>
          </FrostCard>
        </div>
      ) : null}

      <div style={{ position: 'absolute', left: u(SAFE.x), top: u(GRID_TOP), width: u(GRID_W), height: u(GRID_H) }}>
        {item.options.slice(0, 4).map((text, i) => {
          const enter = springAt(localFrame, tilesAt + i * stagger, 'snappy');
          const lin = clamp01((localFrame - fromFlip) / flipTicks);
          const flip = lin * lin * (3 - 2 * lin); // ease in-out
          const correct = i === item.answer;
          const sw = correct ? springAt(localFrame, onAt, 'smooth') : 0;
          return (
            <Tile
              key={i}
              index={i}
              text={text}
              enter={enter}
              flip={flip}
              correct={correct}
              sw={sw}
              left={(i % 2) * (TILE.w + TILE.gap)}
              top={Math.floor(i / 2) * (TILE.h + TILE.gap)}
            />
          );
        })}
      </div>

      <SliderBar fill={sliderFill} enter={springAt(localFrame, enterAt, 'snappy')} accent={accent} />

      {extras.includes('waveform') ? (
        <div style={{ position: 'absolute', left: u(SIDE.left), top: u(GRID_TOP) }}>
          <MusicPlayerCard frame={localFrame} at={tilesAt} width={SIDE.w} height={SIDE.h} />
        </div>
      ) : null}

      {extras.includes('scoreBadge') && Number.isFinite(score) ? (
        <div style={{ position: 'absolute', left: u(SIDE.left), top: u(GRID_TOP), width: u(SIDE.w), height: u(SIDE.h), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ScoreBadge frame={localFrame} at={tilesAt} countAt={fromFlip} value={score} size={SIDE.h - 40} />
        </div>
      ) : null}
    </>
  );
};

/* ---------- tile ---------- */

const Toggle: React.FC<{ on: number; lit?: boolean }> = ({ on, lit = false }) => {
  const off = [0x78, 0x78, 0x80];
  // On a lit (green) tile a green "on" track vanishes into the tile, so it turns dark instead and only the knob stays white.
  const green = lit ? [0x06, 0x13, 0x0a] : [0x30, 0xd1, 0x58];
  const track = `rgb(${[0, 1, 2].map((k) => mixHex(off[k], green[k], on)).join(',')})`;
  return (
    <div style={{ width: u(124), height: u(72), borderRadius: u(36), background: track, position: 'relative', flex: 'none' }}>
      <div style={{ position: 'absolute', top: u(4), left: u(4 + 52 * on), width: u(64), height: u(64), borderRadius: '50%', background: '#fff', boxShadow: `0 ${u(3)}px ${u(8)}px rgba(0,0,0,.35)` }} />
    </div>
  );
};

const Tile: React.FC<{
  index: number; text: string; enter: number; flip: number; correct: boolean; sw: number; left: number; top: number;
}> = ({ index, text, enter, flip, correct, sw, left, top }) => {
  if (enter <= 0) return null;
  const back = flip >= 0.5;
  const scaleX = flip === 0 ? 1 : back ? 2 * flip - 1 : 1 - 2 * flip;
  const lit = back && correct;
  const dim = back && !correct;
  const ink = lit ? colors.onAccent : colors.ink;
  return (
    <div
      style={{
        position: 'absolute', left: u(left), top: u(top), width: u(TILE.w), height: u(TILE.h),
        opacity: Math.min(1, enter), transform: `translateY(${(1 - enter) * u(30)}px) scaleX(${scaleX})`,
      }}
    >
      <div
        style={{
          width: '100%', height: '100%', boxSizing: 'border-box', borderRadius: u(radius.lg), padding: u(32),
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          background: lit ? colors.easy : colors.glass,
          border: `${u(1.5)}px solid ${lit ? colors.easy : colors.hairline}`,
          backdropFilter: `blur(${u(blurPx)}px) saturate(1.4)`,
          boxShadow: `0 ${u(10)}px ${u(30)}px ${colors.shadow}`,
          opacity: dim ? 0.45 : 1, filter: dim ? 'saturate(0.3)' : undefined,
        }}
      >
        <div style={{ ...textStyle('caption'), color: lit ? colors.onAccent : colors.muted, fontWeight: 700 }}>{LETTERS[index]}</div>
        <div style={{ ...textStyle('choice'), color: ink }}>{text}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Toggle on={back ? sw : 0} lit={lit} />
        </div>
      </div>
    </div>
  );
};

/* ---------- slider ---------- */

const SliderBar: React.FC<{ fill: number; enter: number; accent: string }> = ({ fill, enter, accent }) => (
  <div
    style={{
      position: 'absolute', left: u(SLIDER.left), top: u(GRID_TOP), width: u(SLIDER.w), height: u(SLIDER.h),
      borderRadius: u(radius.lg), overflow: 'hidden', background: colors.glass, border: `${u(1.5)}px solid ${colors.hairline}`,
      backdropFilter: `blur(${u(blurPx)}px) saturate(1.4)`, opacity: Math.min(1, enter), transform: `translateY(${(1 - enter) * u(30)}px)`,
    }}
  >
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${fill * 100}%`, background: accent }} />
    <svg viewBox="0 0 64 64" style={{ position: 'absolute', left: '50%', bottom: u(32), width: u(64), height: u(64), transform: 'translateX(-50%)' }}>
      <circle cx="32" cy="32" r="11" fill={fill > 0.12 ? colors.onAccent : colors.ink} />
      {Array.from({ length: 8 }, (_, k) => {
        const a = (k * Math.PI) / 4;
        return <line key={k} x1={32 + 18 * Math.cos(a)} y1={32 + 18 * Math.sin(a)} x2={32 + 26 * Math.cos(a)} y2={32 + 26 * Math.sin(a)} stroke={fill > 0.12 ? colors.onAccent : colors.ink} strokeWidth="4" strokeLinecap="round" />;
      })}
    </svg>
  </div>
);

/* ---------- MusicPlayerCard ---------- */

export type MusicPlayerCardProps = { frame: number; at: number; width?: number; height?: number };

const BARS = 24;

/** Now-playing card: a silent waveform that moves (deterministic from `frame`), a progress line, transport glyphs. No album art, no text. */
export const MusicPlayerCard: React.FC<MusicPlayerCardProps> = ({ frame, at, width = SIDE.w, height = SIDE.h }) => {
  const enter = springAt(frame, at, 'snappy');
  if (enter <= 0) return null;
  const period = secToTicks(CONTROL.wavePeriodSec);
  const t = (frame - at) / period;
  return (
    <div style={{ opacity: Math.min(1, enter), transform: `translateY(${(1 - enter) * u(30)}px)` }}>
      <FrostCard width={width} height={height} padding={28} radius={radius.lg} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: u(height - 140), gap: u(4) }}>
          {Array.from({ length: BARS }, (_, k) => {
            const a = 0.5 + 0.5 * Math.sin(2 * Math.PI * (t + k / 7));
            const b = 0.5 + 0.5 * Math.sin(2 * Math.PI * (t * 1.7 - k / 3.3));
            const h = 0.18 + 0.82 * (0.6 * a + 0.4 * b);
            return <span key={k} style={{ flex: 1, height: `${h * 100}%`, borderRadius: u(6), background: colors.ink, opacity: 0.85 }} />;
          })}
        </div>
        <div style={{ height: u(6), borderRadius: u(3), background: colors.hairline, position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${((t * 0.12) % 1) * 100}%`, borderRadius: u(3), background: colors.ink }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: u(48), alignItems: 'center' }}>
          <svg width={u(40)} height={u(40)} viewBox="0 0 40 40"><path d="M20 8 L8 20 L20 32 Z M32 8 L20 20 L32 32 Z" fill={colors.ink} /></svg>
          <svg width={u(40)} height={u(40)} viewBox="0 0 40 40"><path d="M12 6 L12 34 L34 20 Z" fill={colors.ink} /></svg>
          <svg width={u(40)} height={u(40)} viewBox="0 0 40 40"><path d="M8 8 L20 20 L8 32 Z M20 8 L32 20 L20 32 Z" fill={colors.ink} /></svg>
        </div>
      </FrostCard>
    </div>
  );
};

/* ---------- ScoreBadge ---------- */

export type ScoreBadgeProps = {
  frame: number;
  /** Local tick the badge appears (empty). */
  at: number;
  /** Local tick the number starts counting from 0. Nothing is shown in the badge before it. */
  countAt: number;
  /** Final number. */
  value: number;
  /** Side of the square, reference units. */
  size?: number;
};

/** Metacritic-style score square: green, rounded, big white number counting up. No logo, no text. */
export const ScoreBadge: React.FC<ScoreBadgeProps> = ({ frame, at, countAt, value, size = 220 }) => {
  const enter = springAt(frame, at, 'bouncy');
  if (enter <= 0) return null;
  const p = clamp01((frame - countAt) / secToTicks(CONTROL.countSec));
  const eased = 1 - Math.pow(1 - p, 3);
  const shown = frame >= countAt ? Math.round(value * eased) : null;
  return (
    <div
      style={{
        width: u(size), height: u(size), borderRadius: u(size * 0.18), background: colors.easy,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 ${u(14)}px ${u(40)}px ${colors.shadow}`,
        opacity: Math.min(1, enter), transform: `scale(${0.85 + 0.15 * enter})`,
      }}
    >
      <span style={{ ...textStyle('number'), fontSize: u(size * 0.56), fontWeight: 800, color: colors.onAccent }}>{shown ?? ''}</span>
    </div>
  );
};
