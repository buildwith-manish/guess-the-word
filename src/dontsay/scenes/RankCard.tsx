/**
 * RankCard.tsx: the single Wallet-pass rank card for "Don't Say The Same As Me" (task 4g).
 *
 * One card, all five ranks (name + score range), screenshot-ready: nothing else is drawn on
 * screen, so a still of this frame is clean. The card springs in once, in well under a second,
 * then holds completely still for the rest of `rankCardSec` (6 s) — that still hold is the
 * intended screenshot. The wallpaper is level 1 (cool blue): after the last bonus it has
 * already returned there (decision: wallpaper follows LEVEL, and part 6 has none).
 *
 * Rank names and score ranges come straight from data.ts (`ranks`); nothing on the card is a
 * literal number. The voice line's number is computed too: "That was all <N>. Add up your
 * points." where <N> is `rounds.length + bonuses.length` (today 45 + 5 = 50), spelled out by
 * `numberWords` — never written here as "fifty".
 *
 * Sizes are 1280x720 reference units through px(), matching Outro.tsx / LevelCard.tsx.
 */
import React from 'react';
import { AbsoluteFill, Audio, Sequence } from 'remotion';
import { bonuses, ranks, rounds } from '../data';
import { TIME_SCALE, WIDTH, rankCardSecFor, secToTicks, ticksToFrames, useDontSayFrame } from '../timing';
import { colours, fontHeadline, fontNumeric, levelBackground, springAt } from '../system';
import { clamp01 } from '../shared/fade';
import { numberWords } from '../components/rankWords';
import { sfxSrc } from '../sfx';
import type { SfxId } from '../sfx';
import '../shared/fonts';

/** 1280x720 reference units -> render pixels (2560x1440). */
const px = (v: number): number => (v * WIDTH) / 1280;

const COPY = { header: 'Your Rank' } as const;

/** Total points on offer: 45 rounds + 5 bonuses, computed — never written as a literal. */
const TOTAL_POINTS = rounds.length + bonuses.length;

export type RankCardCue = { name: string; id: SfxId; tick: number; volume: number };
export const rankCardCues = (): RankCardCue[] => [{ name: 'card-in', id: 'rank-reveal', tick: 0, volume: 0.85 }];

/** Tick the spring is effectively settled: the first tick of the still 6 s hold (an estimate — the 'pop' preset is not sampled here). */
export const RANK_CARD_SETTLE_TICK = 20;
export const rankCardFrames = (): number => ticksToFrames(secToTicks(rankCardSecFor()));

const glass = (radius: number, alpha = 0.12): React.CSSProperties => ({
  boxSizing: 'border-box',
  borderRadius: px(radius),
  background: `linear-gradient(160deg, rgba(255,255,255,${alpha + 0.08}), rgba(255,255,255,${alpha * 0.45}))`,
  border: `${px(0.5)}px solid ${colours.hairlineBright}`,
  backdropFilter: `blur(${px(40)}px) saturate(1.8)`,
  WebkitBackdropFilter: `blur(${px(40)}px) saturate(1.8)`,
  boxShadow: [
    `inset 0 ${px(1)}px 0 rgba(255,255,255,0.4)`,
    `0 ${px(20)}px ${px(60)}px ${colours.shadow}`,
    `0 ${px(6)}px ${px(16)}px ${colours.shadowSoft}`,
  ].join(', '),
});

const ROW_H = 94;
const ROW_GAP = 16;

export type RankCardProps = { frame?: number };

export const RankCard: React.FC<RankCardProps> = ({ frame: frameProp }) => {
  const clock = useDontSayFrame();
  const frame = frameProp ?? clock;
  const p = clamp01(springAt(frame, 0, 'pop'));

  const CARD_W = 760;
  const CARD_H = 118 + ranks.length * ROW_H + (ranks.length - 1) * ROW_GAP + 36;

  return (
    <AbsoluteFill style={{ background: levelBackground[1] }}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            position: 'relative',
            width: px(CARD_W),
            height: px(CARD_H),
            opacity: p,
            transform: `scale(${0.92 + 0.08 * p}) translateY(${(1 - p) * px(24)}px)`,
            ...glass(44, 0.1),
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* header: generic pass label, no game data owned here beyond the layout */}
          <div style={{ padding: `${px(30)}px ${px(46)}px ${px(16)}px` }}>
            <div
              style={{
                fontFamily: fontHeadline,
                fontWeight: 800,
                fontSize: px(32),
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: colours.muted,
              }}
            >
              {COPY.header}
            </div>
          </div>

          {/* perforation divider, like a wallet pass stub */}
          <div style={{ margin: `0 ${px(46)}px` }}>
            <div style={{ borderTop: `${px(2)}px dashed ${colours.hairlineBright}` }} />
          </div>

          {/* one row per rank, lowest first, from data.ts */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: px(ROW_GAP),
              padding: `${px(24)}px ${px(46)}px`,
            }}
          >
            {ranks.map((r, i) => {
              const accent = colours.level[(i + 1) as 1 | 2 | 3 | 4 | 5];
              const isTop = i === ranks.length - 1;
              return (
                <div
                  key={r.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: px(22),
                    height: px(ROW_H),
                    borderRadius: px(22),
                    background: `${accent}22`,
                    borderLeft: `${px(6)}px solid ${accent}`,
                    padding: `0 ${px(28)}px`,
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      fontFamily: fontHeadline,
                      fontWeight: 800,
                      fontSize: px(38),
                      letterSpacing: '-0.01em',
                      color: colours.ink,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {r.name}
                  </div>
                  <div
                    style={{
                      fontFamily: fontNumeric,
                      fontWeight: 800,
                      fontSize: px(34),
                      color: colours.muted,
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
        </div>
      </div>

      {rankCardCues().map((c) => (
        <Sequence key={c.name} from={Math.round(c.tick * TIME_SCALE)} layout="none">
          <Audio src={sfxSrc(c.id)} volume={c.volume} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
