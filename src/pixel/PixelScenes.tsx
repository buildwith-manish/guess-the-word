import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Background } from '../Background';
import { COLORS, FONTS, K, px } from '../style';
import { prog, revealIn, slamIn } from '../anim';
import { backOut, linear } from '../gsap-helpers';
import { PIXEL_LEVELS } from './brands';
import settings from '../../settings.json';
import { LEVEL_COUNT, COUNTDOWN_SECONDS, PIXEL_TOTAL, T, levelCount } from './pixel-timing';

/** Hook scene A: a mosaic that sharpens while the title slams in. */
const TitleScene: React.FC<{ frame: number }> = ({ frame }) => {
  const a = slamIn(frame, 4, 18);
  const b = slamIn(frame, 26, 18);
  const c = revealIn(frame, 52, 16, 24);
  const out = 1 - prog(frame, T.introA - 8, 8, linear);
  // decorative mosaic: 12x7 blocks that "resolve" from big chunks into a tidy grid
  const cols = 16;
  const rows = 9;
  const settle = prog(frame, 0, 60, linear);
  return (
    <AbsoluteFill style={{ opacity: out }}>
      <Background frame={frame} theme={['#6D5BFF', '#0B0A2E']} />
      <AbsoluteFill style={{ opacity: 0.35 }}>
        {Array.from({ length: cols * rows }).map((_, i) => {
          const x = i % cols;
          const y = Math.floor(i / cols);
          const hue = (x * 23 + y * 41 + frame * 3) % 360;
          const on = ((x * 7 + y * 13) % 5) / 5 < settle ? 1 : 0.25;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${(x / cols) * 100}%`,
                top: `${(y / rows) * 100}%`,
                width: `${100 / cols}%`,
                height: `${100 / rows}%`,
                background: `hsl(${hue} 80% 55%)`,
                opacity: on * 0.55,
              }}
            />
          );
        })}
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontFamily: FONTS.display, fontSize: px(120), lineHeight: 1.05, color: COLORS.ink, opacity: a.opacity, transform: a.transform, filter: a.filter, textShadow: `0 ${px(8)}px ${px(30)}px rgba(0,0,0,0.6)` }}>
          CAN YOU NAME THE BRAND
        </div>
        <div style={{ fontFamily: FONTS.display, fontSize: px(150), lineHeight: 1.05, color: COLORS.yellow, opacity: b.opacity, transform: b.transform, filter: b.filter, textShadow: `0 ${px(8)}px ${px(30)}px rgba(0,0,0,0.6)` }}>
          FROM A FEW PIXELS?
        </div>
        <div style={{ marginTop: px(26), fontFamily: FONTS.body, fontWeight: 800, fontSize: px(26), letterSpacing: px(6), color: COLORS.muted, opacity: c.opacity, transform: c.transform }}>
          {PIXEL_TOTAL} FOOD BRANDS · {COUNTDOWN_SECONDS} SECONDS EACH
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** "LEVEL 2 / 4 — LUNCH & PANTRY — 13 BRANDS" */
export const PixelLevelCard: React.FC<{ frame: number; level: number }> = ({ frame, level }) => {
  const lv = PIXEL_LEVELS[level];
  const eyebrow = revealIn(frame, 2, 14, 18);
  const title = slamIn(frame, 10, 16);
  const meta = revealIn(frame, 30, 16, 22);
  const pop = prog(frame, 8, 18, backOut);
  const exit = prog(frame, T.levelCard - 10, 10, linear);
  return (
    <AbsoluteFill>
      <Background frame={frame} theme={[lv.accent, lv.bg]} />
      <AbsoluteFill style={{ opacity: 1 - exit, transform: `scale(${1 - 0.05 * exit})`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ fontFamily: FONTS.body, fontWeight: 800, fontSize: px(24), letterSpacing: px(10), color: 'rgba(255,255,255,0.87)', opacity: eyebrow.opacity, transform: eyebrow.transform }}>
          LEVEL {level + 1} / {LEVEL_COUNT}
        </div>
        <div style={{ fontFamily: FONTS.display, fontSize: px(lv.name.length > 14 ? 118 : 160), lineHeight: 1, letterSpacing: px(6), color: lv.accent, margin: `${px(8)}px 0 ${px(18)}px`, opacity: title.opacity, transform: title.transform, filter: `${title.filter} drop-shadow(0 ${px(10)}px ${px(40)}px ${lv.accent}66)` }}>
          {lv.name}
        </div>
        <div style={{ fontFamily: FONTS.display, fontSize: px(52), letterSpacing: px(3), color: '#fff', opacity: meta.opacity, transform: meta.transform }}>
          <b style={{ color: lv.accent, fontWeight: 400 }}>{levelCount(level)}</b> BRANDS ·{' '}
          <b style={{ color: lv.accent, fontWeight: 400 }}>{COUNTDOWN_SECONDS}</b> SECONDS EACH
        </div>
        <div style={{ marginTop: px(26), height: px(4), width: px(560) * pop, borderRadius: px(4), background: `linear-gradient(90deg, transparent, ${lv.accent}, transparent)` }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const H = settings.text.hook;

/** Hook scene B: the three scoring rules (same copy as the main video's hook). */
const RulesScene: React.FC<{ frame: number }> = ({ frame }) => {
  const exitP = prog(frame, T.introB - 12, 12, linear);
  const eyebrow = revealIn(frame, 0, 14, 18);
  const r1 = slamIn(frame, 4, 14);
  const r2 = prog(frame, 38, 20, backOut);
  const r3 = prog(frame, 84, 20, backOut);
  const row = (p: number): React.CSSProperties => ({
    fontFamily: FONTS.display,
    fontSize: px(58),
    letterSpacing: px(4),
    textAlign: 'center',
    opacity: Math.min(1, Math.max(0, p)),
    transform: `translate3d(0, ${(1 - p) * 30 * K}px, 0)`,
  });
  return (
    <AbsoluteFill>
      <Background frame={frame} theme={['#2563EB', '#06214F']} />
      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', opacity: 1 - exitP, transform: `scale(${1 - 0.07 * exitP})` }}>
        <div style={{ fontFamily: FONTS.display, fontSize: px(32), letterSpacing: px(10), color: 'rgba(255,255,255,0.8)', marginBottom: px(22), opacity: eyebrow.opacity, transform: eyebrow.transform }}>
          {H.rulesEyebrow}
        </div>
        <div style={{ fontFamily: FONTS.display, fontSize: px(74), lineHeight: 1.05, letterSpacing: px(4), textAlign: 'center', opacity: r1.opacity, transform: r1.transform, filter: r1.filter }}>
          {H.r1a} <span style={{ color: COLORS.redSoft }}>{H.r1b}</span> {H.r1c}
        </div>
        <div style={{ ...row(r2), marginTop: px(26) }}>
          {H.r2a} <b style={{ color: COLORS.yellow, fontWeight: 400 }}>{H.r2b}</b>
        </div>
        <div style={{ ...row(r3), marginTop: px(20) }}>
          {H.r3a} <b style={{ color: COLORS.yellow, fontWeight: 400 }}>{H.r3b}</b> {H.r3c}{' '}
          <b style={{ color: COLORS.yellow, fontWeight: 400 }}>{H.r3d}</b>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Intro = title (3 s) then the scoring rules (4 s). */
export const PixelIntro: React.FC<{ frame: number }> = ({ frame }) =>
  frame < T.introA ? <TitleScene frame={frame} /> : <RulesScene frame={frame - T.introA} />;
