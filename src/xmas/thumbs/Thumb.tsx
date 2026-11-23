import React from 'react';
import { AbsoluteFill } from 'remotion';
import { GlassTile } from '../components/GlassTile';
import { meta, slots } from '../data';
import { backgroundStyle, colors, fontStack, px, useXmasFonts, weights } from '../system';

/**
 * Thumbnails (task 7a). The stills are 1280x720 real pixels (a normal image size). GlassTile and system.ts work in
 * reference units through px() (1 unit = 2 px), so the layout is authored on a 2560x1440 stage and scaled by 0.5.
 * Numbers come from data.ts meta; clue ids come from data.ts slots. Nothing here names a movie.
 */
type Line = { t: string; gold?: boolean }[];
export type ThumbSpec = { clue: [string, string]; lines: Line[]; fontSize: number };

const clueOf = (slot: number, which: 1 | 2): string => {
  const s = slots.find((x) => x.slot === slot);
  if (!s || s.kind !== 'movie') throw new Error(`thumbnail: slot ${slot} is not a movie slot`);
  return (which === 1 ? s.clue1 : s.clue2).id;
};

export const THUMBS = {
  A: { clue: [clueOf(2, 1), clueOf(3, 2)], fontSize: 104, lines: [[{ t: String(meta.totalSlots), gold: true }, { t: ' QUESTIONS?' }]] },
  B: { clue: [clueOf(1, 1), clueOf(1, 2)], fontSize: 112, lines: [[{ t: "WHAT'S YOUR" }], [{ t: 'SCORE?', gold: true }]] },
  C: { clue: [clueOf(13, 1), clueOf(13, 2)], fontSize: 112, lines: [[{ t: `${meta.movieSlots} MOVIES` }], [{ t: `+ ${meta.bonusSlots} BONUS`, gold: true }]] },
} as const satisfies Record<string, ThumbSpec>;
export type ThumbId = keyof typeof THUMBS;

const TILE = 300;
const GAP = 44;
const TILE_TOP = 392;

export const Thumb: React.FC<{ id: ThumbId }> = ({ id }) => {
  useXmasFonts();
  const spec: ThumbSpec = THUMBS[id];
  const x0 = (1280 - (TILE * 2 + GAP)) / 2;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: '#000' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 2560, height: 1440, transform: 'scale(0.5)', transformOrigin: '0 0', ...backgroundStyle() }}>
        {/* extra light so the thumbnail reads bright at small sizes */}
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(60% 50% at 25% 75%, ${colors.greenGlow}, transparent 70%), radial-gradient(60% 50% at 75% 75%, ${colors.redGlow}, transparent 70%), radial-gradient(70% 45% at 50% 0%, rgba(255,255,255,0.16), transparent 70%)` }} />
        <div style={{ position: 'absolute', left: 0, width: px(1280), top: px(36), height: px(TILE_TOP - 60), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: px(4) }}>
          {spec.lines.map((line, i) => (
            <div key={i} style={{ fontFamily: fontStack, fontWeight: weights.bold, fontSize: px(spec.fontSize), lineHeight: 1.02, letterSpacing: '-0.02em', whiteSpace: 'nowrap', color: '#FFFFFF', textShadow: `0 ${px(5)}px 0 rgba(0,0,0,0.55), 0 0 ${px(30)}px rgba(0,0,0,0.5)` }}>
              {line.map((seg, j) => (
                <span key={j} style={seg.gold ? { color: colors.gold } : undefined}>
                  {seg.t}
                </span>
              ))}
            </div>
          ))}
        </div>
        {([['left', spec.clue[0], x0], ['right', spec.clue[1], x0 + TILE + GAP]] as const).map(([side, clue, x]) => (
          <div key={side} style={{ position: 'absolute', left: px(x), top: px(TILE_TOP) }}>
            <GlassTile imageId={clue} side={side} size={TILE} />
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
export default Thumb;
