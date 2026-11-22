import React from 'react';
import { FrostCard } from '../../components/FrostCard';
import { RevealEngine } from '../../components/RevealEngine';
import type { OptionState } from '../../components/RevealEngine';
import type { ShellContext } from '../../components/QuestionShell';
import { FRAME, SAFE, colors, springAt, textStyle, u } from '../../system';
import { ISLANDS, LAKE, LAND_PATH, MAP_SHIFT, ROADS, ROUTES, TOWNS } from './mapsArt';

/**
 * Maps look: a zoomed-in stylised map crop that slowly pulls back while a route draws itself.
 * Options are photo-grid style tiles. At zero (end of the timer) the map is frozen, a pin drops at the
 * end of the route and a label with the answer slides in. All text comes from `ctx.item`.
 * Plug into the shell: <QuestionShell ...>{(ctx) => <MapsLook ctx={ctx} />}</QuestionShell>.
 * The art is invented (see mapsArt.ts).
 */

/** Look beats in local ticks (30 per second); `read.from` and `timer.to` come from the shell's phases. */
export const MAPS_BEATS = {
  zoomFrom: 2.4, // zoom at the start of the read phase, 1 at the end of the timer
  questionIn: 4, // ticks after read.from
  tilesIn: 14, // ticks after read.from; tiles stagger
  tileStagger: 4,
  pinLand: 8, // ticks after hold.from the pin has landed (bouncy spring, settles later)
  labelIn: 6, // ticks after hold.from
  ripple: 18, // ripple length in ticks, starts at hold.from + pinLand
} as const;

const ACCENT = colors.medium;
const SEA = '#0A1522';
const LAND = '#172233';
const TILE = { w: 400, h: 240, gap: 24 } as const;
const GRID = { w: TILE.w * 2 + TILE.gap, h: TILE.h * 2 + TILE.gap } as const;
const GRID_LEFT = FRAME.w - SAFE.x - GRID.w;
const GRID_TOP = FRAME.h - SAFE.bottom - GRID.h;
const PALETTES = [
  ['#3B2A12', '#8A5F1E'],
  ['#12303A', '#2A7088'],
  ['#2E1A3A', '#6A3C8A'],
  ['#1A3A22', '#3C8A52'],
] as const;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Photo-style tile: abstract gradient "picture" (sun and hills shapes) above a letter badge and the option text. */
const Tile: React.FC<{ s: OptionState; frame: number; at: number }> = ({ s, frame, at }) => {
  const enter = springAt(frame, at, 'snappy');
  const [c1, c2] = PALETTES[s.index % PALETTES.length];
  const correct = s.correct && s.expand > 0;
  return (
    <div
      style={{
        boxSizing: 'border-box',
        width: u(TILE.w),
        height: u(TILE.h),
        borderRadius: u(28),
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: colors.glassStrong,
        border: `${u(1.5)}px solid ${correct ? colors.easy : colors.hairline}`,
        boxShadow: correct ? `0 ${u(18)}px ${u(48)}px ${colors.easy}55` : `0 ${u(14)}px ${u(36)}px ${colors.shadow}`,
        opacity: enter * s.opacity,
        filter: s.saturate < 1 ? `saturate(${s.saturate})` : undefined,
        transform: `translateY(${(1 - enter) * u(26)}px) scale(${(0.94 + 0.06 * enter) * s.scale})`,
        transformOrigin: 'center',
      }}
    >
      <svg viewBox="0 0 400 140" preserveAspectRatio="none" style={{ width: '100%', height: u(140), display: 'block' }}>
        <defs>
          <linearGradient id={`tile-g-${s.index}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={c1} />
            <stop offset="1" stopColor={c2} />
          </linearGradient>
        </defs>
        <rect width="400" height="140" fill={`url(#tile-g-${s.index})`} />
        <circle cx={90 + s.index * 60} cy={44} r={20} fill="rgba(255,255,255,0.35)" />
        <path d="M0 140 L0 100 C70 70 120 120 200 92 C280 64 330 110 400 84 L400 140 Z" fill="rgba(0,0,0,0.28)" />
        <path d="M0 140 L0 118 C90 100 160 132 260 112 C320 100 360 122 400 108 L400 140 Z" fill="rgba(0,0,0,0.30)" />
      </svg>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: u(16), padding: `0 ${u(20)}px`, background: correct ? `${colors.easy}` : colors.glass, color: correct ? colors.onAccent : colors.ink }}>
        <div
          style={{
            ...textStyle('caption'),
            fontWeight: 700,
            flex: 'none',
            width: u(48),
            height: u(48),
            borderRadius: u(14),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: correct ? colors.onAccent : `${ACCENT}33`,
            color: correct ? colors.easy : ACCENT,
          }}
        >
          {['A', 'B', 'C', 'D'][s.index]}
        </div>
        <div style={{ ...textStyle('body'), fontWeight: 600, lineHeight: 1.15, flex: 1, minWidth: 0 }}>{s.text}</div>
      </div>
    </div>
  );
};

