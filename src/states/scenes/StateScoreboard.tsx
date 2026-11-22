/**
 * StateScoreboard (task 5a): the final scoreboard of Video 4.
 * The completed US map lights up (all 50 states, each in its level colour), then the five ranks drop in from the
 * bottom so LEGEND lands last, then the closing line. Adapted from src/Scoreboard.tsx (row drop, legend glow,
 * confetti); the rank table (names, emoji, colour, score ranges) comes from states-settings.json `ranks`, the
 * map from MiniMap, the score total from state-timing TOTAL.
 *
 * Beats (design ticks from the start of the scoreboard segment). They match the assumption in state-timing
 * `scoreboardFrames()` (rows from tick 46, 22 ticks apart, voiceover after the rows + 10):
 *   6             kicker in
 *   14 .. 50      map in, the 50 states light one after another
 *   46 + k * 22   rank row drops in, k = 0 for KEEP GOING (bottom) up to LEGEND (top, last)
 *   legendAt      LEGEND row lands (+21 after its drop starts): glow pulse + confetti
 *   legendAt + 8  closing line
 * Voiceover: `scoreboardVoicePlan()` gives each clip's start tick (intro, legend, expert, good, beginner, keepgoing,
 * sequential, 4 ticks apart, only for clips in the manifest). The row of the rank being spoken is lit while its clip
 * plays. The segment length comes from state-timing (it grows with the clips); this scene does not change it.
 *
 * iOS look: calm backdrop, Inter, frosted rows that settle on the shared spring; LEGEND is the brightest row (no glow
 * pulse, no confetti). Beats, cues and voiceover plan are unchanged.
 *
 * Time: `frame` = design ticks (30 per second) since the segment started. Not rendered or viewed.
 */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Rich } from '../../Icon';
import { px } from '../../style';
import { IOS, IosBackground } from '../../ios';
import { spr } from '../motion';
import { RADIUS, glassPanel } from '../look';
import { clamp01 } from '../../anim';
import { rise } from '../ios-rise';
import settings from '../states-settings.json';
import { LEVELS, TOTAL, voiceScoreboard } from '../state-timing';
import { STATES } from '../states-data';
import { MiniMap, miniMapHeight } from '../components/MiniMap';
import type { StateCue, StateSfx } from './stateRoundCues';

// ------------------------------------------------------------------ data and copy
type RankRow = { id: string; name: string; emoji: string; color: string; range: string };

/** Ranks top to bottom with their score range "min-max" out of TOTAL (max = TOTAL for the top rank, else the rank above's min - 1). */
const RANKS: RankRow[] = settings.ranks.map((r, i, all) => {
  const max = i === 0 ? TOTAL : all[i - 1].min - 1;
  return { id: r.id, name: r.name, emoji: r.emoji, color: r.color, range: `${r.min}–${max}` };
});

/** Copy (not data). */
const COPY = {
  kicker: 'YOUR FINAL SCORE',
  title: 'HOW DID',
  titleAccent: 'YOU DO?',
  footer: `Where did you land? Comment your score out of ${TOTAL}`,
};

// ------------------------------------------------------------------ timing
export const SB = {
  kickerAt: 6,
  mapAt: 14,
  litAt: 14,
  litDur: 36,
  /** the first row (bottom) and the step, same numbers as state-timing scoreboardFrames() */
  rowBase: 46,
  step: 22,
  rowDur: 20,
  /** the LEGEND row lands this long after its drop starts */
  landAfter: 21,
  footerAfter: 8,
  /** voiceover starts this long after the last row's slot */
  voiceGap: 10,
  clipGap: 4,
};

const rowStart = (i: number): number => SB.rowBase + (RANKS.length - 1 - i) * SB.step;
export const legendLandsAt = (): number => rowStart(0) + SB.landAfter;

/** Clip order: the intro, then the ranks top to bottom (manifest keys are the lowercase rank ids). */
const VOICE_KEYS = ['intro', ...RANKS.map((r) => r.id.toLowerCase())];

export type ScoreboardVoice = { key: string; file: string; frames: number; /** tick from the start of the segment */ start: number };

/** Voiceover clips that exist in the manifest, one after another from the end of the rows. Empty when there are none. */
export const scoreboardVoicePlan = (): ScoreboardVoice[] => {
  const plan: ScoreboardVoice[] = [];
  let t = SB.rowBase + RANKS.length * SB.step + SB.voiceGap;
  for (const key of VOICE_KEYS) {
    const clip = voiceScoreboard(key);
    if (!clip) continue;
    plan.push({ key, file: clip.file, frames: clip.frames, start: Math.round(t) });
    t += clip.frames + SB.clipGap;
  }
  return plan;
};

// ------------------------------------------------------------------ cues
/** Cues of the scoreboard, ticks from the start of the segment (absolute tick = seg.from + cue.frame). Voiceover is in scoreboardVoicePlan(). */
export const stateScoreboardCues = (): StateCue[] => {
  const cues: StateCue[] = [];
  const add = (frame: number, sfx: StateSfx, extra: Partial<StateCue> = {}) => cues.push({ frame: Math.round(frame), sfx, ...extra });
  add(0, 'whoosh');
  add(SB.mapAt, 'pop');
  add(SB.litAt + SB.litDur, 'thump');
  RANKS.forEach((_, i) => {
    add(rowStart(i), 'row', { rate: (330 + (RANKS.length - 1 - i) * 110) / 330 });
  });
  add(legendLandsAt(), 'legend');
  return cues.sort((a, b) => a.frame - b.frame);
};

