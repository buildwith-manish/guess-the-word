import React from 'react';
import { cards, cardUiText, pointsLabel, type Card } from '../data';
import { LAYOUT } from './clueLayout';
import { ScoreRings } from './ScoreHud';
import { FPS } from '../shared/clock';
import { Shake } from '../shared/Shake';
import { SPRINGS, colors, fontStack, popAt, px, radius, safeBox, springAt, tabular, textStyle } from '../system';
import { levelNames } from '../timing';

/**
 * Wallet-style scouting pass. States are driven by props only:
 *   blank   springs in from `since`
 *   locked  the footer lock closes and shakes from `since`
 *   open    the answer panel flips from `since` to show the name and jersey number
 *   stacked shrinks from `since` into the Wallet stack in a corner (`stackIndex` 0 = newest, on top)
 * `frame` and `since` are design ticks (30 fps), the same clock as the other nfl components. A state is entered from the
 * rest pose of the one before it (blank -> locked -> open -> stacked); before `since` of a blank card nothing is drawn.
 * No team colours, logos or player art: the silhouette is a generic jersey in the level colour.
 */
export type WalletCardState = 'blank' | 'locked' | 'open' | 'stacked';
export type StackCorner = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';

export type WalletCardProps = {
  card: Card;
  state: WalletCardState;
  frame: number;
  /** Tick at which the current state began. */
  since: number;
  /** Jersey number shown on the open face. cards.json has no jersey field yet: when undefined the number is left out. */
  jersey?: string | number;
  /** Wallet stack position when `state` is 'stacked': 0 = newest (on top). */
  stackIndex?: number;
  corner?: StackCorner;
  /** Draw the name in the answer panel (default). The reveal draws it big in the field instead and passes false. */
  showName?: boolean;
  /** Footer: points on offer now (from the card) and the fill (0..1) of the thin timer line. Omit for no "Guess now" text. */
  guess?: { points: number; fill: number };
  /** Progress rings in the header bar: cards completed (`done`), tweened from `from` at tick `at`. Not the viewer's score. */
  progress?: { done: number; from?: number; at?: number };
  /** Clue content, drawn in the field area (see WALLET_LAYOUT.field). */
  children?: React.ReactNode;
};

/** Layout in 1280x720 reference units. The card fills the centre 80% box; the answer panel is in the same place on every card. */
const HEADER_H = LAYOUT.header;
const FOOTER_H = LAYOUT.footer;
const PAD = LAYOUT.pad;
const GAP = LAYOUT.gap;
const ANSWER_W = LAYOUT.answerW;
const BODY_PAD_Y = LAYOUT.bodyPadY;
const CARD_W = safeBox.w; // 1024 = LAYOUT.card.w
const CARD_H = safeBox.h; // 576 = LAYOUT.card.h
export const WALLET_LAYOUT = {
  card: { left: safeBox.left, top: safeBox.top, w: CARD_W, h: CARD_H },
  header: { h: HEADER_H },
  footer: { h: FOOTER_H },
  /** Clue field, relative to the card (hero + history, see clueLayout.ts). */
  field: { left: PAD, top: HEADER_H + BODY_PAD_Y, w: CARD_W - PAD * 2 - GAP - ANSWER_W, h: CARD_H - HEADER_H - FOOTER_H - BODY_PAD_Y * 2 },
  /** Answer panel (jersey), relative to the card: the same box on every card, front (\"?\") and back (name and number). */
  answer: { left: CARD_W - PAD - ANSWER_W, top: HEADER_H + BODY_PAD_Y, w: ANSWER_W, h: CARD_H - HEADER_H - FOOTER_H - BODY_PAD_Y * 2 },
} as const;

const JERSEY_W = 216;
const JERSEY_H = 234;
const STACK_SCALE = 0.2;
const STACK_MARGIN = 40;
const STACK_STEP = { x: 6, y: 10 };
const STACK_VISIBLE = 4;

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/**
 * Football jersey, our own drawing (viewBox 240 x 260): V-neck, shoulder pads, two stripes on each sleeve. One stroke
 * weight (4) for every line, round joins, like an SF Symbol. No team marks.
 */
const JERSEY_BODY =
  'M92 18 L120 56 L148 18 C176 22 200 32 214 54 L234 112 L196 128 L186 104 L186 244 Q186 250 180 250 L60 250 Q54 250 54 244 L54 104 L44 128 L6 112 L26 54 C40 32 64 22 92 18 Z';
