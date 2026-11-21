import React from 'react';
import { COLORS, FONTS, px } from '../../style';
import { useDesignFrame } from '../../clock';
import { FPS } from '../../timing';

/**
 * A row of small dots, one per round: future dots dim, the current dot pulses,
 * finished dots are filled in their level colour.
 * `index` is the 0-based current round. `levelOf(i)` gives the colour of round i.
 * Ticks are design ticks (30/s), sampled at 60 fps.
 *
 * Large totals (task 7b): from GROUP_MIN_TOTAL dots up, consecutive dots with the same
 * `levelOf` colour form one group (a level), the groups are separated by a small gap, and a
 * counter "23 / 50" sits at the right end of the same row. The counter is the current round
 * number, `index + 1`, clamped to 0..total, so it also works as a "lit so far" count when a
 * caller passes `litCount - 1` as the index. Everything stays inside `size`.
 */

/** Pulse period in seconds and its strength. Motion constants. */

/** Layout (reference units). From this many dots up the row is grouped and gets a counter. */
const GROUP_MIN_TOTAL = 20;
/** Gap between two level groups (reference units). */
const GROUP_GAP = 14;
/** Counter text size, gap between the dots and the counter, and its width per character. */
const COUNTER_FONT = 18;
const COUNTER_GAP = 16;
const COUNTER_CHAR_W = 0.62; // of the font size, tabular figures
/** Dot diameter as a share of the pitch: plain row, and grouped row (a little larger, dots are tiny at 50). */
const DOT_SHARE = 0.42;
const DOT_SHARE_GROUPED = 0.6;

export type ProgressDotsProps = {
  /** 0-based index of the current round. */
  index: number;
  /** Number of dots. */
  total: number;
  /** Colour of round i. */
  levelOf: (index: number) => string;
  /** Centre-x and centre-y of the row, reference units. */
  at: { x: number; y: number };
  /** Row width in reference units. */
  size: number;
};

type Group = { start: number; length: number };

/** Consecutive dots with the same colour. */
const groupsOf = (total: number, levelOf: (i: number) => string): Group[] => {
  const groups: Group[] = [];
  for (let i = 0; i < total; i++) {
    const last = groups[groups.length - 1];
    if (last && levelOf(i) === levelOf(i - 1)) last.length++;
    else groups.push({ start: i, length: 1 });
  }
  return groups;
};

export const ProgressDots: React.FC<ProgressDotsProps> = ({ index, total, levelOf, at, size }) => {
  const frame = useDesignFrame();
  const W = px(size);
  const grouped = total >= GROUP_MIN_TOTAL;

  const dot = (i: number, d: number) => {
    const color = levelOf(i);
    const done = i < index;
    const current = i === index;
    return (
      <div
        style={{
          width: d,
          height: d,
          borderRadius: '50%',
          background: done || current ? color : COLORS.stroke,
          opacity: current || done ? 1 : 0.6,
          transform: current ? 'scale(1.35)' : undefined,
        }}
      />
    );
  };

  if (!grouped) {
    const pitch = W / Math.max(1, total);
    const d = pitch * DOT_SHARE;
    return (
      <div
        style={{
          position: 'absolute',
          left: px(at.x) - W / 2,
          top: px(at.y) - d * 1.6,
          width: W,
          height: d * 3.2,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {Array.from({ length: total }, (_, i) => (
          <div key={i} style={{ width: pitch, display: 'flex', justifyContent: 'center' }}>
            {dot(i, d)}
          </div>
        ))}
      </div>
    );
  }

  // Grouped row: [level groups ........] [23 / 50]
  const groups = groupsOf(total, levelOf);
  const label = `${total} / ${total}`; // widest text the counter can show
  const counterW = px(COUNTER_FONT) * COUNTER_CHAR_W * label.length;
  const reserved = counterW + px(COUNTER_GAP);
  const gap = px(GROUP_GAP);
  const pitch = (W - reserved - gap * Math.max(0, groups.length - 1)) / Math.max(1, total);
  const d = pitch * DOT_SHARE_GROUPED;
  const rowH = Math.max(d * 3.2, px(COUNTER_FONT) * 1.6);
  const shown = Math.max(0, Math.min(total, index + 1));

  return (
    <div
      style={{
        position: 'absolute',
        left: px(at.x) - W / 2,
        top: px(at.y) - rowH / 2,
        width: W,
        height: rowH,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
        {groups.map((g, gi) => (
          <div key={g.start} style={{ display: 'flex', alignItems: 'center', marginLeft: gi ? gap : 0 }}>
            {Array.from({ length: g.length }, (_, k) => (
              <div key={k} style={{ width: pitch, display: 'flex', justifyContent: 'center' }}>
                {dot(g.start + k, d)}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div
        style={{
          width: counterW,
          marginLeft: px(COUNTER_GAP),
          textAlign: 'right',
          whiteSpace: 'nowrap',
          fontFamily: FONTS.body,
          fontWeight: 600,
          fontSize: px(COUNTER_FONT),
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: px(1),
          color: COLORS.muted,
        }}
      >
        <span style={{ color: COLORS.ink }}>{shown}</span> / {total}
      </div>
    </div>
  );
};
