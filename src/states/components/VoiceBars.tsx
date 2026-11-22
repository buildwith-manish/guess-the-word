/**
 * VoiceBars / VoicePulse: the "speaking" indicator that follows the real voice level of a voiceover clip.
 * The level comes from src/states/states-voice-analysis.json (RMS per design tick, made by
 * scripts/states-voiceover-scan.js), so any frame renders the same, in any order. Without analysis the bars rest.
 *
 *   VoiceBars   a row of rounded bars; bar i shows the level i * lag ticks earlier, so the row ripples like a waveform
 *   VoicePulse  the clock-sized ring of the timer slot that breathes with the voice, with VoiceBars inside; it is
 *               shown while the question clip plays (TimerLead takes over at the "get ready" beat)
 */
import React from 'react';
import { IOS } from '../../ios';
import { voiceLevelAt } from '../state-timing';
import { COLOR, VOICE } from '../look';

export interface VoiceBarsProps {
  file: string;
  /** ticks since the clip started (can be < 0 or past the end: the bars rest) */
  tick: number;
  color: string;
  /** box in px */
  width: number;
  height: number;
  bars?: number;
}

/** ticks between neighbouring bars */
const LAG = 1.6;
const REST = 0.1;

export const VoiceBars: React.FC<VoiceBarsProps> = ({ file, tick, color, width, height, bars = 5 }) => {
  const gap = width / (bars * 2);
  const w = (width - gap * (bars - 1)) / bars;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap, width, height }}>
      {Array.from({ length: bars }, (_, i) => {
        // the middle bars lead, the outer ones follow: a centred ripple
        const dist = Math.abs(i - (bars - 1) / 2);
        const level = voiceLevelAt(file, tick - dist * LAG);
        const h = height * Math.min(1, REST + (1 - REST) * Math.pow(level, 0.8));
        return <div key={i} style={{ width: w, height: h, borderRadius: w, background: color, opacity: VOICE.barAlpha }} />;
      })}
    </div>
  );
};

export interface VoicePulseProps {
  file: string;
  tick: number;
  accent: string;
  /** diameter in px */
  size: number;
}

export const VoicePulse: React.FC<VoicePulseProps> = ({ file, tick, accent, size }) => {
  const level = voiceLevelAt(file, tick);
  const stroke = size * 0.028;
  const r = (size - stroke * 5.5) / 2;
  const c = size / 2;
  return (
    <div style={{ position: 'relative', width: size, height: size, transform: `scale(${1 + 0.06 * level})` }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
        <circle cx={c} cy={c} r={r} fill="none" stroke={COLOR.fillStrong} strokeOpacity={1} strokeWidth={stroke} />
        <circle cx={c} cy={c} r={r} fill="none" stroke={accent} strokeOpacity={0.07 + 0.2 * level} strokeWidth={stroke * 4.5} />
        <circle cx={c} cy={c} r={r} fill="none" stroke={accent} strokeOpacity={0.4 + 0.6 * level} strokeWidth={stroke} />
      </svg>
      <div style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <VoiceBars file={file} tick={tick} color={accent} width={size * 0.46} height={size * 0.34} />
      </div>
    </div>
  );
};
