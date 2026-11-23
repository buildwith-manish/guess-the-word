/**
 * Preview compositions for the card scene (task 3a). Not part of the video.
 *   NFL-Card      one card, prop `n` (default 1), duration from that card's segment in timing.ts
 *   NFL-Card-All  all cards back to back, in play order, with no hook, level cards or score cards between them
 * Scrub with: npx remotion still NFL-Card out.png --frame=<render frame> --props='{"n":14}'
 * Render frames are at 60 fps (design ticks x 2); `cardMarks(n)` lists the interesting ones.
 */
import React from 'react';
import { Sequence } from 'remotion';
import { cardByN, cards } from './data';
import { CardScene, cardFrames, cardTicks } from './scenes/CardScene';
import { segments, ticksToFrames } from './timing';

export type NflCardPreviewProps = { n: number; /** 3D hero card (WebGL). Default false = the 2D card. */ hero3d?: boolean };
export const PREVIEW_DEFAULTS: NflCardPreviewProps = { n: cards[0].n, hero3d: false };
export const PREVIEW_3D_DEFAULTS: NflCardPreviewProps = { n: cards[0].n, hero3d: true };

/** Duration of one card in render frames. */
export const previewFrames = (n: number): number => cardFrames(cardByN(n));

export const NflCardPreview: React.FC<NflCardPreviewProps> = ({ n, hero3d = false }) => <CardScene card={cardByN(n)} at={0} hero3d={hero3d} />;

/** Render frame (at 60 fps) where each phase of card `n` starts, local to the card. For scrubbing by number. */
export const cardMarks = (n: number) => {
  const card = cardByN(n);
  const seg = segments.find((s) => s.kind === 'card' && s.card.n === card.n);
  if (!seg || seg.kind !== 'card') throw new Error(`preview: no segment for card ${n}`);
  const at = (t: number) => ticksToFrames(t - seg.from);
  return {
    intro: at(seg.phases.intro.from),
    clue: seg.phases.clues.map((r) => at(r.from)),
    beat: at(seg.phases.beat.from),
    reveal: at(seg.phases.reveal.from),
    dyk: seg.phases.dyk ? at(seg.phases.dyk.from) : undefined,
    last: ticksToFrames(cardTicks(card)) - 1,
  };
};

/** Every card back to back. */
export const ALL_FRAMES: number = cards.reduce((sum, c) => sum + cardFrames(c), 0);

export const NflCardPreviewAll: React.FC = () => {
  let from = 0;
  return (
    <>
      {cards.map((card) => {
        const start = from;
        from += cardFrames(card);
        return (
          <Sequence key={card.n} from={start} durationInFrames={cardFrames(card)} layout="absolute-fill">
            <CardScene card={card} at={0} />
          </Sequence>
        );
      })}
    </>
  );
};
