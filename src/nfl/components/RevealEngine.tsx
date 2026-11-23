import React from 'react';
import { cards, dykText, sourceName, type Card } from '../data';
import { DidYouKnowCard } from '../shared/DidYouKnowCard';
import { NotificationBanner } from '../shared/NotificationBanner';
import { cue, type SfxCue } from '../sfx';
import { FRAME, SPRINGS, colors, fontStack, px, springAt, textStyle } from '../system';
import { FPS, clipSec, dykTailSec, levelNames, secToTicks, segments, useClipTimings } from '../timing';
import { WalletCard, type StackCorner } from './WalletCard';

/**
 * Reveal for one card, from the silence beat after clue 5 to the end of the reveal slot (both from timing.ts).
 * `frame` is local to the engine: 0 = the first tick of the beat. Nothing here is a typed duration: slot lengths come from
 * timing.ts (clip lengths once measured), motion lengths from the spring presets in system.ts.
 *
 *   beat      lock shakes, everything frozen (the caller freezes the clue stack and passes it as `frozen`)
 *   open      lock opens, the answer panel flips, the name-reveal chime plays
 *   name      the name appears big and centred in the field, then the reveal line and the SourceLine
 *   dyk       cards with a did-you-know line: the solved card slides into the Wallet stack and the chip takes the centre until
 *             its clip ends plus dykTailSec; cards without one stack at the end of the slot
 *   banner    a banner peeks in at the end with the next card number (the level name, blurred, when the level changes)
 */
export type RevealBeats = {
  /** Tick the lock opens and the card flips (end of the beat). */
  open: number;
  /** Tick the name starts to appear. */
  name: number;
  /** Tick the SourceLine starts to appear. */
  source: number;
  /** Tick the solved card starts to slide into the stack. */
  stack: number;
  /** Ticks the slide takes. */
  stackTicks: number;
  /** Did-you-know chip: first tick and ticks on screen (clip + dykTailSec). Undefined when the card has none. */
  dyk?: { at: number; dur: number };
  /** Tick the next-card banner starts to slide in. */
  banner: number;
  /** Length of the whole engine (beat + reveal slot) in ticks. */
  end: number;
};

const cardSegment = (card: Card) => {
  const seg = segments.find((s) => s.kind === 'card' && s.card.n === card.n);
  if (!seg || seg.kind !== 'card') throw new Error(`reveal: no timeline segment for card ${card.n}`);
  return seg;
};

const ticksOf = (sec: number): number => Math.round(sec * FPS);

/** All beats in ticks from the start of the silence beat. */
export const revealBeats = (card: Card): RevealBeats => {
  const { phases } = cardSegment(card);
  const t0 = phases.beat.from;
  const open = phases.reveal.from - t0;
  const end = phases.reveal.to - t0;
  const stackTicks = ticksOf(SPRINGS.gentle);
  const name = open + ticksOf(SPRINGS.slow / 2); // the back of the panel turns up at about half the flip
  const source = name + ticksOf(SPRINGS.snappy);
  let dyk: RevealBeats['dyk'];
  let stack = end - stackTicks;
  if (phases.dyk) {
    const clip = useClipTimings ? clipSec('dyk', String(card.n)) : undefined;
    const at = phases.dyk.from - t0;
    dyk = { at, dur: clip !== undefined ? secToTicks(clip + dykTailSec) : phases.dyk.to - phases.dyk.from };
    stack = at; // the card leaves as the chip arrives
  }
  return { open, name, source, stack, stackTicks, dyk, banner: end - stackTicks, end };
};

/** Cues for the audio layer, `start` = the tick the engine's first frame (the beat) sits at in the caller's clock. */
export const revealCues = (card: Card, start: number): SfxCue[] => {
  const b = revealBeats(card);
  const hasNext = cards.some((c) => c.n === card.n + 1);
  const out: SfxCue[] = [
    cue('lock-shake', start),
    cue('lock-open', start + b.open),
    cue('name-reveal', start + b.name),
    cue('wallet-stack', start + b.stack),
  ];
  if (hasNext) out.push(cue('notification', start + b.banner));
  return out.sort((a, b2) => a.frame - b2.frame);
};