const Jersey: React.FC<{ color: string; filled?: boolean }> = ({ color, filled = true }) => (
  <svg viewBox="0 0 240 260" width={px(JERSEY_W)} height={px(JERSEY_H)} style={{ display: 'block' }} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
    <path d={JERSEY_BODY} fill={filled ? color : 'none'} fillOpacity={0.14} />
    <path d="M62 38 Q40 46 30 66" />
    <path d="M178 38 Q200 46 210 66" />
    <path d="M11 96 L52 112 M17 81 L54 96" />
    <path d="M229 96 L188 112 M223 81 L186 96" />
  </svg>
);

/** Lock icon (24 x 24 grid). Closed = shackle down, open = shackle lifted. */
const Lock: React.FC<{ closed: boolean; color: string; size: number }> = ({ closed, color, size }) => (
  <svg viewBox="0 0 24 24" width={px(size)} height={px(size)} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
    <rect x="4" y="11" width="16" height="10" rx="2.5" fill={color} fillOpacity={0.18} />
    <path d={closed ? 'M7.5 11V7.5a4.5 4.5 0 0 1 9 0V11' : 'M7.5 11V7.5a4.5 4.5 0 0 1 8.8-1.3'} />
  </svg>
);

const cornerBox = (corner: StackCorner): { left: number; top: number } => {
  const w = CARD_W * STACK_SCALE;
  const h = CARD_H * STACK_SCALE;
  const left = corner.endsWith('left') ? STACK_MARGIN : 1280 - STACK_MARGIN - w;
  const top = corner.startsWith('top') ? STACK_MARGIN : 720 - STACK_MARGIN - h;
  return { left, top };
};

