/**
 * AnswerCard: the reveal card. State name very large, two-letter chip, capital, nickname and a fact line
 * (hidden when the fact is empty or withFact is false). Stamp-in = anim.ts slamIn (scale-down slam), then a
 * short decaying shake once it lands. 2D card (see docs): Card3D is word + clue-image specific, and RevealStyle
 * wraps children but brings its own reveal styles and needs `exit` / `questionId`, so neither fits this prop set.
 * Kept inside the 5% safe margin (SAFE_X / SAFE_Y). Time from useDesignFrame() unless `frame` is passed.
 */
import React from 'react';
import { useDesignFrame } from '../../clock';
import { COLORS, FONTS, SAFE_X, SAFE_Y, S, glass, px } from '../../style';
import { ms, slamIn, prog, cssEaseIn } from '../../anim';
import { WIDTH, HEIGHT } from '../state-timing';
import { getState } from '../states-data';

export interface AnswerCardProps {
  /** two-letter key */
  stateKey: string;
  /** tick the stamp starts */
  at: number;
  /** level accent colour */
  accent: string;
  /** show the fact line (still hidden when the state's fact is empty); default true */
  withFact?: boolean;
  /** optional tick the card fades out (e.g. the plan's `exit`) */
  exit?: number;
  /** optional ticks from the parent; default useDesignFrame() */
  frame?: number;
}

/** UI words on the card. */
const LABELS = { capital: 'CAPITAL' };

/** Layout proportions (1280x720 reference units go through px()) and stamp timing. */
const LOOK = {
  radius: 28,
  padX: 56,
  padY: 44,
  gap: 20,
  /** name font: largest size (ref px) and Anton's approximate average glyph width in em, used to fit long names */
  nameMax: 190,
  antonWidth: 0.5,
  chipFont: 30,
  capitalFont: 44,
  nicknameFont: 40,
  factFont: 32,
  stampMs: 520,
  shakeMs: 380,
  shakeCycles: 3,
  /** shake amplitude, ref px */
  shake: 9,
  exitMs: 380,
};

export const AnswerCard: React.FC<AnswerCardProps> = ({ stateKey, at, accent, withFact = true, exit, frame }) => {
  const designFrame = useDesignFrame();
  const f = frame ?? designFrame;
  const info = getState(stateKey);

  const stampTicks = ms(LOOK.stampMs);
  const slam = slamIn(f, at, stampTicks);

  // shake after landing, decaying
  const landed = at + stampTicks;
  const sp = prog(f, landed, ms(LOOK.shakeMs));
  const amp = f >= landed && sp < 1 ? px(LOOK.shake) * Math.pow(1 - sp, 2) : 0;
  const phase = 2 * Math.PI * LOOK.shakeCycles * sp;
  const dx = amp * Math.sin(phase);
  const dy = amp * 0.6 * Math.cos(phase * 1.3);

  const exitOpacity = exit === undefined ? 1 : 1 - prog(f, exit, ms(LOOK.exitMs), cssEaseIn);

  // fit inside the safe area
  const maxW = WIDTH - 2 * SAFE_X;
  const maxH = HEIGHT - 2 * SAFE_Y;
  const cardW = Math.min(S.resultW, maxW);
  const innerW = cardW - 2 * px(LOOK.padX);
  const name = info.name.toUpperCase();
  const nameSize = Math.min(px(LOOK.nameMax), innerW / (name.length * LOOK.antonWidth));
  const showFact = withFact && info.fact.trim().length > 0;

  return (
    <div
      style={{
        position: 'absolute',
        left: SAFE_X,
        top: SAFE_Y,
        width: maxW,
        height: maxH,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        opacity: slam.opacity * exitOpacity,
      }}
    >
      <div
        style={{
          ...glass(px(LOOK.radius), 0.1),
          width: cardW,
          maxHeight: maxH,
          boxSizing: 'border-box',
          padding: `${px(LOOK.padY)}px ${px(LOOK.padX)}px`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: px(LOOK.gap),
          border: `${px(3)}px solid ${accent}`,
          boxShadow: `0 0 ${px(40)}px ${accent}55, 0 ${px(14)}px ${px(40)}px rgba(0,0,0,0.45)`,
          transform: `translate(${dx}px, ${dy}px) ${slam.transform}`,
          filter: slam.filter,
        }}
      >
        <div
          style={{
            fontFamily: FONTS.body,
            fontWeight: 800,
            fontSize: px(LOOK.chipFont),
            letterSpacing: px(4),
            color: COLORS.inkDark,
            background: accent,
            borderRadius: px(LOOK.chipFont),
            padding: `${px(4)}px ${px(22)}px`,
          }}
        >
          {info.key}
        </div>

        <div
          style={{
            fontFamily: FONTS.display,
            fontSize: nameSize,
            lineHeight: 1,
            whiteSpace: 'nowrap',
            color: COLORS.ink,
            textShadow: `0 0 ${px(28)}px ${accent}`,
          }}
        >
          {name}
        </div>

        <div style={{ fontFamily: FONTS.body, fontSize: px(LOOK.capitalFont), color: COLORS.ink }}>
          <span style={{ fontWeight: 600, color: COLORS.muted, letterSpacing: px(3), marginRight: px(14) }}>{LABELS.capital}</span>
          <span style={{ fontWeight: 800 }}>{info.capital}</span>
        </div>

        <div style={{ fontFamily: FONTS.body, fontWeight: 600, fontStyle: 'italic', fontSize: px(LOOK.nicknameFont), color: accent }}>
          {`\u201C${info.nickname}\u201D`}
        </div>

        {showFact && (
          <div style={{ fontFamily: FONTS.body, fontWeight: 600, fontSize: px(LOOK.factFont), color: COLORS.muted, maxWidth: innerW }}>
            {info.fact}
          </div>
        )}
      </div>
    </div>
  );
};