/** Source of the facts, from cards.json meta. Draws nothing until `sourceName` is set. */
export const SourceLine: React.FC<{ opacity: number; label?: string }> = ({ opacity, label }) => {
  if (!sourceName) return null;
  return (
    <div style={{ ...textStyle('caption'), color: colors.muted, textAlign: 'center', opacity }}>{label ? `${label} ${sourceName}` : sourceName}</div>
  );
};

export type RevealEngineProps = {
  card: Card;
  /** Local design tick: 0 = start of the silence beat. */
  frame: number;
  /** The clue stack, already frozen at clue 5 by the caller. It fades out as the name appears. */
  frozen?: React.ReactNode;
  /** Jersey number for the open face. cards.json has no jersey field yet: undefined leaves it out. */
  jersey?: string | number;
  /** Position in the Wallet stack: 0 = newest, on top. */
  stackIndex?: number;
  corner?: StackCorner;
  /** Optional word in front of the source name. */
  sourceLabel?: string;
};

export const RevealEngine: React.FC<RevealEngineProps> = ({ card, frame, frozen, jersey, stackIndex = 0, corner, sourceLabel }) => {
  const b = revealBeats(card);
  const next = cards.find((c) => c.n === card.n + 1);

  const state = frame >= b.stack ? 'stacked' : frame >= b.open ? 'open' : 'locked';
  const since = state === 'stacked' ? b.stack : state === 'open' ? b.open : 0;

  const nameP = springAt(frame, b.name, 'gentle');
  const sourceP = springAt(frame, b.source, 'gentle');
  const revealText = [card.revealLine, card.revealExtra].filter((s): s is string => !!s).join(' ');
  const dyk = dykText(card);

  // banner: the next card number, or the level name (blurred) when the level changes
  const levelChange = next !== undefined && next.level !== card.level;
  const bannerTitle = next === undefined ? undefined : levelChange ? levelNames[next.level] : `${next.n} / ${cards.length}`;

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <WalletCard card={card} state={state} frame={frame} since={since} jersey={jersey} stackIndex={stackIndex} corner={corner} showName={false}>
        <div style={{ position: 'absolute', inset: 0 }}>
          {frozen !== undefined && <div style={{ position: 'absolute', inset: 0, opacity: 1 - nameP }}>{frozen}</div>}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              gap: px(14),
              paddingBottom: px(36),
              opacity: nameP,
              transform: `translateY(${(1 - nameP) * px(24)}px) scale(${0.92 + 0.08 * nameP})`,
            }}
          >
            <div style={{ ...textStyle('title'), fontSize: px(88), fontWeight: 800, color: colors.ink, textWrap: 'balance' as React.CSSProperties['textWrap'] }}>{card.name}</div>
            {revealText !== '' && <div style={{ ...textStyle('body'), color: colors.muted, fontFamily: fontStack }}>{revealText}</div>}
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
            <SourceLine opacity={sourceP} label={sourceLabel} />
          </div>
        </div>
      </WalletCard>

      {b.dyk && dyk !== undefined && (
        <DidYouKnowCard
          text={dyk}
          frame={frame}
          at={b.dyk.at}
          dur={b.dyk.dur}
          outTicks={secToTicks(dykTailSec)}
          level={card.level}
          left={(FRAME.w - 640) / 2}
          top={FRAME.h / 2 - 100}
          width={640}
        />
      )}

      {bannerTitle !== undefined && (
        <NotificationBanner title={bannerTitle} frame={frame} at={b.banner} dur={b.stackTicks} level={next?.level} blur={levelChange ? 6 : 0} />
      )}
    </div>
  );
};
