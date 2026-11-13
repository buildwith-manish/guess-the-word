import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Background } from '../Background';
import { COLORS, FONTS, K, px } from '../style';
import { prog, revealIn, slamIn } from '../anim';
import { backOut, linear } from '../gsap-helpers';
import { BRANDS, PIXEL_LEVELS, imageFile } from './brands';
import { PixelCanvas } from './PixelCanvas';
import settings from '../../settings.json';
import { LEVEL_COUNT, COUNTDOWN_SECONDS, PIXEL_TOTAL, T, levelCount } from './pixel-timing';

/**
 * Hook scene A (cold open): the screen is never still. Six real brand packs sit as a wall of blurry
 * blocks while a "scan" sweeps across and briefly sharpens one tile at a time (you catch yourself
 * guessing before any rule is said), the title slams in on top.
 */
const WALL = [3, 8, 13, 28, 32, 45]; // Cheerios, Tropicana, Kraft, Doritos, Pringles, DiGiorno
const TILE = 188;
const GAP = 12;
const wallCells = (frame: number, i: number) => {
  const sweep = (frame * 0.1) % (WALL.length + 2);
  const d = Math.abs(sweep - i);
  return d < 0.35 ? 22 : d < 0.8 ? 12 : 6;
};
const TitleScene: React.FC<{ frame: number; a: number }> = ({ frame, a: dur }) => {
  const a = slamIn(frame, 3, 16);
  const b = slamIn(frame, 18, 16);
  const c = revealIn(frame, 46, 16, 20);
  const out = 1 - prog(frame, dur - 8, 8, linear);
  const wallW = WALL.length * TILE + (WALL.length - 1) * GAP;
  return (
    <AbsoluteFill>
      <Background frame={frame} theme={['#6D5BFF', '#0B0A2E']} />
      <AbsoluteFill style={{ opacity: out }}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-start', display: 'flex', flexDirection: 'column', textAlign: 'center', paddingTop: px(52) }}>
        <div style={{ fontFamily: FONTS.display, fontSize: px(84), lineHeight: 1.05, color: COLORS.ink, opacity: a.opacity, transform: a.transform, filter: a.filter, textShadow: `0 ${px(6)}px ${px(24)}px rgba(0,0,0,0.6)` }}>
          CAN YOU NAME THE BRAND
        </div>
        <div style={{ fontFamily: FONTS.display, fontSize: px(112), lineHeight: 1.05, color: COLORS.yellow, opacity: b.opacity, transform: b.transform, filter: b.filter, textShadow: `0 ${px(6)}px ${px(24)}px rgba(0,0,0,0.6)` }}>
          FROM A FEW PIXELS?
        </div>
      </AbsoluteFill>
      <div style={{ position: 'absolute', left: '50%', top: px(318), width: px(wallW), marginLeft: -px(wallW) / 2, display: 'flex', gap: px(GAP) }}>
        {WALL.map((id, i) => {
          const p = prog(frame, 6 + i * 4, 14, backOut);
          const sharp = wallCells(frame, i) > 6;
          return (
            <div
              key={id}
              style={{
                width: px(TILE),
                height: px(TILE),
                borderRadius: px(14),
                overflow: 'hidden',
                border: `${px(4)}px solid ${sharp ? COLORS.yellow : 'rgba(255,255,255,0.8)'}`,
                opacity: Math.min(1, p * 1.4),
                transform: `translate3d(0, ${(1 - p) * 40 * K}px, 0) scale(${0.8 + 0.2 * p})`,
                boxShadow: sharp ? `0 0 ${px(30)}px ${COLORS.yellow}` : `0 ${px(10)}px ${px(26)}px rgba(0,0,0,0.5)`,
                background: '#000',
              }}
            >
              <PixelCanvas file={imageFile(id)} palette={BRANDS[id - 1].palette} seed={id} cells={wallCells(frame, i)} size={px(TILE)} />
            </div>
          );
        })}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: px(566), textAlign: 'center', fontFamily: FONTS.body, fontWeight: 800, fontSize: px(22), letterSpacing: px(6), color: COLORS.ink, opacity: c.opacity, transform: c.transform }}>
        {PIXEL_TOTAL} FOOD BRANDS · {COUNTDOWN_SECONDS} SECONDS EACH
      </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** "LEVEL 2 / 4 — LUNCH & PANTRY — 13 BRANDS" */