export const WalletCard: React.FC<WalletCardProps> = ({ card, state, frame, since, jersey, stackIndex = 0, corner = 'bottom-left', showName = true, guess, progress, children }) => {
  const level = colors.level[card.level];
  const total = cards.length;

  // blank: spring in. Later states start from the settled pose.
  const enter = state === 'blank' ? springAt(frame, since, 'gentle') : 1;
  // open: the answer panel flips (0 = "?" face, 1 = name face) on the shared POP spring, so it overshoots a little
  const flip = state === 'open' || state === 'stacked' ? (state === 'open' ? popAt(frame, since) : 1) : 0;
  // stacked: shrink into the corner
  const stack = state === 'stacked' ? springAt(frame, since, 'gentle') : 0;

  const target = cornerBox(corner);
  const idx = Math.max(0, stackIndex);
  const depth = Math.min(idx, STACK_VISIBLE);
  const stackDx = (corner.endsWith('left') ? 1 : -1) * depth * STACK_STEP.x;
  const stackDy = (corner.startsWith('top') ? 1 : -1) * depth * STACK_STEP.y;
  const left = lerp(WALLET_LAYOUT.card.left, target.left + stackDx, stack);
  const top = lerp(WALLET_LAYOUT.card.top, target.top + stackDy, stack);
  const scale = lerp(1, STACK_SCALE, stack);
  const hiddenInStack = idx >= STACK_VISIBLE ? stack : 0; // deep cards fade out as they settle

  const opacity = clamp01(enter * 1.4) * (1 - hiddenInStack);
  const rise = (1 - enter) * 48;
  const enterScale = lerp(0.94, 1, enter);

  const locked = state === 'locked' || state === 'open' || state === 'stacked';
  const unlocked = state === 'open' || state === 'stacked';
  const lockClosed = state === 'locked';
  const lockColor = unlocked ? level : lockClosed ? colors.ink : colors.muted;

  const angle = flip * 180;
  const face: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  };

  const nameText = card.name;
  const jerseyText = jersey === undefined ? undefined : String(jersey);

  return (
    <div
      style={{
        position: 'absolute',
        left: px(left),
        top: px(top),
        width: px(CARD_W),
        height: px(CARD_H),
        transformOrigin: 'top left',
        transform: `translateY(${px(rise)}px) scale(${scale * enterScale})`,
        opacity,
        zIndex: 100 - idx,
        fontFamily: fontStack,
        color: colors.ink,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: px(LAYOUT.radius.card),
          overflow: 'hidden',
          background: `linear-gradient(160deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.07) 55%, ${level}14 100%)`,
          backdropFilter: `blur(${px(22)}px) saturate(1.4)`,
          WebkitBackdropFilter: `blur(${px(22)}px) saturate(1.4)`,
          border: `${px(1.5)}px solid ${colors.hairline}`,
          boxShadow: `0 ${px(2)}px ${px(6)}px rgba(0,0,0,0.30), 0 ${px(24)}px ${px(60)}px ${colors.shadow}, inset 0 1px 0 rgba(255,255,255,0.22)`,
        }}
      >
        {/* one header bar: progress rings | level | "Card n of 30" */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: px(4), background: level }} />
        <div style={{ position: 'absolute', left: 0, top: px(4), width: '100%', height: px(HEADER_H - 4), display: 'flex', alignItems: 'center', padding: `0 ${px(PAD)}px`, boxSizing: 'border-box' }}>
          <div
            style={{
              flex: 1, height: px(44), display: 'flex', alignItems: 'center', gap: px(14), padding: `0 ${px(16)}px 0 ${px(8)}px`, boxSizing: 'border-box',
              borderRadius: px(22), background: 'rgba(255,255,255,0.08)', border: `${px(1)}px solid ${colors.hairline}`,
            }}
          >
            {progress && <ScoreRings done={progress.done} from={progress.from} at={progress.at} frame={frame} size={32} />}
            <span style={{ ...textStyle('label'), fontSize: px(28), color: colors.ink, textTransform: 'uppercase' }}>{levelNames[card.level]}</span>
            <span style={{ flex: 1 }} />
            <span style={{ ...textStyle('label'), fontSize: px(28), color: colors.muted, textTransform: 'uppercase' }}>
              {cardUiText.card} {card.n} {cardUiText.of} {total}
            </span>
          </div>
        </div>

        {/* field area: clue content from the caller */}
        <div
          style={{
            position: 'absolute',
            left: px(WALLET_LAYOUT.field.left),
            top: px(WALLET_LAYOUT.field.top),
            width: px(WALLET_LAYOUT.field.w),
            height: px(WALLET_LAYOUT.field.h),
          }}
        >
          {children}
        </div>

        {/* answer panel: same box on every card. Flips from "?" to name and jersey number. */}
        <div
          style={{
            position: 'absolute',
            left: px(WALLET_LAYOUT.answer.left),
            top: px(WALLET_LAYOUT.answer.top),
            width: px(WALLET_LAYOUT.answer.w),
            height: px(WALLET_LAYOUT.answer.h),
            perspective: px(1400),
          }}
        >
          <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d', transform: `rotateY(${angle}deg)` }}>
            {/* front: blank jersey marked "?" */}
            <div style={{ ...face, justifyContent: 'center', borderRadius: px(LAYOUT.radius.surface), background: 'rgba(0,0,0,0.22)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)', border: `${px(1.5)}px solid ${colors.hairline}` }}>
              <div style={{ position: 'relative', width: px(JERSEY_W), height: px(JERSEY_H) }}>
                <Jersey color={level} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: px(30), ...tabular, fontFamily: fontStack, fontWeight: 800, fontSize: px(96), color: level }}>
                  ?
                </div>
              </div>
            </div>
            {/* back: jersey number and name */}
            <div
              style={{
                ...face,
                transform: 'rotateY(180deg)',
                justifyContent: showName ? 'flex-start' : 'center',
                paddingTop: showName ? px(20) : 0,
                boxSizing: 'border-box',
                borderRadius: px(LAYOUT.radius.surface),
                background: `${level}22`,
                border: `${px(1.5)}px solid ${level}`,
              }}
            >
              <div style={{ position: 'relative', width: px(JERSEY_W), height: px(JERSEY_H) }}>
                <Jersey color={level} />
                {jerseyText !== undefined && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: px(30), ...tabular, fontFamily: fontStack, fontWeight: 800, fontSize: px(jerseyText.length > 2 ? 60 : jerseyText.length === 2 ? 88 : 112), color: colors.ink }}>
                    {jerseyText}
                  </div>
                )}
              </div>
              {showName && <div style={{ ...textStyle('name'), marginTop: px(8), width: px(ANSWER_W - 32), textAlign: 'center', overflowWrap: 'anywhere', textWrap: 'balance' as React.CSSProperties['textWrap'] }}>{nameText}</div>}
            </div>
          </div>
        </div>

        {/* footer strip with the lock */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            width: '100%',
            height: px(FOOTER_H),
            background: 'rgba(0,0,0,0.24)',
            borderTop: `${px(1.5)}px solid ${colors.hairline}`,
            display: 'flex',
            alignItems: 'center',
            padding: `0 ${px(PAD)}px`,
            boxSizing: 'border-box',
          }}
        >
          <Shake frame={frame} at={state === 'locked' ? since : -1e9} dur={Math.round(SPRINGS.slow * FPS)} amp={5} seed={card.n} style={{ display: 'flex' }}>
            <Lock closed={locked && !unlocked} color={lockColor} size={24} />
          </Shake>
          {guess && (
            <span style={{ ...textStyle('caption'), marginLeft: px(12), color: colors.muted, whiteSpace: 'nowrap' }}>
              {cardUiText.guessNow}: <span style={{ color: level, fontWeight: 700 }}>{pointsLabel(guess.points)}</span>
            </span>
          )}
          {guess && (
            <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: px(3), background: 'rgba(255,255,255,0.08)' }}>
              <div style={{ width: `${Math.min(1, Math.max(0, guess.fill)) * 100}%`, height: '100%', background: level }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
