import React from 'react';
import { AbsoluteFill } from 'remotion';
import { handheld, bell } from './camera';
import { px } from './style';

/**
 * Slow "breathing" camera for card scenes (hook, level cards, bonus, reminder, scoreboard, end
 * screen): a gentle push-in with a hint of handheld drift and roll. Everything scales with
 * bell(), so the camera is exactly at rest on the first and last frame (no pop at cuts), and the
 * push (+3 %) always covers the drift, so no edge can show.
 */
export const CameraRig: React.FC<{ frame: number; duration: number; children: React.ReactNode }> = ({
  frame,
  duration,
  children,
}) => {
  const b = bell(frame, duration);
  const h = handheld(frame);
  const scale = 1 + 0.03 * b;
  const x = h.x * px(5) * b;
  const y = h.y * px(5) * b;
  const r = h.r * 0.25 * b;
  return (
    <AbsoluteFill style={{ transform: `translate(${x}px, ${y}px) rotate(${r}deg) scale(${scale})`, transformOrigin: '50% 50%' }}>
      {children}
    </AbsoluteFill>
  );
};
