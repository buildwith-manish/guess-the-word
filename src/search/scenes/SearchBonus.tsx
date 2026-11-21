import React from 'react';
import { COLORS, FONTS, glass, px } from '../../style';
import { useDesignFrame } from '../../clock';
import { Flash, Ring } from '../../Fx';
import { backOut } from '../../gsap-helpers';
import cfg from '../search-settings.json';
import { BONUS_THEME, FPS, TIME_SCALE, buildBonusPlan } from '../search-timing';
import { BONUS } from '../search-data';
import { SearchStage, SLOTS } from '../components/SearchStage';
import { SearchBar } from '../components/SearchBar';
import { TimerBar } from '../components/TimerBar';
import { AnswerCard } from '../components/AnswerCard';

/**
 * One bonus scene (task 4b, polished in 7f): a full-screen BONUS intro slam, badge, search bar with
 * three searches, four option chips (A to D), the clock, then the correct chip lights up, a ring and a
 * soft flash mark the reveal and the answer card stamps. The intro and the reveal effects are overlays
 * above the stage, so the chip layout and the bonus-engine plan are untouched. They add no sound:
 * searchBonusCues.ts has no cue for them (it is not part of 7f).
 *
 * Props:
 *  - frame: scene-local tick (design frames, 30 per second; the caller passes `local` from locate()).
 *  - index: 0-based bonus index into BONUS.
 * Every tick comes from buildBonusPlan(index) (bonus-engine.ts), so the scene and searchBonusCues.ts
 * cannot drift apart. Option order is the data order; nothing is shuffled.
 * No lead: a bonus segment has none, so plan ticks are scene ticks.
 */

/** How far the search bar travels while it slides in, in 1280x720 reference units. Motion constant (same as SearchRound). */
const SLIDE_IN_DISTANCE = 60;
/** Badge and chip entrance. Motion constants. */
const BADGE_SECONDS = 0.5;
const CHIP_SECONDS = 0.35;
const RISE = 14; // reference units
/** At the reveal the searches and the three wrong chips dim, the right chip lights. Motion constants. */
const DIM_TO = 0.25;
const WRONG_CHIP_TO = 0.3;
const REVEAL_SECONDS = 0.3;
/** Intro slam (tick 0 on): scrim, big badge text, ring and flash, out before the chips matter. Motion constants. */
const INTRO_SLAM_SECONDS = 0.3;
const INTRO_HOLD_SECONDS = 0.7; // from tick 0 until the fade-out starts
const INTRO_OUT_SECONDS = 0.3;
const INTRO_SCRIM = 0.5;
const INTRO_FONT = 76; // reference units
const INTRO_SUB_FONT = 28;
const INTRO_SUB_DELAY_TICKS = 4;
const INTRO_START_SCALE = 2.2;
const INTRO_RING = 560;
const INTRO_FLASH_MS = 420;
const INTRO_FLASH_PEAK = 0.28;
/** The badge pops from this scale up to 1 (with overshoot). Motion constant. */
const BADGE_START_SCALE = 0.6;
/** Reveal effects on the answer card. Motion constants. */
const REVEAL_RING_OF_CARD = 0.9; // ring size as a share of the answer card width
const REVEAL_FLASH_MS = 400;
const REVEAL_FLASH_PEAK = 0.16;
/** Layout (reference units): gap between the chips and the answer card, and between chips. */
const CHIPS_TO_ANSWER_GAP = 14;
const CHIP_GAP = 10;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const letterOf = (i: number) => String.fromCharCode(65 + i); // A to D

export type SearchBonusProps = { frame: number; index: number };

