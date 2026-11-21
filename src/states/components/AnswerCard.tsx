/**
 * AnswerCard: the reveal card. State name very large, two-letter chip and the capital (nickname and fact
 * lines were removed on request; the map beside the card is the extra). With `box` it sits in a left/width
 * column, vertically centred, instead of the centred default. Stamp-in = anim.ts slamIn (scale-down slam), then a
 * short decaying shake once it lands. 2D card (see docs): Card3D is word + clue-image specific, and RevealStyle
 * wraps children but brings its own reveal styles and needs `exit` / `questionId`, so neither fits this prop set.
 * Voiceover timing (optional): the card slams in at `at` with the state key chip; the NAME appears at `nameAt` and the
 * CAPITAL at `capitalAt` (the ticks they are spoken, from the plan), and a small VoiceBars indicator follows the reveal
 * clip (`voice`) while it plays. The space of both lines is reserved, so the card never jumps. Without `nameAt` /
 * `capitalAt` everything shows at the stamp, as before.
 * Kept inside the 5% safe margin (SAFE_X / SAFE_Y). Time from useDesignFrame() unless `frame` is passed.
 */
import React from 'react';
import { useDesignFrame } from '../../clock';
import { COLORS, FONTS, SAFE_X, SAFE_Y, S, glass, px } from '../../style';
import { ms, slamIn, prog, cssEaseIn, cssEaseOut } from '../../anim';
import { VoiceBars } from './VoiceBars';
import { WIDTH, HEIGHT } from '../state-timing';
import { getState } from '../states-data';

export interface AnswerCardProps {
  /** two-letter key */
  stateKey: string;
  /** tick the stamp starts */
  at: number;
  /** level accent colour */
  accent: string;
  /** optional column (px) the card fills: left edge and width; default centred, S.resultW wide */
  box?: { x: number; w: number };
  /** tick the state name shows (when it is spoken); default `at` */
  nameAt?: number;
  /** tick the capital shows (when it is spoken); default `at` */
  capitalAt?: number;
  /** the reveal clip (plan ticks): a voice indicator plays on the card while it is heard */
  voice?: { file: string; start: number; frames: number };
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
  stampMs: 520,
  shakeMs: 380,
  shakeCycles: 3,
  /** shake amplitude, ref px */
  shake: 9,
  exitMs: 380,
  /** a spoken line fades / rises in over this long, the name's glow flash lasts flashMs */
  lineMs: 280,
  flashMs: 520,
  /** voice indicator box, ref px */
  barsW: 74,
  barsH: 36,
};

export const AnswerCard: React.FC<AnswerCardProps> = ({ stateKey, at, accent, box, exit, frame, nameAt, capitalAt, voice }) => {
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

  // name and capital come in when they are spoken (a short rise + fade, the name with a glow flash)
  const nameP = prog(f, nameAt ?? at, ms(LOOK.lineMs), cssEaseOut);
  const capP = prog(f, capitalAt ?? at, ms(LOOK.lineMs), cssEaseOut);
  const nameFlash = Math.max(0, 1 - prog(f, nameAt ?? at, ms(LOOK.flashMs), cssEaseOut));
  const speaking = voice ? prog(f, voice.start - 3, 5, cssEaseOut) * (1 - prog(f, voice.start + voice.frames, 6, cssEaseOut)) : 0;

  const exitOpacity = exit === undefined ? 1 : 1 - prog(f, exit, ms(LOOK.exitMs), cssEaseIn);

  // fit inside the safe area
  const maxW = WIDTH - 2 * SAFE_X;
  const maxH = HEIGHT - 2 * SAFE_Y;
  const cardW = Math.min(box ? box.w : S.resultW, maxW);
  const innerW = cardW - 2 * px(LOOK.padX);
  const name = info.name.toUpperCase();
  const nameSize = Math.min(px(LOOK.nameMax), innerW / (name.length * LOOK.antonWidth));

  return (
    <div
      style={{
        position: 'absolute',
        left: box ? box.x : SAFE_X,
        top: SAFE_Y,
        width: box ? box.w : maxW,
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
          position: 'relative',
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

        {voice ? (
          <div style={{ position: 'absolute', right: px(LOOK.padX * 0.6), top: px(LOOK.padY * 0.7), opacity: speaking }}>
            <VoiceBars file={voice.file} tick={f - voice.start} color={accent} width={px(LOOK.barsW)} height={px(LOOK.barsH)} />
          </div>
        ) : null}

        <div
          style={{
            fontFamily: FONTS.display,
            fontSize: nameSize,
            lineHeight: 1,
            whiteSpace: 'nowrap',
            color: COLORS.ink,
            textShadow: `0 0 ${px(28 + 40 * nameFlash)}px ${accent}`,
            opacity: nameP,
            transform: `translateY(${px(18) * (1 - nameP)}px) scale(${1 + 0.06 * nameFlash})`,
          }}
        >
          {name}
        </div>

        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: px(LOOK.capitalFont),
            color: COLORS.ink,
            opacity: capP,
            transform: `translateY(${px(14) * (1 - capP)}px)`,
          }}
        >
          <span style={{ fontWeight: 600, color: COLORS.muted, letterSpacing: px(3), marginRight: px(14) }}>{LABELS.capital}</span>
          <span style={{ fontWeight: 800 }}>{info.capital}</span>
        </div>
      </div>
    </div>
  );
};
