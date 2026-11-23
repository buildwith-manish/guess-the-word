import React from 'react';
import { TIMER } from '../components/TimerToPill';
import { springAt } from '../shared/springs';
import { colors, glassSurface, px, textStyle, useXmasFrame } from '../system';
import { KEYBOARD } from '../ui';
import type { RoundProps } from './registry';

/**
 * Bonus 5, Autocomplete: the line "<prefix> ___" (prefix from data.ts), the three suggestion chips of an iOS keyboard
 * (data.ts chips) over a keyboard drawn in code (rectangles, letters and two small icons: no Apple assets or logos).
 * Nothing is highlighted during the play time. The correct chip lights up, the others dim, and the word drops into the
 * blank at `highlightAt` = the end of the play time plus the timer's flash, which is the tick BonusScene starts the
 * answers (BonusReveal) at.
 *
 * Draws only the play area (registry.ts). No backdrop blur here (BonusScene's banner and timer use the two blurred
 * layers), so the glass is flat.
 */
export const AUTOCOMPLETE = {
  /** the sentence line */
  line: { y: 0, h: 100, fontSize: 68, blankW: 250 },
  /** suggestion bar */
  bar: { y: 118, h: 68, fontSize: 38 },
  /** keyboard */
  keys: { y: 206, rowH: 40, gap: 7, fontSize: 20 },
  /** chip highlight: pop scale and the dim of the other chips */
  pop: 0.05,
  dim: 0.35,
} as const;

/** Tick at which the correct chip is highlighted: the end of the play time plus the timer flash (same as BonusScene's answersFrom). */
export const autocompleteHighlightAt = (playFrom: number, playFrames: number): number => playFrom + playFrames + TIMER.flashTicks;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const flatGlass = (radius: number, opts: Parameters<typeof glassSurface>[1]): React.CSSProperties => {
  const { backdropFilter: _b, WebkitBackdropFilter: _wb, ...flat } = glassSurface(radius, opts);
  void _b;
  void _wb;
  return flat;
};

