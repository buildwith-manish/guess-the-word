import React from 'react';
import { cards, type Card } from '../data';
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
  /** Clue content, drawn in the field area (see WALLET_LAYOUT.field). */
  children?: React.ReactNode;
};

/** Layout in 1280x720 reference units. The card fills the centre 80% box; the answer panel is in the same place on every card. */
const HEADER_H = 64;
const FOOTER_H = 56;
const PAD = 28;
const GAP = 28;
const ANSWER_W = 380;
const BODY_PAD_Y = 24;
const CARD_W = safeBox.w;
const CARD_H = safeBox.h;
export const WALLET_LAYOUT = {
  card: { left: safeBox.left, top: safeBox.top, w: CARD_W, h: CARD_H },
  header: { h: HEADER_H },
  footer: { h: FOOTER_H },
  /** Clue field, relative to the card. */
  field: { left: PAD, top: HEADER_H + BODY_PAD_Y, w: CARD_W - PAD * 2 - GAP - ANSWER_W, h: CARD_H - HEADER_H - FOOTER_H - BODY_PAD_Y * 2 },
  /** Answer panel, relative to the card: the same box on every card, front ("?") and back (name and number). */
  answer: { left: CARD_W - PAD - ANSWER_W, top: HEADER_H + BODY_PAD_Y, w: ANSWER_W, h: CARD_H - HEADER_H - FOOTER_H - BODY_PAD_Y * 2 },
} as const;

const JERSEY_W = 220;
const JERSEY_H = 242;
const STACK_SCALE = 0.2;
const STACK_MARGIN = 40;
const STACK_STEP = { x: 6, y: 10 };
const STACK_VISIBLE = 4;

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/** Generic jersey silhouette (viewBox 200 x 220). Our own shape: no team marks. */
const JERSEY_PATH =
  'M62 16 L80 6 Q100 24 120 6 L138 16 L190 52 L172 100 L162 90 L162 206 Q162 214 154 214 L46 214 Q38 214 38 206 L38 90 L28 100 L10 52 Z';

const Jersey: React.FC<{ color: string; filled?: boolean }> = ({ color, filled = true }) => (
  <svg viewBox="0 0 200 220" width={px(JERSEY_W)} height={px(JERSEY_H)} style={{ display: 'block' }}>
    <path d={JERSEY_PATH} fill={filled ? color : 'none'} fillOpacity={0.16} stroke={color} strokeWidth={5} strokeLinejoin="round" />
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

export const WalletCard: React.FC<WalletCardProps> = ({ card, state, frame, since, jersey, stackIndex = 0, corner = 'bottom-left', showName = true, children }) => {
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
          borderRadius: px(radius.xl),
          overflow: 'hidden',
          background: `linear-gradient(160deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.07) 55%, ${level}14 100%)`,
          backdropFilter: `blur(${px(22)}px) saturate(1.4)`,
          WebkitBackdropFilter: `blur(${px(22)}px) saturate(1.4)`,
          border: `${px(1.5)}px solid ${colors.hairline}`,
          boxShadow: `0 ${px(24)}px ${px(60)}px ${colors.shadow}`,
        }}
      >
        {/* header band: level name and card number */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: px(HEADER_H),
            background: level,
            color: colors.onAccent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `0 ${px(PAD)}px`,
            boxSizing: 'border-box',
          }}
        >
          <span style={{ ...textStyle('label'), textTransform: 'uppercase' }}>{levelNames[card.level]}</span>
          <span style={{ ...textStyle('cardNumber') }}>
            {card.n} / {total}
          </span>
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
            <div style={{ ...face, justifyContent: 'center', borderRadius: px(radius.lg), background: 'rgba(0,0,0,0.22)', border: `${px(1.5)}px solid ${colors.hairline}` }}>
              <div style={{ position: 'relative', width: px(JERSEY_W), height: px(JERSEY_H) }}>
                <Jersey color={level} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: px(18), ...tabular, fontFamily: fontStack, fontWeight: 800, fontSize: px(120), color: level }}>
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
                borderRadius: px(radius.lg),
                background: `${level}22`,
                border: `${px(1.5)}px solid ${level}`,
              }}
            >
              <div style={{ position: 'relative', width: px(JERSEY_W), height: px(JERSEY_H) }}>
                <Jersey color={level} />
                {jerseyText !== undefined && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: px(18), ...tabular, fontFamily: fontStack, fontWeight: 800, fontSize: px(jerseyText.length > 2 ? 60 : jerseyText.length === 2 ? 88 : 112), color: colors.ink }}>
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
            <Lock closed={locked && !unlocked} color={lockColor} size={34} />
          </Shake>
        </div>
      </div>
    </div>
  );
};