const Pin: React.FC<{ drop: number }> = ({ drop }) => (
  <svg
    viewBox="0 0 64 88"
    style={{ width: u(64), height: u(88), transform: `translate(-50%, -100%) translateY(${(1 - drop) * u(-170)}px)`, opacity: clamp01(drop * 6), display: 'block', overflow: 'visible' }}
  >
    <path d="M32 86 C32 86 4 52 4 30 A28 28 0 1 1 60 30 C60 52 32 86 32 86 Z" fill={ACCENT} stroke="rgba(0,0,0,0.35)" strokeWidth="2" />
    <circle cx="32" cy="30" r="11" fill="#1A1205" />
  </svg>
);

export const MapsLook: React.FC<{ ctx: ShellContext }> = ({ ctx }) => {
  const { item, level, localFrame: f, phases } = ctx;
  const route = ROUTES[item.order % ROUTES.length];
  const readFrom = phases.read.from;
  const zeroAt = phases.timer.to; // zero of the clock = map freezes, pin drops
  const holdFrom = phases.hold.from;

  // 0..1 over read + timer, then frozen
  const p = clamp01((f - readFrom) / Math.max(1, zeroAt - readFrom));
  const ease = 1 - (1 - p) * (1 - p); // ends flat so the freeze is not a jolt
  const zoom = 1 + (MAPS_BEATS.zoomFrom - 1) * (1 - ease);
  const fx = route.start.x + MAP_SHIFT;
  const fy = route.start.y;
  const ex = route.end.x + MAP_SHIFT;
  const ey = route.end.y;
  const sw = (v: number) => v / zoom; // keep strokes the same on screen while zooming

  const drop = f < holdFrom + 0 ? 0 : springAt(f, holdFrom, 'bouncy');
  const labelP = f < holdFrom + MAPS_BEATS.labelIn ? 0 : springAt(f, holdFrom + MAPS_BEATS.labelIn, 'snappy');
  const rip = clamp01((f - (holdFrom + MAPS_BEATS.pinLand)) / MAPS_BEATS.ripple);
  const answer = item.options[item.answer];

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {/* the map */}
      <svg viewBox={`0 0 ${FRAME.w} ${FRAME.h}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <rect width={FRAME.w} height={FRAME.h} fill={SEA} />
        <g transform={`translate(${fx} ${fy}) scale(${zoom}) translate(${-fx} ${-fy})`}>
          <g transform={`translate(${MAP_SHIFT} 0)`}>
            {/* graticule */}
            {Array.from({ length: 14 }, (_, i) => (
              <line key={`v${i}`} x1={i * 120} y1={-200} x2={i * 120} y2={1300} stroke="rgba(255,255,255,0.035)" strokeWidth={sw(1.5)} />
            ))}
            {Array.from({ length: 11 }, (_, i) => (
              <line key={`h${i}`} x1={-300} y1={i * 120 - 60} x2={1500} y2={i * 120 - 60} stroke="rgba(255,255,255,0.035)" strokeWidth={sw(1.5)} />
            ))}
            <path d={LAND_PATH} fill="rgba(255,159,10,0.10)" stroke="rgba(255,159,10,0.18)" strokeWidth={sw(26)} strokeLinejoin="round" />
            <path d={LAND_PATH} fill={LAND} stroke={`${ACCENT}99`} strokeWidth={sw(3)} strokeLinejoin="round" />
            {ISLANDS.map((e, i) => (
              <ellipse key={i} cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry} transform={`rotate(${e.rot} ${e.cx} ${e.cy})`} fill={LAND} stroke={`${ACCENT}66`} strokeWidth={sw(2)} />
            ))}
            <ellipse cx={LAKE.cx} cy={LAKE.cy} rx={LAKE.rx} ry={LAKE.ry} transform={`rotate(${LAKE.rot} ${LAKE.cx} ${LAKE.cy})`} fill={SEA} stroke={`${ACCENT}55`} strokeWidth={sw(2)} />
            {ROADS.map((d, i) => (
              <path key={i} d={d} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={sw(3)} strokeLinecap="round" />
            ))}
            {TOWNS.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={sw(5)} fill="rgba(255,255,255,0.28)" />
            ))}
            {/* route: soft underlay + line, drawn by progress */}
            <path d={route.d} pathLength={1} fill="none" stroke={`${ACCENT}44`} strokeWidth={sw(22)} strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={1 - p} />
            <path d={route.d} pathLength={1} fill="none" stroke={ACCENT} strokeWidth={sw(8)} strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={1 - p} />
            <circle cx={route.start.x} cy={route.start.y} r={sw(13)} fill="#1A1205" stroke={ACCENT} strokeWidth={sw(5)} />
          </g>
        </g>
      </svg>

      {/* legibility vignette */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(4,6,10,0.55) 0%, rgba(4,6,10,0) 32%, rgba(4,6,10,0) 70%, rgba(4,6,10,0.45) 100%)', pointerEvents: 'none' }} />

      {/* question */}
      <div style={{ position: 'absolute', left: u(336), top: u(160) }}>
        <FrostCard frame={f} at={readFrom + MAPS_BEATS.questionIn} level={level} width={960} padding={36} radius={34}>
          <div style={{ ...textStyle('question'), fontSize: u(54), color: colors.ink }}>{item.q}</div>
        </FrostCard>
      </div>

      {/* option tiles */}
      <div style={{ position: 'absolute', left: u(GRID_LEFT), top: u(GRID_TOP), width: u(GRID.w) }}>
        <RevealEngine item={item} frame={f} from={ctx.revealFrom} mode={ctx.revealMode} level={level}>
          {(states) => (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(2, ${u(TILE.w)}px)`, gap: u(TILE.gap) }}>
              {states.map((s) => (
                <Tile key={s.index} s={s} frame={f} at={readFrom + MAPS_BEATS.tilesIn + s.index * MAPS_BEATS.tileStagger} />
              ))}
            </div>
          )}
        </RevealEngine>
      </div>

      {/* pin and label at the end of the route (only after zero) */}
      {f >= holdFrom ? (
        <>
          <div style={{ position: 'absolute', left: u(ex), top: u(ey), width: 0, height: 0 }}>
            <div
              style={{
                position: 'absolute',
                left: u(-70),
                top: u(-22),
                width: u(140),
                height: u(44),
                borderRadius: '50%',
                border: `${u(4)}px solid ${ACCENT}`,
                opacity: rip > 0 && rip < 1 ? 0.8 * (1 - rip) : 0,
                transform: `scale(${0.25 + 1.2 * rip})`,
              }}
            />
            <Pin drop={drop} />
          </div>
          <div
            style={{
              position: 'absolute',
              right: u(FRAME.w - (ex + 60)),
              bottom: u(FRAME.h - (ey - 120)),
              opacity: labelP,
              transform: `translateX(${(1 - labelP) * u(-70)}px)`,
            }}
          >
            <div
              style={{
                ...textStyle('choice'),
                padding: `${u(14)}px ${u(28)}px`,
                borderRadius: u(24),
                background: 'rgba(20,14,4,0.78)',
                border: `${u(2)}px solid ${ACCENT}`,
                color: colors.ink,
                backdropFilter: `blur(${u(18)}px)`,
                whiteSpace: 'nowrap',
              }}
            >
              {answer}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
