/**
 * MessagesLook (task 3a): a chat. Typing dots, then the question as a plain bubble, then the four options as
 * reply chips (ChoiceChip) staggering in. Chips tremble in the last seconds of the timer. The reveal is
 * RevealEngine in "fast" mode. Green accent: the look always uses the easy (green) level colour.
 *
 * Props are the shell's context (QuestionShell passes `{...ctx}`): item and phase info only. All text comes
 * from `item`. The look has no text of its own.
 *
 * The beat lengths below are written in seconds and converted with `secToTicks`; they are specific to this
 * look and have no home in timing.ts. They are the only numbers of this kind in the file.
 */
import React from 'react';
import { FRAME, SAFE, colors, textStyle, u } from '../../system';
import { secToTicks } from '../../timing';
import { ChoiceChip, FrostCard, RevealEngine, presence } from '../../components';
import { SLOTS } from '../../components/QuestionShell';
import type { ShellContext } from '../../components/QuestionShell';

export type MessagesLookProps = Pick<ShellContext, 'item' | 'phase' | 'localFrame' | 'phases' | 'revealFrom'>;

/** Seconds. */
export const MESSAGES = {
  dotsSec: 0.8, // typing dots on screen before the bubble
  dotsPeriodSec: 0.9, // one wave of the three dots
  staggerSec: 0.1, // gap between reply chips
  trembleSec: 2, // chips tremble over the last seconds of the timer
  notesOutSec: 0.3, // notes card spring-out at the end of the did-you-know phase
} as const;

const GREEN = 'easy' as const;
const BUBBLE = { left: SLOTS.questionLeft, top: SAFE.top, width: 900 }; // right of the score counter (top-left corner)
const CHIPS = { left: SAFE.x, width: 1000, height: 112, gap: 16 };

const dotsFor = (frame: number, at: number) => {
  const period = secToTicks(MESSAGES.dotsPeriodSec);
  return [0, 1, 2].map((i) => 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(2 * Math.PI * ((frame - at) / period - i / 3))));
};

export const MessagesLook: React.FC<MessagesLookProps> = ({ item, phase, localFrame, phases, revealFrom }) => {
  const dotsAt = phases.read.from;
  const bubbleAt = dotsAt + secToTicks(MESSAGES.dotsSec);
  const chipsAt = bubbleAt + secToTicks(MESSAGES.staggerSec);
  const stagger = secToTicks(MESSAGES.staggerSec);
  const trembleAt = Math.max(phases.timer.from, phases.timer.to - secToTicks(MESSAGES.trembleSec));
  const trembling = phase === 'timer' && localFrame >= trembleAt;

  const showDots = localFrame >= dotsAt && localFrame < bubbleAt;
  const showBubble = localFrame >= bubbleAt;
  const chipsTop = FRAME.h - SAFE.bottom - (4 * CHIPS.height + 3 * CHIPS.gap);

  return (
    <>
      {phases.dyk && localFrame >= phases.dyk.from && localFrame < phases.dyk.to ? <NotesCard frame={localFrame} at={phases.dyk.from} dur={phases.dyk.to - phases.dyk.from} /> : null}

      {showDots ? (
        <div style={{ position: 'absolute', left: u(BUBBLE.left), top: u(BUBBLE.top) }}>
          <FrostCard frame={localFrame} at={dotsAt} level={GREEN} padding={28} radius={48}>
            <div style={{ display: 'flex', gap: u(14), alignItems: 'center', height: u(24) }}>
              {dotsFor(localFrame, dotsAt).map((o, i) => (
                <span key={i} style={{ width: u(20), height: u(20), borderRadius: '50%', background: colors.easy, opacity: o }} />
              ))}
            </div>
          </FrostCard>
        </div>
      ) : null}

      {showBubble ? (
        <div style={{ position: 'absolute', left: u(BUBBLE.left), top: u(BUBBLE.top) }}>
          <FrostCard frame={localFrame} at={bubbleAt} level={GREEN} width={BUBBLE.width} padding={36} radius={44}>
            <div style={{ ...textStyle('question'), color: colors.ink }}>{item.q}</div>
          </FrostCard>
        </div>
      ) : null}

      <div style={{ position: 'absolute', left: u(CHIPS.left), top: u(chipsTop) }}>
        <RevealEngine item={item} frame={localFrame} from={revealFrom} mode="fast" level={GREEN} enterAt={chipsAt} width={CHIPS.width} height={CHIPS.height} gap={CHIPS.gap}>
          {(states) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: u(CHIPS.gap) }}>
              {states.map((s) => {
                const tremble = trembling && s.chipState === 'idle';
                return (
                  <div
                    key={s.index}
                    style={{
                      opacity: s.phase === 'eliminating' ? s.opacity : undefined,
                      filter: s.phase === 'eliminating' ? `saturate(${s.saturate})` : undefined,
                    }}
                  >
                    <ChoiceChip
                      index={s.index}
                      text={s.text}
                      state={tremble ? 'tremble' : s.chipState}
                      frame={localFrame}
                      at={chipsAt + s.index * stagger}
                      stateAt={tremble ? trembleAt : s.chipState === 'idle' ? undefined : revealFrom + s.stateAt}
                      highlight={s.highlight}
                      level={GREEN}
                      width={CHIPS.width}
                      height={CHIPS.height}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </RevealEngine>
      </div>
    </>
  );
};

/** Notes-style card behind the shell's did-you-know card: warm paper, a header strip, ruled lines. No text. */
const NotesCard: React.FC<{ frame: number; at: number; dur: number }> = ({ frame, at, dur }) => {
  const p = presence(frame, at, dur, secToTicks(MESSAGES.notesOutSec));
  const pad = 28;
  const w = SLOTS.dyk.width + 2 * pad;
  const h = 360;
  return (
    <div
      style={{
        position: 'absolute',
        left: u(SLOTS.dyk.left - pad),
        top: u(SLOTS.dyk.top - pad),
        width: u(w),
        height: u(h),
        borderRadius: u(22),
        background: '#F6E58D',
        boxShadow: `0 ${u(14)}px ${u(40)}px ${colors.shadow}`,
        opacity: Math.min(1, p) * 0.9,
        transform: `rotate(${-2.5 * p}deg) translateX(${(1 - p) * u(40)}px)`,
        overflow: 'hidden',
      }}
    >
      <div style={{ height: u(56), background: '#E8C84A' }} />
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} style={{ position: 'absolute', left: u(28), right: u(28), top: u(120 + i * 48), height: u(2), background: 'rgba(120,90,0,0.22)' }} />
      ))}
    </div>
  );
};