export const PixelLevelCard: React.FC<{ frame: number; level: number; duration?: number }> = ({ frame, level, duration = T.levelCard }) => {
  const lv = PIXEL_LEVELS[level];
  const eyebrow = revealIn(frame, 2, 14, 18);
  const title = slamIn(frame, 10, 16);
  const meta = revealIn(frame, 30, 16, 22);
  const pop = prog(frame, 8, 18, backOut);
  const exit = prog(frame, duration - 10, 10, linear);
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

type IntroPlan = { a: number; b: number; ruleSpan: number; countAt: number };

/**
 * Hook scene B: three rule cards pop in WHILE the rules line is spoken (spread over its length),
 * a "fastest guess" tease keeps curiosity up, then 3 - 2 - 1 cuts straight into level 1.
 */
const RULE_CARDS = [
  { emoji: '❌', head: 'EVERY WRONG ANSWER COUNTS', accent: COLORS.red, at: 0 },
  { emoji: '⚡', head: 'BONUS ROUND ERASES 1 WRONG', accent: COLORS.yellow, at: 0.34 },
  { emoji: '👑', head: 'UNDER 4 WRONG = LEGEND', accent: COLORS.cyan, at: 0.64 },
];
const RulesScene: React.FC<{ frame: number; plan: IntroPlan }> = ({ frame, plan }) => {
  const exitP = prog(frame, plan.b - 8, 8, linear);
  const eyebrow = revealIn(frame, 0, 14, 18);
  const countF = frame - plan.countAt;
  const counting = countF >= 0;
  const digit = counting ? 3 - Math.min(2, Math.floor(countF / 15)) : 0;
  const dF = counting ? countF % 15 : 0;
  const dp = prog(dF, 0, 8, backOut);
  const tease = prog(frame, 4 + plan.ruleSpan * 0.64 + 12, 16, backOut);
  const dim = counting ? 0.25 : 1;
  return (
    <AbsoluteFill>
      <Background frame={frame} theme={['#2563EB', '#06214F']} />
      <AbsoluteFill style={{ opacity: 1 - exitP, transform: `scale(${1 - 0.05 * exitP})`, color: '#fff' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: px(84), textAlign: 'center', fontFamily: FONTS.display, fontSize: px(40), letterSpacing: px(10), color: 'rgba(255,255,255,0.85)', opacity: eyebrow.opacity * dim, transform: eyebrow.transform }}>
          THE RULES
        </div>
        <div style={{ position: 'absolute', left: '50%', top: px(170), width: px(1188), marginLeft: -px(1188) / 2, display: 'flex', gap: px(24), opacity: dim }}>
          {RULE_CARDS.map((r, i) => {
            const p = prog(frame, 4 + plan.ruleSpan * r.at, 18, backOut);
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: px(300),
                  borderRadius: px(22),
                  background: 'rgba(255,255,255,0.09)',
                  border: `${px(4)}px solid ${r.accent}`,
                  boxShadow: `0 0 ${px(26)}px ${r.accent}55, 0 ${px(16)}px ${px(40)}px rgba(0,0,0,0.45)`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: px(18),
                  textAlign: 'center',
                  padding: `0 ${px(24)}px`,
                  opacity: Math.min(1, Math.max(0, p)),
                  transform: `translate3d(0, ${(1 - p) * 50 * K}px, 0) scale(${0.85 + 0.15 * p})`,
                }}
              >
                <span style={{ fontFamily: FONTS.emoji, fontSize: px(92), lineHeight: 1 }}>{r.emoji}</span>
                <span style={{ fontFamily: FONTS.display, fontSize: px(42), lineHeight: 1.08, letterSpacing: px(2), color: r.accent }}>{r.head}</span>
              </div>
            );
          })}
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: px(512), textAlign: 'center', opacity: Math.min(1, Math.max(0, tease)) * dim, transform: `translate3d(0, ${(1 - tease) * 20 * K}px, 0)` }}>
          <span style={{ display: 'inline-block', fontFamily: FONTS.body, fontWeight: 800, fontSize: px(24), letterSpacing: px(3), padding: `${px(12)}px ${px(28)}px`, borderRadius: px(40), background: 'rgba(255,255,255,0.12)', border: `${px(2)}px solid rgba(255,255,255,0.4)` }}>
            ⚡ WATCH FOR THE 3-SECOND FASTEST GUESS ROUNDS
          </span>
        </div>
        {counting ? (
          <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontFamily: FONTS.body, fontWeight: 800, fontSize: px(26), letterSpacing: px(12), marginBottom: px(6), color: 'rgba(255,255,255,0.9)' }}>GET READY</div>
            <div style={{ fontFamily: FONTS.display, fontSize: px(300), lineHeight: 1, color: COLORS.yellow, opacity: Math.min(1, dp * 1.5), transform: `scale(${0.6 + 0.4 * dp})`, textShadow: `0 0 ${px(60)}px ${COLORS.yellow}88, 0 ${px(12)}px ${px(40)}px rgba(0,0,0,0.6)` }}>
              {digit}
            </div>
          </AbsoluteFill>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Intro = cold open + title, then the rule cards + 3-2-1 (both stretch to the voiceover). */
export const PixelIntro: React.FC<{ frame: number; plan: IntroPlan }> = ({ frame, plan }) =>
  frame < plan.a ? <TitleScene frame={frame} a={plan.a} /> : <RulesScene frame={frame - plan.a} plan={plan} />;
