import React from 'react';
import { AbsoluteFill } from 'remotion';
import { S, px } from '../../style';
import { IOS, IosBackground, iosSurface, spring } from '../../ios';
import { ROUNDS } from '../search-data';
import { LEVELS } from '../search-timing';
import { ProgressDots } from '../components/ProgressDots';
import {
  DOTS_AT,
  DOTS_SPAN,
  MAX_SCORE,
  RANKS,
  lineAt,
  rankRange,
  rowStart,
} from './searchScoreboardCues';

/**
 * Final scoreboard of the search video (task 5a).
 *
 * Props:
 *  - frame: scene-local tick (design frames, 30 per second; the caller passes `local` from locate()).
 *
 * Phases: recap strip of all rounds lights up over DOTS_SPAN ticks, one dot per round; the rank table drops in bottom to top
 * (best rank last); the closing line fades in. All beats live in
 * searchScoreboardCues.ts, so scene and sound cues cannot drift apart.
 * Content: ranks and colours from search-settings.json, round count from search-data.ts, no images.
 */

/** Closing line. TODO(settings): the wording was given in the task, not in search-settings.json; move it there. */
export const CLOSING_LINE = `Where did you land? Comment your score out of ${MAX_SCORE}`;

/** Backdrop: the theme of the last level (settings). */
const THEME = LEVELS[LEVELS.length - 1].theme;

/** Layout, 1280x720 reference units. */
/** The strip holds 50 dots in level groups plus the "n / 50" counter, one row, inside the safe width (1152). */
const STRIP = { x: 640, y: 104, w: 1100 };
const TABLE_TOP = 168;
const ROW_GAP = 10;
const LINE_TOP = 566;
const levelColor = (i: number) => LEVELS.find((l) => l.name === ROUNDS[i].level)!.accent;

export const SearchScoreboard: React.FC<{ frame: number }> = ({ frame }) => {
  const total = ROUNDS.length;
  const litCount = Math.max(0, Math.min(total, Math.floor(((frame - DOTS_AT) / DOTS_SPAN) * total) + 1));
  const rise = (at: number, ticks: number, dist: number) => {
    const k = spring((frame - at) / ticks);
    return { opacity: Math.min(1, k * 1.4), transform: `translateY(${(1 - k) * px(dist)}px)` };
  };
  const strip = rise(0, 14, 14);
  const line = rise(lineAt(), 16, 16);

  return (
    <AbsoluteFill>
      <IosBackground accent={LEVELS[LEVELS.length - 1].accent} />

      {/* recap strip: every round, lit one by one */}
      <AbsoluteFill style={{ opacity: strip.opacity, transform: strip.transform }}>
        {/* index is the last lit dot, so the counter reads "lit / total" and the last lit dot pulses */}
        <ProgressDots index={litCount - 1} total={total} levelOf={levelColor} at={{ x: STRIP.x, y: STRIP.y }} size={STRIP.w} />
      </AbsoluteFill>

      {/* rank table, filled bottom to top */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: px(TABLE_TOP),
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: px(ROW_GAP),
        }}
      >
        {RANKS.map((r, i) => {
          const at = rowStart(i);
          const p = Math.min(1, spring((frame - at) / 20) * 1.4);
          const k = spring((frame - at) / 20);
          const isTop = i === 0;
          const [lo, hi] = rankRange(i);
          return (
            <div
              key={r.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: px(18),
                width: S.scoreboardRowW,
                height: S.scoreboardRowH,
                padding: `0 ${px(28)}px`,
                ...iosSurface(px(IOS.radius.lg), 0.6),
                background: isTop ? IOS.color.fillStrong : IOS.color.fill,
                opacity: p,
                transform: `translateY(${(1 - k) * px(16)}px)`,
              }}
            >
              <span style={{ width: px(14), height: px(14), borderRadius: '50%', background: r.accent, flex: 'none' }} />
              <span
                style={{
                  fontFamily: IOS.font,
                  fontWeight: IOS.weight.semibold,
                  fontSize: px(34),
                  flex: 1,
                  textAlign: 'left',
                  color: IOS.color.label,
                }}
              >
                {r.name}
              </span>
              <span
                style={{
                  fontFamily: IOS.font,
                  fontWeight: IOS.weight.medium,
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: px(26),
                  color: IOS.color.secondary,
                }}
              >
                {lo}–{hi}
              </span>
            </div>
          );
        })}
      </div>

      {/* closing line */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: px(LINE_TOP),
          textAlign: 'center',
          fontFamily: IOS.font,
          fontWeight: IOS.weight.medium,
          fontSize: px(28),
          color: IOS.color.secondary,
          opacity: line.opacity,
          transform: line.transform,
        }}
      >
        {CLOSING_LINE}
      </div>

    </AbsoluteFill>
  );
};
