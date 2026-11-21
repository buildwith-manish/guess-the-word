import React from 'react';
import { px } from '../../style';
import { IOS, spring } from '../../ios';

/**
 * Title lockup, iOS style: the title in large bold Inter, word by word rising in on the shared spring, the last word
 * in the system blue; then the subtitle fades up under it. No tiles, no flips, no glow.
 * Props are unchanged: `from` is the scene tick it starts, `top` the top edge (reference units), `scale` a size multiplier.
 */

/** Sizes in reference units (before `scale`). */
const TITLE_FONT = 54;
const SUBTITLE_FONT = 17;
const WORD_GAP_EM = 0.28;
const SUBTITLE_GAP = 14;
/** Motion constants, design ticks (30 per second). */
const WORD_STAGGER_TICKS = 5;
const WORD_TICKS = 13;
const RISE = 18; // reference units
const SUBTITLE_AFTER_TICKS = 10;
const SUBTITLE_TICKS = 12;

export type SearchTitleLockupProps = {
  frame: number;
  from: number;
  title: string;
  subtitle: string;
  top: number;
  scale?: number;
};

export const SearchTitleLockup: React.FC<SearchTitleLockupProps> = ({ frame, from, title, subtitle, top, scale = 1 }) => {
  const f = frame - from;
  if (f < 0) return null;

  const words = title.split(/\s+/).filter(Boolean);
  const s = (v: number) => px(v * scale);
  const font = s(TITLE_FONT);
  const subStart = (words.length - 1) * WORD_STAGGER_TICKS + WORD_TICKS + SUBTITLE_AFTER_TICKS;
  const subK = spring((f - subStart) / SUBTITLE_TICKS);

  return (
    <div
      style={{
        position: 'absolute',
        top: px(top),
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: IOS.font,
      }}
    >
      <div style={{ display: 'flex', gap: font * WORD_GAP_EM, whiteSpace: 'pre' }}>
        {words.map((word, wi) => {
          const k = spring((f - wi * WORD_STAGGER_TICKS) / WORD_TICKS);
          return (
            <div
              key={wi}
              style={{
                fontSize: font,
                fontWeight: IOS.weight.bold,
                lineHeight: 1.05,
                letterSpacing: -font * 0.03,
                color: wi === words.length - 1 ? IOS.color.blue : IOS.color.label,
                opacity: Math.min(1, k * 1.4),
                transform: `translateY(${(1 - k) * s(RISE)}px)`,
              }}
            >
              {word}
            </div>
          );
        })}
      </div>
      <div
        style={{
          marginTop: s(SUBTITLE_GAP),
          fontSize: s(SUBTITLE_FONT),
          fontWeight: IOS.weight.medium,
          letterSpacing: s(SUBTITLE_FONT) * 0.02,
          color: IOS.color.secondary,
          opacity: subK,
          transform: `translateY(${(1 - subK) * s(RISE * 0.5)}px)`,
          whiteSpace: 'pre',
        }}
      >
        {subtitle}
      </div>
    </div>
  );
};
