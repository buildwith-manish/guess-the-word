/**
 * ExclusionChips: the rule for a round, drawn in one of four styles from round.ruleType.
 *   banned -> Settings toggle rows flipping off (one row per banned word)
 *   filter -> crossed-out colour swatch(es) (our own drawn swatch, an X over it)
 *   heavy  -> bold chips with crossed-out drawn icons / swatches / plain text
 *   none   -> nothing
 * Anchored from the TOP of layout.ruleZone; every size comes from layout.ts ruleLayout() (the same numbers
 * ruleBlockHeight() reports). Header row: "Banned answers" left, "RULE BREAK = MATCH" inline right.
 * Appears during the intro beat; the scene fades it out when the answer takes the stage.
 * Sizes are in 1280x720 reference units through px(). No hearts here, nothing is lost.
 * All words come from the Round; the only copy owned here is UI labelling (see COPY).
 */
import React from 'react';
import { interpolate, interpolateColors } from 'remotion';
import type { Round } from '../data';
import { SYSTEM, colours, fontHeadline, glassSurface, springAt, STAGGER } from '../system';
import { WIDTH, useDontSayFrame } from '../timing';
import { CHIP_GAP, CLAR_GAP, HEADER_GAP, HEADER_H, MIN_TEXT, layout, ruleLayout, ruleZoneWidth, type RulePlan } from '../layout';

const px = (v: number): number => (v * WIDTH) / 1280;

/** UI labelling copy (not round data). Kept in one place. */
export const COPY = {
  bannedHeader: 'Banned answers',
  ruleBreak: 'RULE BREAK = MATCH',
} as const;

const SWATCH: Record<string, string> = {
  red: '#FF3B30',
  yellow: '#FFD60A',
  orange: '#FF9F0A',
  green: '#34C759',
  blue: '#0A84FF',
  purple: '#AF52DE',
  pink: '#FF2D55',
  brown: '#A2845E',
  black: '#1C1C1E',
  white: '#F2F2F7',
};
const swatchColour = (name: string): string => SWATCH[name.toLowerCase()] ?? '#8E8E93';

// ---------------------------------------------------------------------------
// Drawn glyphs (ours, simple shapes, no logos)
// ---------------------------------------------------------------------------
const Cross: React.FC<{ size: number; t: number; w?: number }> = ({ size, t, w = 7 }) => {
  const len = 100;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute', left: 0, top: 0 }}>
      <line x1="14" y1="14" x2="86" y2="86" stroke={SYSTEM.red} strokeWidth={w} strokeLinecap="round"
        strokeDasharray={len} strokeDashoffset={len * (1 - Math.min(1, t * 2))} />
      <line x1="86" y1="14" x2="14" y2="86" stroke={SYSTEM.red} strokeWidth={w} strokeLinecap="round"
        strokeDasharray={len} strokeDashoffset={len * (1 - Math.max(0, Math.min(1, t * 2 - 1)))} />
    </svg>
  );
};

const IconArt: React.FC<{ name: string }> = ({ name }) => {
  const k = name.toLowerCase();
  const body = (() => {
    switch (k) {
      case 'carrot':
        return (<><path d="M62 30 L28 82 Q24 90 32 86 L70 44 Z" fill="#FF9F0A" /><path d="M64 30 Q70 14 80 20 M64 30 Q78 28 82 36" stroke="#34C759" strokeWidth="6" fill="none" strokeLinecap="round" /></>);
      case 'potato':
        return <ellipse cx="50" cy="54" rx="32" ry="24" fill="#C9A26B" transform="rotate(-14 50 54)" />;
      case 'tomato':
        return (<><circle cx="50" cy="56" r="28" fill="#FF3B30" /><path d="M36 32 L50 40 L64 32 L56 44 L44 44 Z" fill="#34C759" /></>);
      case 'water':
        return <path d="M50 14 Q78 48 74 64 A24 24 0 0 1 26 64 Q22 48 50 14 Z" fill="#64D2FF" />;
      case 'tea':
        return (<><path d="M24 40 H70 V62 A22 22 0 0 1 48 84 H46 A22 22 0 0 1 24 62 Z" fill="#E5D3B3" /><path d="M70 46 H78 A10 10 0 0 1 78 66 H68" stroke="#E5D3B3" strokeWidth="6" fill="none" /><path d="M38 30 Q42 22 38 14 M54 30 Q58 22 54 14" stroke="#F2F2F7" strokeWidth="4" fill="none" strokeLinecap="round" /></>);
      case 'coffee':
        return (<><path d="M22 38 H68 V64 A22 22 0 0 1 46 86 H44 A22 22 0 0 1 22 64 Z" fill="#8E5B3A" /><path d="M68 44 H76 A10 10 0 0 1 76 66 H66" stroke="#8E5B3A" strokeWidth="6" fill="none" /></>);
      case 'juice':
        return (<><path d="M30 28 H70 L64 86 H36 Z" fill="#FF9F0A" /><path d="M54 28 L62 10" stroke="#F2F2F7" strokeWidth="6" strokeLinecap="round" /></>);
      case 'toyota':
      case 'ford':
      case 'bmw':
        return (<><path d="M12 60 Q14 44 32 42 L42 30 H66 L78 42 Q92 44 90 60 Z" fill="#8E8E93" /><circle cx="32" cy="64" r="10" fill="#2C2C2E" /><circle cx="70" cy="64" r="10" fill="#2C2C2E" /></>);
      default:
        return <rect x="22" y="22" width="56" height="56" rx="16" fill="#8E8E93" />;
    }
  })();
  return <svg viewBox="0 0 100 100" width="100%" height="100%">{body}</svg>;
};

