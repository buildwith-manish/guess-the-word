import React from 'react';
import { FrostCard, RevealEngine, SLOTS, TimerRing, expandStartSec } from '../../components';
import type { ShellContext } from '../../components';
import { colors, radius, springAt, textStyle, u } from '../../system';
import { FPS, holdSec, secToTicks } from '../../timing';

/**
 * Safari look (task 3d). A search bar types the question with a caret; the four options sit as
 * search-suggestion tiles (Control Center style). Hold = a 0.5 s page-load spinner in the bar; then the
 * wrong suggestions grey out one by one (RevealEngine, "full" mode), the right one highlights in red and its
 * result card loads. Red accent throughout (colors.hard), the timer is the `island` variant.
 *
 * Every string comes from `item` (q, options, reveal); every length comes from timing.ts (read, timer, hold,
 * holdSec) or from RevealEngine (expandStartSec). What is written here is motion only: typing share of the read
 * phase, tile stagger, skeleton length, spinner speed.
 *
 * Pass `showTimer={false}` to QuestionShell for this look: the island timer is drawn here, in the shell's slot.
 * Reference units 1920x1080 through u(). Frames are local design ticks (30 per second).
 */
export type SafariLookProps = Pick<ShellContext, 'item' | 'phase' | 'localFrame' | 'phases' | 'revealFrom'>;

const ACCENT = colors.hard;

/** Motion constants (ticks unless noted). */
const SAFARI = {
  typeShare: 0.7, // share of the read phase used for typing; the tiles come in after it
  popTicks: 3, // fade-up of one typed character
  tileStagger: 4,
  skeletonTicks: 10, // result card shows grey lines this long, then the text
  skeletonLines: 3,
  spinnerTurnsPerSec: 1.25,
  blinkTicks: 6, // caret blink half period
  fadeTicks: 4,
} as const;

/** Layout, 1920x1080 reference units. */
const BOX = { barW: 1500, barH: 180, barTop: 224, tileH: 132, tileGap: 24, tilesTop: 440, cardTop: 764 } as const;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);

const Magnifier: React.FC<{ s: number; color: string }> = ({ s, color }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round">
    <circle cx="10.5" cy="10.5" r="6.5" />
    <line x1="15.4" y1="15.4" x2="21" y2="21" />
  </svg>
);

const Spinner: React.FC<{ s: number; angle: number; opacity: number }> = ({ s, angle, opacity }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{ opacity, transform: `rotate(${angle}deg)` }}>
    <circle cx="12" cy="12" r="9" stroke={colors.glassStrong} strokeWidth={2.6} />
    <circle cx="12" cy="12" r="9" stroke={ACCENT} strokeWidth={2.6} strokeLinecap="round" strokeDasharray="28 100" />
  </svg>
);

