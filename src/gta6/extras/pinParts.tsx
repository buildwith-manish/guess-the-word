import React from 'react';
import { colors, springAt, u } from '../system';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export type DroppedPinProps = {
  frame: number;
  /** Local frame the pin starts dropping. */
  at: number;
  color?: string;
  /** Pin size factor. */
  scale?: number;
  /** Knock the pin off: wiggle for 6 ticks from `fallAt`, then it falls away with gravity and spin. */
  fallAt?: number;
};

export const FALL = { wiggle: 6, gravity: 4, spin: 6, fadeTicks: 18 } as const;

/**
 * A pin whose TIP is at the parent's (0,0). Drops from above with a bouncy spring starting at `at`, ripple from `at + 8`.
 * Place it inside an absolutely positioned zero-size box.
 */
export const DroppedPin: React.FC<DroppedPinProps> = ({ frame, at, color = colors.medium, scale = 1, fallAt }) => {
  const drop = frame < at ? 0 : springAt(frame, at, 'bouncy');
  const rip = clamp01((frame - (at + 8)) / 18);
  let y = (1 - drop) * u(-170);
  let rot = 0;
  let opacity = clamp01(drop * 6);
  let ripple = rip > 0 && rip < 1 ? 0.8 * (1 - rip) : 0;
  if (fallAt !== undefined && frame >= fallAt) {
    const t = frame - fallAt;
    const w = Math.min(t, FALL.wiggle);
    const f = Math.max(0, t - FALL.wiggle);
    rot = Math.sin(w * 2.2) * 10 * (w / FALL.wiggle) + f * FALL.spin;
    y += -u(6) * (w / FALL.wiggle) + 0.5 * FALL.gravity * f * f * u(1);
    opacity *= clamp01(1 - f / FALL.fadeTicks);
    ripple = 0;
  }
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0 }}>
      <div
        style={{
          position: 'absolute',
          left: u(-70 * scale),
          top: u(-22 * scale),
          width: u(140 * scale),
          height: u(44 * scale),
          borderRadius: '50%',
          border: `${u(4)}px solid ${color}`,
          opacity: ripple,
          transform: `scale(${0.25 + 1.2 * rip})`,
        }}
      />
      <svg
        viewBox="0 0 64 88"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: u(64 * scale),
          height: u(88 * scale),
          overflow: 'visible',
          opacity,
          transformOrigin: '50% 100%',
          transform: `translate(-50%, -100%) translateY(${y}px) rotate(${rot}deg)`,
        }}
      >
        <path d="M32 86 C32 86 4 52 4 30 A28 28 0 1 1 60 30 C60 52 32 86 32 86 Z" fill={color} stroke="rgba(0,0,0,0.35)" strokeWidth="2" />
        <circle cx="32" cy="30" r="11" fill="#1A1205" />
      </svg>
    </div>
  );
};

/** Pill label that slides in from the left at `at` and can fade out by `outAt`. Text comes from the caller. */
export const PinLabel: React.FC<{ text: string; frame: number; at: number; outAt?: number; color?: string; greyed?: boolean }> = ({
  text, frame, at, outAt, color = colors.medium, greyed,
}) => {
  const p = frame < at ? 0 : springAt(frame, at, 'snappy');
  const out = outAt === undefined ? 1 : clamp01(1 - (frame - outAt) / 8);
  return (
    <div
      style={{
        opacity: p * out * (greyed ? 0.45 : 1),
        transform: `translateX(${(1 - p) * u(-60)}px)`,
        padding: `${u(12)}px ${u(26)}px`,
        borderRadius: u(22),
        background: 'rgba(20,14,4,0.78)',
        border: `${u(2)}px solid ${greyed ? colors.hairline : color}`,
        color: colors.ink,
        whiteSpace: 'nowrap',
        fontFamily: '"Inter", -apple-system, system-ui, sans-serif',
        fontSize: u(40),
        fontWeight: 600,
        fontVariantNumeric: 'tabular-nums',
        filter: greyed ? 'saturate(0.2)' : undefined,
      }}
    >
      {text}
    </div>
  );
};
