import React from 'react';
import { useCurrentFrame } from 'remotion';
import captionData from '../captions.json';
import { colors, fontStack, FRAME, px, SAFE, springAt } from '../system';
import { voiceEvents } from '../voiceTimeline';
import { RENDER_FPS, ticksToFrames } from '../timing';

/**
 * Word-timed captions for the clips that are not already on screen as text (hook, level, reveal, dyk, scorecard,
 * prediction, rank, outro; clues are drawn by ClueStack). Words come from docs/nfl/lines.csv through
 * scripts/make_nfl_captions.py (captions.json); nothing is written here. Placement comes from voiceTimeline.
 *
 * Place (reference units): x inside the centre 80% (SAFE.x), in the strip BELOW the wallet card. The card fills the
 * whole safe box (y 72 to 648), so any caption inside it would sit on the clue field, the answer panel (card name)
 * or the lock footer. The strip is y 650 to 716: clear of the card, of the points pill and ScoreHud (y 4 to 72) and
 * of the watermark (top-left, y 20 to 60). It is 68 units, so the text is 2 lines at most (size 30). That is below
 * the bottom edge of the 80% safe box (648): confirm by eye that a phone's own UI does not hide it.
 */
export const CAPTION_BOX = { left: SAFE.x, width: FRAME.w - SAFE.x * 2, top: 650, height: 66 } as const;
const SIZE = 30;
const MAX_WORDS_PER_PAGE = 8;

type Word = { w: string; start: number; end: number };
type Clips = Record<string, { type: string; words: Word[] }>;
const clips = (captionData as { clips: Clips }).clips;

/** Split into pages of at most MAX_WORDS_PER_PAGE words, closing a page early at sentence or clause punctuation. */
const paginate = (words: Word[]): Word[][] => {
  const pages: Word[][] = [];
  let cur: Word[] = [];
  words.forEach((word, i) => {
    cur.push(word);
    const last = i === words.length - 1;
    if (last || cur.length >= MAX_WORDS_PER_PAGE || (cur.length >= 3 && /[.!?;:,]$/.test(word.w))) {
      pages.push(cur);
      cur = [];
    }
  });
  return pages;
};

const pageCache = new Map<string, Word[][]>();
const pagesOf = (id: string): Word[][] => {
  let p = pageCache.get(id);
  if (!p) pageCache.set(id, (p = paginate(clips[id].words)));
  return p;
};

/** Mount once, in absolute render frames (NFL-Full), above the parts and below the watermark. */
export const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const tick = frame / (RENDER_FPS / 30);
  const ev = voiceEvents.find((e) => clips[e.id] && frame >= ticksToFrames(e.tick) && frame < ticksToFrames(e.tick) + Math.ceil(e.sec * RENDER_FPS));
  if (!ev) return null;
  const t = (frame - ticksToFrames(ev.tick)) / RENDER_FPS; // seconds into the clip
  const pages = pagesOf(ev.id);
  // current page: the last one whose first word has started (before the first word, show page 1)
  let pi = 0;
  pages.forEach((p, i) => { if (t >= p[0].start) pi = i; });
  const page = pages[pi];
  const pageStart = page[0].start;
  const enter = Math.min(1, Math.max(0, (t - pageStart) / 0.12 + 0.0)); // 0.12 s fade-in of each page
  const startTick = (s: number) => ticksToFrames(ev.tick) / (RENDER_FPS / 30) + s * 30;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          left: px(CAPTION_BOX.left),
          top: px(CAPTION_BOX.top),
          width: px(CAPTION_BOX.width),
          height: px(CAPTION_BOX.height),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          opacity: pi === 0 ? 1 : enter,
          fontFamily: fontStack,
          fontSize: px(SIZE),
          fontWeight: 700,
          lineHeight: 1.15,
          color: colors.muted,
          textShadow: `0 ${px(1)}px ${px(6)}px rgba(0,0,0,0.85)`,
          textWrap: 'balance' as React.CSSProperties['textWrap'],
        }}
      >
        <div>
          {page.map((word, i) => {
            const active = t >= word.start && t < word.end + 0.04;
            const past = t >= word.end;
            const pop = active || past ? springAt(tick, startTick(word.start), 'snappy') : 0;
            const lift = active ? 1 : past ? 0.9 : 0; // the word that is being said gets the spring; spoken words settle
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  marginRight: i === page.length - 1 ? 0 : px(8),
                  color: active ? colors.ink : past ? colors.ink : colors.muted,
                  opacity: active || past ? 1 : 0.62,
                  transform: `scale(${active ? 1 + 0.12 * pop : 1}) translateY(${-px(2) * lift * (active ? pop : 0)}px)`,
                  transformOrigin: '50% 80%',
                }}
              >
                {word.w}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};
