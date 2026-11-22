/**
 * SliderFill: an iOS Control Center slider that fills to `value` (0..1) between `at` and `at + dur`, easing out.
 * `vertical` (default) fills from the bottom, `horizontal` from the left. Glyph: sun, speaker or none. No text.
 */
import React from 'react';
import type { Level } from '../data';
import { blurPx, colors, radius, springAt, u } from '../system';
import { clamp01, easeOut } from './util';

export type SliderGlyph = 'sun' | 'volume' | 'none';

export type SliderFillProps = {
  /** Final fill, 0..1 (a scene computes it from data, e.g. correct / total). */
  value: number;
  frame: number;
  at: number;
  /** Ticks to fill. */
  dur: number;
  orientation?: 'vertical' | 'horizontal';
  level?: Level;
  glyph?: SliderGlyph;
  /** Reference units. Defaults: vertical 160 x 420, horizontal 560 x 140. */
  width?: number;
  height?: number;
};

const Glyph: React.FC<{ kind: SliderGlyph; color: string; size: number }> = ({ kind, color, size }) => {
  if (kind === 'none') return null;
  return (
    <svg viewBox="0 0 64 64" width={u(size)} height={u(size)}>
      {kind === 'sun' ? (
        <>
          <circle cx="32" cy="32" r="11" fill={color} />
          {Array.from({ length: 8 }, (_, k) => {
            const a = (k * Math.PI) / 4;
            return <line key={k} x1={32 + 18 * Math.cos(a)} y1={32 + 18 * Math.sin(a)} x2={32 + 26 * Math.cos(a)} y2={32 + 26 * Math.sin(a)} stroke={color} strokeWidth="4" strokeLinecap="round" />;
          })}
        </>
      ) : (
        <>
          <path d="M8 24 H20 L34 12 V52 L20 40 H8 Z" fill={color} />
          <path d="M42 22 Q52 32 42 42 M48 14 Q64 32 48 50" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
};

export const SliderFill: React.FC<SliderFillProps> = ({ value, frame, at, dur, orientation = 'vertical', level, glyph = 'sun', width, height }) => {
  const enter = springAt(frame, at, 'snappy');
  if (enter <= 0) return null;
  const vertical = orientation === 'vertical';
  const w = width ?? (vertical ? 160 : 560);
  const h = height ?? (vertical ? 420 : 140);
  const fill = clamp01(value) * easeOut(dur > 0 ? (frame - at) / dur : 1);
  const accent = level ? colors.level[level] : colors.ink;
  const onFill = fill > 0.15;
  return (
    <div
      style={{
        position: 'relative', width: u(w), height: u(h), borderRadius: u(radius.lg), overflow: 'hidden', background: colors.glass,
        border: `${u(1.5)}px solid ${colors.hairline}`, backdropFilter: `blur(${u(blurPx)}px) saturate(1.4)`,
        opacity: Math.min(1, enter), transform: `translateY(${(1 - enter) * u(30)}px)`,
      }}
    >
      <div style={vertical
        ? { position: 'absolute', left: 0, right: 0, bottom: 0, height: `${fill * 100}%`, background: accent }
        : { position: 'absolute', left: 0, top: 0, bottom: 0, width: `${fill * 100}%`, background: accent }} />
      <div style={vertical
        ? { position: 'absolute', left: 0, right: 0, bottom: u(28), display: 'flex', justifyContent: 'center' }
        : { position: 'absolute', left: u(28), top: 0, bottom: 0, display: 'flex', alignItems: 'center' }}>
        <Glyph kind={glyph} color={onFill ? colors.onAccent : colors.ink} size={Math.min(w, h) * 0.4} />
      </div>
    </div>
  );
};