const Swatch: React.FC<{ colour: string; size: number }> = ({ colour, size }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', background: colour,
    boxShadow: `inset 0 ${px(2)}px 0 rgba(255,255,255,0.45), 0 ${px(4)}px ${px(10)}px rgba(0,0,0,0.35)` }} />
);

// ---------------------------------------------------------------------------
// Style 1: banned toggle rows (row height comes from layout.ts, compacted to fit ruleZone)
// ---------------------------------------------------------------------------
type RowsPlan = Extract<RulePlan, { kind: 'rows' }>;
type ChipsPlan = Extract<RulePlan, { kind: 'chips' }>;

const ToggleRow: React.FC<{ word: string; plan: RowsPlan; frame: number; start: number; last: boolean }> = ({ word, plan, frame, start, last }) => {
  const arrive = springAt(frame, start, 'snappy');
  const flip = springAt(frame, start + 8, 'pop');
  const trackW = px(plan.trackW), trackH = px(plan.trackH), knob = px(plan.knob);
  const knobX = interpolate(flip, [0, 1], [trackW - knob - px(4), px(4)]);
  const track = interpolateColors(Math.min(1, flip), [0, 1], [SYSTEM.green, 'rgba(120,120,128,0.55)']);
  return (
    <div style={{
      boxSizing: 'border-box', height: px(plan.rowH), padding: `0 ${px(28)}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      borderBottom: last ? 'none' : `${px(1)}px solid ${colours.hairline}`,
      opacity: Math.min(1, arrive), transform: `translateY(${(1 - arrive) * px(18)}px)`,
    }}>
      <span style={{ fontFamily: fontHeadline, fontWeight: 700, fontSize: px(plan.font), color: colours.ink, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>{word}</span>
      <div style={{ width: trackW, height: trackH, borderRadius: trackH, background: track, position: 'relative', flex: '0 0 auto' }}>
        <div style={{ position: 'absolute', top: (trackH - knob) / 2, left: knobX, width: knob, height: knob, borderRadius: '50%',
          background: '#fff', boxShadow: `0 ${px(3)}px ${px(8)}px rgba(0,0,0,0.35)` }} />
      </div>
    </div>
  );
};

/** Header row: "Banned answers" at the left, the RULE BREAK = MATCH chip inline at the right. */
const HeaderRow: React.FC<{ label: boolean; ruleBreak: boolean; frame: number; at: number }> = ({ label, ruleBreak, frame, at }) => {
  const labelIn = Math.min(1, springAt(frame, at, 'smooth'));
  const chipIn = Math.min(1, springAt(frame, at + 10, 'smooth'));
  return (
    <div style={{ height: px(HEADER_H), marginBottom: px(HEADER_GAP), display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
      <span style={{ fontFamily: fontHeadline, fontWeight: 600, fontSize: px(MIN_TEXT), letterSpacing: '0.04em', textTransform: 'uppercase',
        color: colours.muted, marginLeft: px(28), opacity: labelIn, whiteSpace: 'nowrap' }}>{label ? COPY.bannedHeader : ''}</span>
      {ruleBreak ? (
        <span style={{
          fontFamily: fontHeadline, fontWeight: 800, fontSize: px(MIN_TEXT), letterSpacing: '0.06em', color: colours.ink, whiteSpace: 'nowrap',
          lineHeight: 1.2, padding: `${px(3)}px ${px(18)}px`, borderRadius: px(30), background: 'rgba(255,59,48,0.22)',
          border: `${px(1)}px solid rgba(255,59,48,0.6)`, opacity: chipIn,
        }}>{COPY.ruleBreak}</span>
      ) : null}
    </div>
  );
};

const BannedRows: React.FC<{ plan: RowsPlan; frame: number; at: number }> = ({ plan, frame, at }) => (
  <div style={{ width: px(plan.width) }}>
    <HeaderRow label ruleBreak={plan.ruleBreak} frame={frame} at={at} />
    <div style={{ ...glassSurface(26), boxSizing: 'border-box', overflow: 'hidden' }}>
      {plan.words.map((w, i) => (
        <ToggleRow key={w} word={w} plan={plan} frame={frame} start={at + 2 + i * STAGGER.chip} last={i === plan.words.length - 1} />
      ))}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Styles 2 + 3: chips (filter swatches, filter text, heavy chips)
// ---------------------------------------------------------------------------
type ChipSpec = { key: string; label: string; art: React.ReactNode };

const ChipShell: React.FC<{ plan: ChipsPlan; frame: number; start: number; spec: ChipSpec }> = ({ plan, frame, start, spec }) => {
  const big = plan.heavy;
  const arrive = springAt(frame, start, big ? 'pop' : 'snappy');
  const crossT = Math.min(1, springAt(frame, start + 6, 'smooth'));
  const art = px(plan.art);
  return (
    <div style={{
      ...glassSurface(big ? 30 : 26), boxSizing: 'border-box', height: px(plan.chipH), width: big ? px(plan.chipW) : undefined,
      display: 'flex', flexDirection: big ? 'column' : 'row', alignItems: 'center', justifyContent: 'center',
      gap: px(big ? 8 : 18), padding: big ? `${px(14)}px ${px(14)}px` : `${px(14)}px ${px(28)}px`,
      opacity: Math.min(1, arrive), transform: `scale(${0.82 + 0.18 * arrive})`,
    }}>
      <div style={{ position: 'relative', width: art, height: art, flex: '0 0 auto' }}>
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{spec.art}</div>
        <Cross size={art} t={crossT} w={big ? 8 : 7} />
      </div>
      <span style={{ fontFamily: fontHeadline, fontWeight: big ? 800 : 700, fontSize: px(plan.font), letterSpacing: '-0.01em',
        color: colours.ink, textDecoration: 'none', whiteSpace: 'nowrap', lineHeight: 1.15 }}>{spec.label}</span>
    </div>
  );
};

const buildChips = (plan: ChipsPlan): ChipSpec[] =>
  plan.chips.map((c) => {
    if (c.kind === 'swatch') return { key: c.key, label: c.label, art: <Swatch colour={swatchColour(c.key)} size={px(plan.heavy ? 72 : 52)} /> };
    if (c.kind === 'icon') return { key: c.key, label: c.label, art: <div style={{ width: px(plan.art), height: px(plan.art) }}><IconArt name={c.key} /></div> };
    return { key: c.key, label: c.label, art: <Swatch colour="#8E8E93" size={px(52)} /> };
  });

const Chips: React.FC<{ plan: ChipsPlan; frame: number; at: number }> = ({ plan, frame, at }) => {
  const specs = buildChips(plan);
  const clarStart = at + specs.length * STAGGER.chip + 6;
  const clarIn = springAt(frame, clarStart, 'snappy');
  return (
    <div style={{ width: px(plan.width), display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {plan.header ? <HeaderRow label={plan.headerLabel} ruleBreak={plan.ruleBreak} frame={frame} at={at} /> : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: px(CHIP_GAP), maxWidth: px(ruleZoneWidth) }}>
        {specs.map((s, i) => (
          <ChipShell key={s.key} plan={plan} frame={frame} start={at + i * STAGGER.chip} spec={s} />
        ))}
      </div>
      {plan.clar ? (
        <div style={{
          ...glassSurface(26), boxSizing: 'border-box', marginTop: px(CLAR_GAP), height: px(plan.clar.height), padding: `0 ${px(30)}px`,
          display: 'flex', alignItems: 'center', fontFamily: fontHeadline, fontWeight: 700, fontSize: px(plan.clar.font), whiteSpace: 'nowrap',
          color: colours.ink, letterSpacing: '-0.01em', opacity: Math.min(1, clarIn), transform: `translateY(${(1 - clarIn) * px(14)}px)`,
        }}>{plan.clar.text}</div>
      ) : null}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------
export type ExclusionChipsProps = {
  round: Round;
  /** Local design tick (30 fps) at which the first row or chip arrives. Default 0. */
  at?: number;
  /** Optional frame override in design ticks; defaults to the local clock of the enclosing Sequence. */
  frame?: number;
};

/** Anchored from the TOP of layout.ruleZone (never from the bottom). Size and positions come from ruleLayout(). */
export const ExclusionChips: React.FC<ExclusionChipsProps> = ({ round, at = 0, frame: frameProp }) => {
  const clock = useDontSayFrame();
  const frame = frameProp ?? clock;
  const plan = ruleLayout(round);
  if (plan.kind === 'none') return null;
  return (
    <div style={{ position: 'absolute', left: px(layout.ruleZone.left), width: px(ruleZoneWidth), top: px(layout.ruleZone.top),
      display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {plan.kind === 'rows' ? <BannedRows plan={plan} frame={frame} at={at} /> : <Chips plan={plan} frame={frame} at={at} />}
    </div>
  );
};
