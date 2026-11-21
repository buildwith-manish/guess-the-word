import React from 'react';
import { AbsoluteFill } from 'remotion';
import { COLORS, FONTS, S, px, glass, K } from '../../style';
import { prog, revealIn } from '../../anim';
import { backOut } from '../../gsap-helpers';
import { Background } from '../../Background';
import { Confetti } from '../../Fx';
import { ROUNDS } from '../search-data';
import { LEVELS } from '../search-timing';
import { ProgressDots } from '../components/ProgressDots';
import {
  DOTS_AT,
  DOTS_SPAN,
  MAX_SCORE,
  RANKS,
  legendAt,
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
 * (best rank last, with glow and confetti); the closing line fades in. All beats live in
 * searchScoreboardCues.ts, so scene and sound cues cannot drift apart.
 * Content: ranks and colours from search-settings.json, round count from search-data.ts, no images.
 */

/** Closing line. TODO(settings): the wording was given in the task, not in search-settings.json; move it there. */
export const CLOSING_LINE = `Where did you land? Comment your score out of ${MAX_SCORE}`;

/** Backdrop: the theme of the last level (settings). */
const THEME = LEVELS[LEVELS.length - 1].theme;

/** Layout, 1280x720 reference units. */
const STRIP = { x: 640, y: 104, w: 1000 };
const TABLE_TOP = 168;
const ROW_GAP = 10;
const LINE_TOP = 566;
/** Confetti seed, piece count and origin. Motion constants. */
const CONFETTI = { seed: 99, count: 110, origin: { x: 640, y: 520 } };

const levelColor = (i: number) => LEVELS.find((l) => l.name === ROUNDS[i].level)!.accent;

export const SearchScoreboard: React.FC<{ frame: number }> = ({ frame }) => {
  const total = ROUNDS.length;
  const litCount = Math.max(0, Math.min(total, Math.floor(((frame - DOTS_AT) / DOTS_SPAN) * total) + 1));
  const strip = revealIn(frame, 0, 14, 20);
  const line = revealIn(frame, lineAt(), 16, 26);
  const glowAt = legendAt();

  return (
    <AbsoluteFill>
      <Background frame={frame} theme={THEME} />

      {/* recap strip: every round, lit one by one */}
      <AbsoluteFill style={{ opacity: strip.opacity, transform: strip.transform }}>
        <ProgressDots index={litCount} total={total} levelOf={levelColor} at={{ x: STRIP.x, y: STRIP.y }} size={STRIP.w} />
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
          const p = prog(frame, at, 20, backOut);
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
                ...glass(px(18), isTop ? 0.16 : 0.08),
                background: isTop
                  ? `linear-gradient(90deg, ${r.accent}47, ${r.accent}14)`
                  : undefined,
                borderLeft: `${px(10)}px solid ${r.accent}`,
                opacity: p,
                transform: `translate3d(${(1 - p) * -160 * K}px, 0, 0) scale(${0.92 + 0.08 * p})`,
                boxShadow:
                  isTop && frame >= glowAt
                    ? `0 0 ${px(20 + 44 * (0.5 + 0.5 * Math.sin((frame - glowAt) / 9)))}px ${r.accent}99`
                    : (glass(px(18)).boxShadow as string),
              }}
            >
              <span
                style={{
                  fontFamily: FONTS.display,
                  fontSize: px(38),
                  letterSpacing: px(2),
                  flex: 1,
                  textAlign: 'left',
                  color: COLORS.ink,
                }}
              >
                {r.name}
              </span>
              <span
                style={{
                  fontFamily: FONTS.body,
                  fontWeight: 800,
                  fontSize: px(24),
                  letterSpacing: px(2),
                  color: r.accent,
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
          fontFamily: FONTS.body,
          fontWeight: 800,
          fontSize: px(26),
          letterSpacing: px(2),
          color: COLORS.ink,
          opacity: line.opacity,
          transform: line.transform,
        }}
      >
        {CLOSING_LINE}
      </div>

      <Confetti frame={frame} start={glowAt} count={CONFETTI.count} seed={CONFETTI.seed} origin={CONFETTI.origin} />
    </AbsoluteFill>
  );
};