export const SafariLook: React.FC<SafariLookProps> = ({ item, localFrame: f, phases, revealFrom }) => {
  const q = item.q;
  const readFrom = phases.read.from;
  const readLen = phases.read.to - phases.read.from;
  const typeSpan = readLen * SAFARI.typeShare;
  const typeEnd = readFrom + typeSpan;

  // Typing: the first character lands on readFrom, the last on typeEnd.
  const typed = f < readFrom ? 0 : Math.min(q.length, Math.floor(((f - readFrom) / typeSpan) * q.length) + 1);
  const holdTicks = secToTicks(holdSec);
  const loading = f >= revealFrom && f < revealFrom + holdTicks;
  const loadP = clamp01((f - revealFrom) / holdTicks);
  const typing = typed < q.length;
  const blink = 0.5 + 0.5 * Math.cos((f / SAFARI.blinkTicks) * Math.PI);
  const caretOpacity = f >= revealFrom ? 0 : typing ? 1 : clamp01(blink * 1.6);

  const barFont = u(46);
  const caretEl = (
    <span style={{ position: 'relative', display: 'inline-block', width: 0, height: barFont * 1.05, verticalAlign: 'text-bottom' }}>
      <span
        style={{
          position: 'absolute',
          left: barFont * 0.07,
          top: 0,
          width: barFont * 0.09,
          height: '100%',
          borderRadius: barFont * 0.05,
          background: ACCENT,
          opacity: caretOpacity,
        }}
      />
    </span>
  );
  const caretAfter = typed === q.length || q[typed] === ' ' ? typed - 1 : null;
  const caretBefore = caretAfter === null ? typed : null;

  // Every character is always laid out (lines never re-wrap while typing); typed ones fade up.
  const clue: React.ReactNode[] = [];
  let idx = 0;
  q.split(' ').forEach((word, wi) => {
    const chars: React.ReactNode[] = [];
    for (let c = 0; c < word.length; c++, idx++) {
      const landsAt = readFrom + (idx / q.length) * typeSpan;
      const pop = idx < typed ? easeOut((f - landsAt) / SAFARI.popTicks) : 0;
      if (caretBefore === idx) chars.push(<React.Fragment key={`c${idx}`}>{caretEl}</React.Fragment>);
      chars.push(
        <span key={idx} style={{ display: 'inline-block', opacity: pop, transform: `translateY(${(1 - pop) * 0.07 * barFont}px)` }}>
          {word[c]}
        </span>,
      );
      if (caretAfter === idx) chars.push(<React.Fragment key={`a${idx}`}>{caretEl}</React.Fragment>);
    }
    if (wi > 0) clue.push(' ');
    clue.push(
      <span key={`w${wi}`} style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
        {chars}
      </span>,
    );
    idx++; // the space after the word
  });
  if (q.length === 0 || typed === 0) clue.push(<React.Fragment key="empty">{caretEl}</React.Fragment>);

  const tileW = (BOX.barW - BOX.tileGap) / 2;
  const resultAt = revealFrom + secToTicks(expandStartSec('full'));
  const resultAge = f - resultAt;
  const showText = resultAge >= SAFARI.skeletonTicks;
  const textIn = easeOut((resultAge - SAFARI.skeletonTicks) / SAFARI.fadeTicks);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {/* Island timer, in the shell's timer slot, red */}
      {f < phases.reveal.from ? (
        <div
          style={{
            position: 'absolute',
            top: u(SLOTS.timerRing.top),
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <TimerRing frame={f} at={phases.timer.from} dur={phases.timer.to - phases.timer.from} variant="island" level="hard" size={SLOTS.islandW} />
        </div>
      ) : null}

      {/* Search bar */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: u(BOX.barTop), display: 'flex', justifyContent: 'center' }}>
        <FrostCard frame={f} at={readFrom} level="hard" width={BOX.barW} height={BOX.barH} padding={0} radius={radius.xl} style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: u(40), top: 0, bottom: 0, display: 'flex', alignItems: 'center' }}>
            <Magnifier s={u(52)} color={colors.muted} />
          </div>
          <div
            style={{
              position: 'absolute',
              left: u(116),
              right: u(116),
              top: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              ...textStyle('question'),
              fontSize: barFont,
              fontWeight: 600,
              lineHeight: 1.2,
              color: colors.ink,
              whiteSpace: 'pre-wrap',
              overflowWrap: 'break-word',
            }}
          >
            <div>{clue}</div>
          </div>
          {loading ? (
            <div style={{ position: 'absolute', right: u(40), top: 0, bottom: 0, display: 'flex', alignItems: 'center' }}>
              <Spinner
                s={u(52)}
                angle={((f - revealFrom) / FPS) * SAFARI.spinnerTurnsPerSec * 360}
                opacity={1 - easeOut((f - (revealFrom + holdTicks - SAFARI.fadeTicks)) / SAFARI.fadeTicks)}
              />
            </div>
          ) : null}
          {/* Safari-style load line along the bottom edge of the bar */}
          {loading ? (
            <div style={{ position: 'absolute', left: 0, bottom: 0, height: u(5), width: `${loadP * 100}%`, background: ACCENT }} />
          ) : null}
        </FrostCard>
      </div>

      {/* Suggestions: four tiles, 2 x 2, driven by RevealEngine in full mode */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: u(BOX.tilesTop),
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: `${u(tileW)}px ${u(tileW)}px`, gap: u(BOX.tileGap) }}>
          <RevealEngine item={item} frame={f} from={revealFrom} mode="full" level="hard">
            {(states) =>
              states.map((s) => {
                const enter = springAt(f, typeEnd + s.index * SAFARI.tileStagger, 'snappy');
                const hit = s.phase === 'expanding' || s.phase === 'correct';
                const eliminating = s.phase === 'eliminating';
                return (
                  <div
                    key={s.index}
                    style={{
                      boxSizing: 'border-box',
                      height: u(BOX.tileH),
                      borderRadius: u(radius.lg),
                      display: 'flex',
                      alignItems: 'center',
                      gap: u(24),
                      padding: `0 ${u(28)}px`,
                      background: hit ? ACCENT : `linear-gradient(160deg, ${colors.glassStrong}, ${colors.glass})`,
                      border: `${u(1.5)}px solid ${hit ? ACCENT : colors.hairline}`,
                      color: colors.ink,
                      opacity: enter * (eliminating || s.phase === 'eliminated' ? s.opacity : 1),
                      filter: eliminating || s.phase === 'eliminated' ? `saturate(${s.saturate})` : undefined,
                      transform: `translateY(${(1 - enter) * u(24)}px) scale(${s.scale})`,
                      transformOrigin: 'center',
                      ...textStyle('choice'),
                      fontSize: u(40),
                    }}
                  >
                    <div
                      style={{
                        flex: 'none',
                        width: u(64),
                        height: u(64),
                        borderRadius: u(32),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: hit ? 'rgba(255,255,255,0.24)' : colors.glassStrong,
                        color: hit ? colors.ink : ACCENT,
                        fontSize: u(34),
                        fontWeight: 700,
                      }}
                    >
                      {String.fromCharCode(65 + s.index)}
                    </div>
                    <div style={{ minWidth: 0, overflowWrap: 'break-word' }}>{s.text}</div>
                  </div>
                );
              })
            }
          </RevealEngine>
        </div>
      </div>

      {/* Result card: grey skeleton lines, then the text */}
      {resultAge >= 0 ? (
        <div style={{ position: 'absolute', left: 0, right: 0, top: u(BOX.cardTop), display: 'flex', justifyContent: 'center' }}>
          <FrostCard frame={f} at={resultAt} level="hard" width={BOX.barW} padding={36} radius={radius.lg}>
            <div style={{ ...textStyle('choice'), fontSize: u(40), color: ACCENT, opacity: showText ? textIn : 0, minHeight: u(48) }}>
              {item.options[item.answer]}
            </div>
            <div style={{ position: 'relative', marginTop: u(12) }}>
              <div style={{ ...textStyle('body'), fontSize: u(34), color: colors.muted, opacity: showText ? textIn : 0 }}>{item.reveal}</div>
              {!showText ? (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', gap: u(14), opacity: 1 - textIn }}>
                  {Array.from({ length: SAFARI.skeletonLines }, (_, i) => (
                    <div
                      key={i}
                      style={{
                        height: u(22),
                        width: `${100 - i * 18}%`,
                        borderRadius: u(11),
                        background: colors.glassStrong,
                        opacity: 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(((f - resultAt) / SAFARI.skeletonTicks) * Math.PI * 2 - i)),
                      }}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </FrostCard>
        </div>
      ) : null}
    </div>
  );
};