// ------------------------------------------------------------------ layout (1280x720 reference px, px() scales it)
const LAYOUT = {
  kickerTop: 34,
  titleTop: 58,
  contentTop: 190,
  mapLeft: 44,
  mapW: 560,
  tableLeft: 656,
  rowW: 580,
  rowH: 58,
  rowGap: 12,
  footerBottom: 52,
};

// ------------------------------------------------------------------ scene
const ALL_KEYS = STATES.map((s) => s.key);

export const StateScoreboard: React.FC<{ frame: number }> = ({ frame }) => {
  const L = LAYOUT;
  const last = LEVELS[LEVELS.length - 1];
  const kicker = rise(frame, SB.kickerAt, 14, 16);
  const title = rise(frame, SB.kickerAt + 8, 16, 24);
  const legendAt = legendLandsAt();
  const footer = rise(frame, legendAt + SB.footerAfter, 16, 18);

  // map: states light in order over litDur ticks
  const mapP = spr(frame, SB.mapAt, 'normal');
  const lit = Math.floor(clamp01((frame - SB.litAt) / SB.litDur) * ALL_KEYS.length);
  const answered = ALL_KEYS.slice(0, lit);
  const mapW = px(L.mapW);
  const mapH = miniMapHeight(mapW);
  const tableH = RANKS.length * L.rowH + (RANKS.length - 1) * L.rowGap;
  // vertical centring of both blocks in the content area
  const areaH = 720 - L.contentTop - 120;
  const mapTop = L.contentTop + Math.max(0, (areaH - mapH / px(1)) / 2);
  const tableTop = L.contentTop + Math.max(0, (areaH - tableH) / 2);

  // which rank is being spoken (its clip is playing)
  const spoken = scoreboardVoicePlan().find((v) => frame >= v.start && frame < v.start + v.frames)?.key;

  return (
    <AbsoluteFill style={{ fontFamily: IOS.font }}>
      <IosBackground accent={last.accent} />

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: px(L.kickerTop),
          textAlign: 'center',
          fontWeight: IOS.weight.semibold,
          fontSize: px(24),
          letterSpacing: px(2),
          color: IOS.color.secondary,
          opacity: kicker.opacity,
          transform: kicker.transform,
        }}
      >
        {COPY.kicker}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: px(L.titleTop),
          textAlign: 'center',
          fontWeight: IOS.weight.bold,
          fontSize: px(64),
          lineHeight: 1.1,
          letterSpacing: px(-1),
          color: IOS.color.label,
          opacity: title.opacity,
          transform: title.transform,
        }}
      >
        {COPY.title} <span style={{ color: last.accent }}>{COPY.titleAccent}</span>
      </div>

      {frame >= SB.mapAt ? (
        <div
          style={{
            position: 'absolute',
            left: px(L.mapLeft),
            top: px(mapTop),
            width: mapW,
            height: mapH,
            opacity: Math.min(1, mapP * 1.4),
            transform: `translateY(${(1 - mapP) * px(24)}px)`,
          }}
        >
          <MiniMap answered={answered} size={mapW} frame={frame} />
        </div>
      ) : null}

      <div style={{ position: 'absolute', left: px(L.tableLeft), top: px(tableTop), display: 'flex', flexDirection: 'column', gap: px(L.rowGap) }}>
        {RANKS.map((r, i) => {
          const at = rowStart(i);
          const p = spr(frame, at, 'quick');
          const isTop = i === 0;
          const speaking = spoken === r.id.toLowerCase();
          const bright = (isTop && frame >= legendAt) || speaking;
          return (
            <div
              key={r.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: px(18),
                width: px(L.rowW),
                height: px(L.rowH),
                padding: `0 ${px(26)}px`,
                ...glassPanel(px(RADIUS.chip), r.color, 0.5),
                borderColor: bright ? r.color : IOS.color.fillStrong,
                opacity: Math.min(1, p * 1.4),
                transform: `translateY(${(1 - p) * px(28)}px)`,
              }}
            >
              <span style={{ fontSize: px(34), lineHeight: 1, display: 'inline-flex', alignItems: 'center' }}>
                <Rich size={px(34)} style={{ verticalAlign: 'middle', margin: 0 }}>
                  {r.emoji}
                </Rich>
              </span>
              <span style={{ fontWeight: IOS.weight.semibold, fontSize: px(32), flex: 1, textAlign: 'left', color: IOS.color.label, whiteSpace: 'nowrap' }}>
                {r.name}
              </span>
              <span style={{ fontWeight: IOS.weight.medium, fontSize: px(24), color: IOS.color.secondary, whiteSpace: 'nowrap' }}>{r.range}</span>
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: px(L.footerBottom),
          textAlign: 'center',
          fontWeight: IOS.weight.medium,
          fontSize: px(26),
          color: IOS.color.secondary,
          opacity: footer.opacity,
          transform: footer.transform,
        }}
      >
        {COPY.footer}
      </div>
    </AbsoluteFill>
  );
};