const Key: React.FC<{ w: number; h: number; dark?: boolean; children?: React.ReactNode }> = ({ w, h, dark, children }) => (
  <div
    style={{
      width: px(w),
      height: px(h),
      flex: 'none',
      borderRadius: px(8),
      background: dark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.20)',
      boxShadow: `0 ${px(1.5)}px 0 rgba(0,0,0,0.45)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: textStyle('body').fontFamily,
      fontSize: px(AUTOCOMPLETE.keys.fontSize),
      fontWeight: 500,
      color: colors.ink,
    }}
  >
    {children}
  </div>
);

const ShiftIcon: React.FC = () => (
  <svg width={px(20)} height={px(20)} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={2.2} strokeLinejoin="round">
    <path d="M12 4 L21 13 H16 V20 H8 V13 H3 Z" />
  </svg>
);
const DeleteIcon: React.FC = () => (
  <svg width={px(24)} height={px(20)} viewBox="0 0 28 24" fill="none" stroke={colors.ink} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round">
    <path d="M9 3 H25 V21 H9 L2 12 Z" />
    <path d="M14 9 L20 15 M20 9 L14 15" />
  </svg>
);

const Keyboard: React.FC = () => {
  const { gap, rowH } = AUTOCOMPLETE.keys;
  const W = 844;
  const keyW = (W - 9 * gap) / 10;
  const row = (letters: string, inset: number, key: string) => (
    <div key={key} style={{ display: 'flex', gap: px(gap), paddingLeft: px(inset) }}>
      {[...letters].map((ch) => (
        <Key key={ch} w={keyW} h={rowH}>
          {ch}
        </Key>
      ))}
    </div>
  );
  const [r1, r2, r3] = KEYBOARD.rows;
  const wide = keyW * 1.5 + gap * 0.5;
  return (
    <div style={{ position: 'absolute', left: 0, top: px(AUTOCOMPLETE.keys.y), width: px(W), display: 'flex', flexDirection: 'column', gap: px(gap) }}>
      {row(r1, 0, 'r1')}
      {row(r2, (keyW + gap) / 2, 'r2')}
      <div style={{ display: 'flex', gap: px(gap) }}>
        <Key w={wide} h={rowH} dark>
          <ShiftIcon />
        </Key>
        {[...r3].map((ch) => (
          <Key key={ch} w={keyW} h={rowH}>
            {ch}
          </Key>
        ))}
        <Key w={wide} h={rowH} dark>
          <DeleteIcon />
        </Key>
      </div>
      <div style={{ display: 'flex', gap: px(gap) }}>
        <Key w={keyW * 2 + gap} h={rowH} dark>
          {KEYBOARD.numbers}
        </Key>
        <Key w={keyW * 6 + gap * 5} h={rowH}>
          {KEYBOARD.space}
        </Key>
        <Key w={keyW * 2 + gap} h={rowH} dark>
          {KEYBOARD.enter}
        </Key>
      </div>
    </div>
  );
};

export const Autocomplete: React.FC<RoundProps> = ({ slot, playFrom, playFrames }) => {
  if (slot.key !== 'autocomplete') throw new Error(`Autocomplete: bonus ${slot.bonus} is a ${slot.key} round`);
  const t = useXmasFrame();
  const A = AUTOCOMPLETE;
  const enter = springAt(t, playFrom - 8, 'smooth');
  const hl = springAt(t, autocompleteHighlightAt(playFrom, playFrames), 'pop');
  const lit = t >= autocompleteHighlightAt(playFrom, playFrames);
  const caretOn = Math.floor(t / 8) % 2 === 0;
  const n = slot.chips.length;
  const cellW = 844 / n;

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: clamp01(enter * 2), transform: `translateY(${px(14 * (1 - enter))}px)` }}>
      {/* the sentence: prefix, then the blank that the correct word drops into */}
      <div style={{ position: 'absolute', left: 0, top: px(A.line.y), width: px(844), height: px(A.line.h), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: px(26) }}>
        <span style={{ ...textStyle('title'), fontSize: px(A.line.fontSize) }}>{slot.prefix}</span>
        <div style={{ position: 'relative', width: px(A.line.blankW), height: px(A.line.fontSize * 1.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ ...textStyle('title'), fontSize: px(A.line.fontSize), color: colors.gold, opacity: lit ? hl : 0, transform: `translateY(${px(-10 * (1 - hl))}px)` }}>{slot.correct}</span>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: px(5), borderRadius: px(3), background: lit ? colors.gold : colors.muted, opacity: lit ? 1 : 0.7 }} />
          {!lit ? <div style={{ position: 'absolute', left: '50%', top: '14%', width: px(4), height: '66%', borderRadius: px(2), background: colors.gold, opacity: caretOn ? 1 : 0 }} /> : null}
        </div>
      </div>

      {/* suggestion bar: the chips from data.ts, in order */}
      <div style={{ position: 'absolute', left: 0, top: px(A.bar.y), width: px(844), height: px(A.bar.h), display: 'flex', ...flatGlass(A.bar.h / 2, { edge: 0.6, depth: 0.45, base: colors.glassBase }) }}>
        {slot.chips.map((chip, i) => {
          const correct = chip === slot.correct;
          const k = lit ? hl : 0;
          return (
            <div key={chip} style={{ position: 'relative', width: px(cellW), height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {i > 0 ? <div style={{ position: 'absolute', left: 0, top: '22%', height: '56%', width: px(1.5), background: 'rgba(255,255,255,0.18)', opacity: 1 - k * 0.6 }} /> : null}
              {correct && lit ? (
                <div
                  style={{
                    position: 'absolute',
                    inset: px(5),
                    borderRadius: px(A.bar.h / 2),
                    background: `color-mix(in srgb, ${colors.gold} 34%, rgba(255,255,255,0.06))`,
                    boxShadow: `0 0 ${px(24 * k)}px ${colors.goldGlow}, inset 0 0 0 ${px(2)}px ${colors.gold}`,
                    opacity: clamp01(k * 1.5),
                    transform: `scale(${1 + A.pop * k})`,
                  }}
                />
              ) : null}
              <span
                style={{
                  position: 'relative',
                  ...textStyle('body'),
                  fontSize: px(A.bar.fontSize),
                  fontWeight: 600,
                  color: correct && lit ? colors.ink : colors.ink,
                  opacity: lit && !correct ? 1 - (1 - A.dim) * k : 1,
                }}
              >
                {chip}
              </span>
            </div>
          );
        })}
      </div>

      <Keyboard />
    </div>
  );
};

export default Autocomplete;
