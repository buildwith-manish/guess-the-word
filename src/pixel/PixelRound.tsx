import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Background } from '../Background';
import { Watermark } from '../Watermark';
import { Hud } from '../Hud';
import { COLORS, FONTS, glass, px } from '../style';
import { prog, revealIn, slamIn, breathe } from '../anim';
import { backOut, power3Out, linear } from '../gsap-helpers';
import { BRANDS, PIXEL_LEVELS, imageFile } from './brands';
import { COUNTDOWN_SECONDS, FPS, PIXEL_STEPS, PIXEL_TOTAL, T } from './pixel-timing';
import { PixelCanvas } from './PixelCanvas';

const BOX = px(400); // the picture is a square
const mix = (a: number, b: number, k: number) => a + (b - a) * k;

/**
 * One question. frame = design frames (30 fps) since the segment started.
 *   0 .. lead            picture pops in at the coarsest grid
 *   lead .. +150         countdown: the grid gets finer every second
 *   +150 .. +10          pixels resolve into the full picture
 *   then                 answer chip + hold
 */
export const PixelRound: React.FC<{ frame: number; index: number; erases: number }> = ({ frame, index, erases }) => {
  const brand = BRANDS[index];
  const level = PIXEL_LEVELS[brand.level];
  const theme: [string, string] = [level.accent, level.bg];

  const timerStart = T.lead;
  const revealAt = timerStart + T.countdown;
  const t = frame - timerStart; // frames into the countdown
  const revealed = frame >= revealAt;

  // --- which grid are we on? -------------------------------------------------
  const stepIdx = Math.max(0, Math.min(PIXEL_STEPS.length - 1, Math.floor(t / FPS)));
  let cells: number | null = PIXEL_STEPS[stepIdx];
  if (revealed) {
    const p = prog(frame, revealAt, T.sharpen, power3Out);
    cells = p >= 1 ? null : Math.round(mix(PIXEL_STEPS[PIXEL_STEPS.length - 1], 220, p));
  }

  // a small "pop" every time the grid refines (tension)
  const sinceStep = t < 0 ? 99 : t - stepIdx * FPS;
  const pop = revealed ? 0 : 0.018 * (1 - prog(sinceStep, 0, 7, power3Out)) * (stepIdx > 0 ? 1 : 0);

  const enter = prog(frame, 0, 14, backOut);
  const fade = prog(frame, 0, 8, linear) * (1 - prog(frame, QUESTION_END, T.exit, linear));
  const secondsLeft = Math.max(0, COUNTDOWN_SECONDS - Math.max(0, t) / FPS);
  const low = !revealed && secondsLeft <= 2;
  const ringP = revealed ? 0 : Math.max(0, t) / T.countdown;
  const urgent = low ? 1 : 0;
  const stamp = slamIn(frame, revealAt + 6, 16);
  const glow = revealed ? prog(frame, revealAt, 12, power3Out) : 0;

  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <Background frame={frame} theme={theme} energy={revealed ? 1 : 0} />

      {/* title */}
      <div
        style={{
          position: 'absolute',
          top: px(24),
          width: '100%',
          textAlign: 'center',
          fontFamily: FONTS.display,
          fontSize: px(42),
          letterSpacing: px(8),
          color: COLORS.ink,
          textShadow: `0 ${px(6)}px ${px(24)}px rgba(0,0,0,0.5)`,
        }}
      >
        GUESS THE <span style={{ color: level.accent }}>BRAND</span>
      </div>

      {/* shared HUD: Q counter, progress bar, perfect STREAK, BONUS ERASES */}
      <Hud label="Q" number={brand.id} total={PIXEL_TOTAL} erases={erases} frame={frame} landedAt={revealAt} />
      <Watermark />

      {/* the pixelated picture */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: px(88),
          width: BOX,
          height: BOX,
          marginLeft: -BOX / 2,
          transform: `scale(${(0.86 + 0.14 * enter) * (1 + pop)})`,
          opacity: Math.min(1, enter * 1.4),
          borderRadius: px(18),
          overflow: 'hidden',
          border: `${px(5)}px solid ${revealed ? COLORS.green : 'rgba(255,255,255,0.85)'}`,
          boxShadow: revealed
            ? `0 0 ${px(60) * glow}px ${COLORS.green}, 0 ${px(24)}px ${px(60)}px rgba(0,0,0,0.55)`
            : `0 ${px(24)}px ${px(60)}px rgba(0,0,0,0.55)`,
          background: '#000',
        }}
      >
        <PixelCanvas file={imageFile(brand.id)} palette={brand.palette} seed={brand.id} cells={cells} size={BOX} />
      </div>

      {/* left: the resolution ladder */}
      <div
        style={{
          position: 'absolute',
          left: px(70),
          top: px(220),
          width: px(250),
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: px(14),
          opacity: revealIn(frame, 6, 14, 20).opacity,
        }}
      >
        <div style={{ fontFamily: FONTS.body, fontWeight: 800, fontSize: px(15), letterSpacing: px(5), color: COLORS.muted }}>
          RESOLUTION
        </div>
        <div style={{ fontFamily: FONTS.display, fontSize: px(84), lineHeight: 1, color: level.accent }}>
          {cells === null || revealed ? 'HD' : `${cells}×${cells}`}
        </div>
        <div style={{ display: 'flex', gap: px(8) }}>
          {PIXEL_STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                width: px(30),
                height: px(8),
                borderRadius: px(4),
                background: revealed || i <= stepIdx ? level.accent : 'rgba(255,255,255,0.2)',
                boxShadow: i === stepIdx && !revealed ? `0 0 ${px(14)}px ${level.accent}` : 'none',
              }}
            />
          ))}
        </div>
      </div>

      {/* right: neon countdown ring */}
      <div
        style={{
          position: 'absolute',
          right: px(80),
          top: px(190),
          width: px(240),
          height: px(240),
          opacity: revealIn(frame, 8, 14, 20).opacity,
          transform: `scale(${1 + urgent * 0.03 * Math.sin(frame * 0.9)})`,
        }}
      >
        <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="7" />
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke={revealed ? COLORS.green : low ? COLORS.red : COLORS.cyan}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 44}
            strokeDashoffset={2 * Math.PI * 44 * ringP}
            style={{ filter: `drop-shadow(0 0 3px ${revealed ? COLORS.green : low ? COLORS.red : COLORS.cyan})` }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: FONTS.display,
            fontSize: px(112),
            color: revealed ? COLORS.green : low ? COLORS.redSoft : COLORS.ink,
          }}
        >
          {revealed ? (
            <svg viewBox="0 0 24 24" width="52%" height="52%" fill="none" stroke={COLORS.green} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12.5l5 5L20 6.5" />
            </svg>
          ) : t < 0 ? (
            COUNTDOWN_SECONDS
          ) : (
            Math.ceil(secondsLeft)
          )}
        </div>
      </div>

      {/* bottom: prompt -> answer */}
      {!revealed ? (
        <div
          style={{
            ...glass(px(40)),
            position: 'absolute',
            bottom: px(78),
            left: '50%',
            transform: `translateX(-50%) scale(${1 + 0.02 * breathe(frame, 60)})`,
            padding: `${px(12)}px ${px(36)}px`,
            fontFamily: FONTS.body,
            fontWeight: 800,
            fontSize: px(24),
            letterSpacing: px(3),
            color: COLORS.ink,
            whiteSpace: 'nowrap',
          }}
        >
          WHICH FOOD BRAND IS THIS?
        </div>
      ) : (
        <div
          style={{
            position: 'absolute',
            bottom: px(56),
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: px(6),
            opacity: stamp.opacity,
            transform: stamp.transform,
            filter: stamp.filter,
          }}
        >
          <div style={{ fontFamily: FONTS.body, fontWeight: 800, fontSize: px(17), letterSpacing: px(6), color: COLORS.green }}>
            CORRECT ANSWER
          </div>
          <div
            style={{
              fontFamily: FONTS.display,
              fontSize: px(brand.name.length > 20 ? 54 : 70),
              letterSpacing: px(3),
              color: COLORS.yellow,
              textShadow: `0 ${px(6)}px ${px(26)}px rgba(0,0,0,0.6)`,
              whiteSpace: 'nowrap',
            }}
          >
            {brand.name.toUpperCase()}
          </div>
          <div style={{ fontFamily: FONTS.body, fontWeight: 600, fontSize: px(18), color: COLORS.muted }}>{brand.hint}</div>
        </div>
      )}
    </AbsoluteFill>
  );
};

/** frame (inside the segment) where the exit fade begins */
const QUESTION_END = T.lead + T.countdown + T.hold;