export const SearchBonus: React.FC<SearchBonusProps> = ({ frame, index }) => {
  const plan = buildBonusPlan(index);
  const accent = BONUS_THEME[0];

  const hud = { label: 'BONUS', number: index + 1, total: cfg.bonus.after.length };
  // The badge text is data ("BONUS: ..."): the part before the first colon is the big word, the rest the line under it.
  const [bonusHead, ...bonusRest] = cfg.bonus.badgeText.split(':');
  const bonusSub = bonusRest.join(':').trim();

  // Stage-in: the bar slides in over the pre-roll, plan tick 0 .. first search.
  const slideK = easeOutCubic(clamp01(frame / Math.max(1, plan.searchAt[0])));

  // Reveal.
  const revealK = easeOutCubic(clamp01((frame - plan.revealAt) / (REVEAL_SECONDS * FPS)));
  const searchOpacity = slideK * (1 - (1 - DIM_TO) * revealK);

  // Badge (top right, level with the HUD pill) and chips (right column, above the answer card).
  const col = SLOTS.hint; // right column: x = centre, w = width
  const badgeIn = easeOutCubic(clamp01(frame / (BADGE_SECONDS * FPS)));
  const badgePop = backOut(clamp01(frame / (BADGE_SECONDS * FPS)));
  const chipsTop = col.y;
  const chipsBottom = SLOTS.answer.y - CHIPS_TO_ANSWER_GAP;
  const chipH = (chipsBottom - chipsTop - CHIP_GAP * (plan.options.length - 1)) / plan.options.length;

  // Intro slam: slams in, holds, fades out. Gone (null) once it has faded.
  const introEnd = (INTRO_HOLD_SECONDS + INTRO_OUT_SECONDS) * FPS;
  const slamK = backOut(clamp01(frame / (INTRO_SLAM_SECONDS * FPS)));
  const introLife = 1 - easeOutCubic(clamp01((frame - INTRO_HOLD_SECONDS * FPS) / (INTRO_OUT_SECONDS * FPS)));
  const subK = easeOutCubic(clamp01((frame - INTRO_SUB_DELAY_TICKS) / (INTRO_SLAM_SECONDS * FPS)));
  const intro =
    frame < introEnd ? (
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${INTRO_SCRIM * introLife})` }} />
        <Ring frame={frame} start={0} size={INTRO_RING} style={{ border: `${px(3)}px solid ${accent}` }} />
        <div
          style={{
            position: 'absolute',
            left: 0,
            width: '100%',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: px(10),
            opacity: Math.min(1, frame / 2) * introLife,
          }}
        >
          <div
            style={{
              fontFamily: FONTS.display,
              fontSize: px(INTRO_FONT),
              letterSpacing: px(3),
              color: COLORS.ink,
              textShadow: `0 0 ${px(30)}px ${accent}`,
              whiteSpace: 'nowrap',
              transform: `scale(${INTRO_START_SCALE - (INTRO_START_SCALE - 1) * slamK})`,
            }}
          >
            {bonusHead}
          </div>
          {bonusSub ? (
            <div
              style={{
                fontFamily: FONTS.body,
                fontWeight: 800,
                fontSize: px(INTRO_SUB_FONT),
                letterSpacing: px(1.5),
                color: accent,
                whiteSpace: 'nowrap',
                opacity: subK,
                transform: `translate3d(0, ${px(RISE) * (1 - subK)}px, 0)`,
              }}
            >
              {bonusSub}
            </div>
          ) : null}
        </div>
        <Flash frame={frame} start={0} ms={INTRO_FLASH_MS} peak={INTRO_FLASH_PEAK} />
      </div>
    ) : null;

  // Reveal: a ring leaves the answer card and a soft flash fires as the right chip lights.
  const answerCentre = { x: SLOTS.answer.x, y: SLOTS.answer.y + SLOTS.answer.h / 2 };
  const revealFx = (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: px(answerCentre.x), top: px(answerCentre.y), width: 0, height: 0 }}>
        <Ring
          frame={frame}
          start={plan.revealAt}
          size={SLOTS.answer.w * REVEAL_RING_OF_CARD}
          style={{ border: `${px(3)}px solid ${accent}` }}
        />
      </div>
      <Flash frame={frame} start={plan.revealAt} ms={REVEAL_FLASH_MS} peak={REVEAL_FLASH_PEAK} />
    </div>
  );

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <SearchStage
        theme={BONUS_THEME}
        accent={accent}
        hud={hud}
        search={{
          at: 0,
          children: (r) => (
            <div
              style={{
                opacity: searchOpacity,
                transform: `translate3d(0, ${px(SLIDE_IN_DISTANCE) * (1 - slideK)}px, 0)`,
              }}
            >
              <SearchBar
                searches={plan.searches}
                starts={plan.searchAt}
                typeTicks={plan.typeTicks}
                accent={accent}
                size={r.w}
                at={{ x: r.x, y: r.y }}
              />
            </div>
          ),
        }}
        timer={{
          at: plan.clockStart,
          children: (r) => (
            <TimerBar from={plan.clockStart} duration={plan.clockFrames} accent={accent} size={r.w} at={{ x: r.x, y: r.y }} />
          ),
        }}
        // The hint slot carries the badge and the four chips (a round's hint is not used here).
        hint={{
          children: () => (
            <>
              <div
                style={{
                  position: 'absolute',
                  left: px(col.x - col.w / 2),
                  top: px(SLOTS.hud.y),
                  width: px(col.w),
                  height: px(SLOTS.hud.h),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  ...glass(px(SLOTS.hud.h / 2)),
                  opacity: badgeIn,
                  transform: `translate3d(0, ${px(RISE) * (1 - badgeIn)}px, 0) scale(${BADGE_START_SCALE + (1 - BADGE_START_SCALE) * badgePop})`,
                  fontFamily: FONTS.display,
                  fontSize: px(SLOTS.hud.h * 0.46),
                  letterSpacing: px(1.5),
                  color: accent,
                  whiteSpace: 'nowrap',
                }}
              >
                {cfg.bonus.badgeText}
              </div>
              {plan.options.map((o, i) => {
                const inK = easeOutCubic(clamp01((frame - plan.chipsAt[i]) / (CHIP_SECONDS * FPS)));
                const lit = o.correct;
                const litK = lit ? revealK : 0;
                const dim = lit ? 1 : 1 - (1 - WRONG_CHIP_TO) * revealK;
                const badge = chipH * 0.64;
                return (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      left: px(col.x - col.w / 2),
                      top: px(chipsTop + i * (chipH + CHIP_GAP)),
                      width: px(col.w),
                      height: px(chipH),
                      boxSizing: 'border-box',
                      display: 'flex',
                      alignItems: 'center',
                      gap: px(chipH * 0.28),
                      padding: `0 ${px(chipH * 0.3)}px`,
                      ...glass(px(chipH / 2)),
                      border: `${px(1.5)}px solid ${lit && litK > 0 ? accent : 'rgba(255,255,255,0.16)'}`,
                      background: lit && litK > 0 ? `${accent}${Math.round(litK * 0x40).toString(16).padStart(2, '0')}` : undefined,
                      boxShadow: lit && litK > 0 ? `0 0 ${px(26 * litK)}px ${accent}88` : undefined,
                      opacity: inK * dim,
                      transform: `translate3d(0, ${px(RISE) * (1 - inK)}px, 0)`,
                    }}
                  >
                    <div
                      style={{
                        flex: 'none',
                        width: px(badge),
                        height: px(badge),
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: FONTS.display,
                        fontSize: px(badge * 0.62),
                        background: lit && litK > 0 ? accent : COLORS.glass,
                        color: lit && litK > 0 ? COLORS.inkDark : COLORS.muted,
                        border: `${px(1.5)}px solid ${lit && litK > 0 ? accent : COLORS.stroke}`,
                      }}
                    >
                      {letterOf(i)}
                    </div>
                    <div
                      style={{
                        minWidth: 0,
                        flex: 1,
                        fontFamily: FONTS.body,
                        fontWeight: 600,
                        fontSize: px(chipH * 0.36),
                        color: COLORS.ink,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {o.text}
                    </div>
                  </div>
                );
              })}
            </>
          ),
        }}
        answer={{
          children: (r) => (
            <AnswerCard
              name={plan.answer}
              from={plan.from}
              at={plan.revealAt}
              accent={accent}
              place={{ x: r.x, y: r.y }}
              size={r.w}
            />
          ),
        }}
      />
      {revealFx}
      {intro}
    </div>
  );
};

/** Studio preview of one bonus on its own: reads the clock itself. */
export const SearchBonusPreview: React.FC<{ index: number }> = ({ index }) => {
  const frame = useDesignFrame();
  return <SearchBonus frame={frame} index={index} />;
};

/** Length of one bonus at 60 fps for the preview composition (index clamped into range). */
export const bonusPreviewFrames = (index: number): number =>
  Math.round(buildBonusPlan(Math.max(0, Math.min(BONUS.length - 1, index))).duration * TIME_SCALE);
