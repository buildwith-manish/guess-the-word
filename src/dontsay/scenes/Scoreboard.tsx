/**
 * Scoreboard.tsx: the ~20 s rank ladder for "Don't Say The Same As Me" (task 4g).
 *
 * Five rank bands climb a ladder, lowest rank first, lighting one at a time from the bottom of
 * the frame to the top; each stays lit once it lands, so by the end the whole ladder glows.
 * Each band is paired with its own spoken line ("Zero to fifteen: Echo." ... up to "Forty-six
 * or more: One of a Kind."). Every number in those lines comes from the rank's own min/max/name
 * in data.ts (`ranks`) through `rankVoiceLine` (components/rankWords.ts) — nothing here is a
 * literal number. The name and range are also drawn on the band itself, so each line is read
 * and shown at the same time it is spoken.
 *
 * `scoreboardSec` (20 s) splits evenly across `ranks.length` (5): 4 s per band. That split
 * comes from the two numbers, not from a hard-coded "4". The wallpaper is level 1 (cool blue):
 * by this point every bonus has run and it has already returned there.
 *
 * Sizes are 1280x720 reference units through px(), matching Outro.tsx / RankCard.tsx.
 */
import React from 'react';
import { AbsoluteFill, Audio, Sequence } from 'remotion';
import { ranks } from '../data';
import { TIME_SCALE, WIDTH, scoreboardSec, secToTicks, ticksToFrames, useDontSayFrame } from '../timing';
import { colours, fontHeadline, fontNumeric, levelBackground, springAt } from '../system';
import { clamp01 } from '../shared/fade';
import { rankVoiceLine } from '../components/rankWords';
import { sfxSrc } from '../sfx';
import type { SfxId } from '../sfx';
import '../shared/fonts';

const px = (v: number): number => (v * WIDTH) / 1280;

const TOTAL_TICKS = secToTicks(scoreboardSec);
/** One slot per rank; the split comes from the two numbers above, not a literal. */
const SLOT_TICKS = Math.floor(TOTAL_TICKS / ranks.length);
/** Ticks into a slot before that band's light-up spring starts. */
const LEAD = 6;

/** Tick each band starts lighting, lowest rank (index 0) first. */
export const scoreboardBandAt: number[] = ranks.map((_, i) => i * SLOT_TICKS + LEAD);

export const scoreboardFrames = (): number => ticksToFrames(TOTAL_TICKS);

export type ScoreboardCue = { name: string; id: SfxId; tick: number; volume: number };
/** chip-land for each band; the last (highest) band gets the stronger rank-reveal sting. */
export const scoreboardCues = (): ScoreboardCue[] =>
  ranks.map((r, i) => {
    const isTop = i === ranks.length - 1;
    return { name: `band-${i + 1}`, id: (isTop ? 'rank-reveal' : 'chip-land') as SfxId, tick: scoreboardBandAt[i], volume: isTop ? 0.9 : 0.6 };
  });

/** One spoken line per rank, lowest first, timed to when that band lights. Clip ids are a guess. */
export const scoreboardVoice = (): { text: string; tick: number; clipId: string }[] =>
  ranks.map((r, i) => ({
    text: rankVoiceLine(r, i === ranks.length - 1),
    tick: scoreboardBandAt[i],
    clipId: `scoreboard_${i + 1}`,
  }));

const ROW_H = 96;
const ROW_GAP = 22;

export type ScoreboardProps = { frame?: number };

export const Scoreboard: React.FC<ScoreboardProps> = ({ frame: frameProp }) => {
  const clock = useDontSayFrame();
  const frame = frameProp ?? clock;

  const rows = ranks.length;
  const ladderH = rows * ROW_H + (rows - 1) * ROW_GAP;

  // Ladder reads top-to-bottom as highest-to-lowest (climbing up); `ranks` itself is lowest-first.
  const ordered = ranks.map((r, i) => ({ r, i })).slice().reverse();

  return (
    <AbsoluteFill style={{ background: levelBackground[1] }}>
      <div
        style={{
          position: 'absolute',
          left: px(128),
          right: px(128),
          top: `calc(50% - ${px(ladderH / 2)}px)`,
          height: px(ladderH),
          display: 'flex',
          flexDirection: 'column',
          gap: px(ROW_GAP),
        }}
      >
        {ordered.map(({ r, i }) => {
          const at = scoreboardBandAt[i];
          const lit = clamp01(springAt(frame, at, 'pop'));
          const accent = colours.level[(i + 1) as 1 | 2 | 3 | 4 | 5];
          const isTop = i === ranks.length - 1;
          const on = lit > 0.05;
          return (
            <div
              key={r.name}
              style={{
                height: px(ROW_H),
                borderRadius: px(28),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: `0 ${px(42)}px`,
                background: `rgba(255,255,255,${0.04 + 0.1 * lit})`,
                border: `${px(1.5)}px solid ${on ? `${accent}AA` : colours.hairline}`,
                boxShadow: on
                  ? `0 0 ${px(44 * lit)}px ${accent}66, inset 0 ${px(1)}px 0 rgba(255,255,255,0.3)`
                  : 'none',
                transform: `scale(${0.97 + 0.03 * lit})`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: px(26) }}>
                <div style={{ width: px(16), height: px(16), borderRadius: px(8), background: on ? accent : colours.mutedStrong }} />
                <div
                  style={{
                    fontFamily: fontHeadline,
                    fontWeight: 800,
                    fontSize: px(42),
                    letterSpacing: '-0.01em',
                    color: on ? colours.ink : colours.muted,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {r.name}
                </div>
              </div>
              <div
                style={{
                  fontFamily: fontNumeric,
                  fontWeight: 800,
                  fontSize: px(36),
                  color: on ? colours.ink : colours.mutedStrong,
                  fontVariantNumeric: 'tabular-nums',
                  whiteSpace: 'nowrap',
                }}
              >
                {isTop ? `${r.min}+` : `${r.min}–${r.max}`}
              </div>
            </div>
          );
        })}
      </div>

      {scoreboardCues().map((c) => (
        <Sequence key={c.name} from={Math.round(c.tick * TIME_SCALE)} layout="none">
          <Audio src={sfxSrc(c.id)} volume={c.volume} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
