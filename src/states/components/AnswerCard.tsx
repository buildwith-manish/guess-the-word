/**
 * AnswerCard: the reveal card. State name very large, two-letter chip and the capital (nickname and fact
 * lines were removed on request; the map beside the card is the extra). With `box` it sits in a left/width
 * column, vertically centred, instead of the centred default. iOS look: the card settles in on the shared spring (no slam, no shake, no glow), frosted with a hairline edge. 2D card (see docs): Card3D is word + clue-image specific, and RevealStyle
 * wraps children but brings its own reveal styles and needs `exit` / `questionId`, so neither fits this prop set.
 * Voiceover timing (optional): the card slams in at `at` with the state key chip; the NAME appears at `nameAt` and the
 * CAPITAL at `capitalAt` (the ticks they are spoken, from the plan), and a small VoiceBars indicator follows the reveal
 * clip (`voice`) while it plays. The space of both lines is reserved, so the card never jumps. Without `nameAt` /
 * `capitalAt` everything shows at the stamp, as before.
 * The capital row is measured with the real font (capital-fit.ts): one line if it fits the inner width, scaled down to
 * at most 60% of the normal size, otherwise stacked (small label above, the city below). Its height is fixed per state.
 * Kept inside the 5% safe margin (SAFE_X / SAFE_Y). Time from useDesignFrame() unless `frame` is passed.
 */
import React, { useEffect, useState } from 'react';
import { continueRender, delayRender } from 'remotion';
import { measureText } from '@remotion/layout-utils';
import { useDesignFrame } from '../../clock';
import { SAFE_X, SAFE_Y, S, px } from '../../style';
import { IOS, iosSurface, spring } from '../../ios';
import { ms, prog, cssEaseIn, cssEaseOut } from '../../anim';
import { VoiceBars } from './VoiceBars';
import { WIDTH, HEIGHT } from '../state-timing';
import { getState } from '../states-data';
import { CAPITAL_LOOK, fitCapitalRow, fitNameSize, fitVoiceBars } from '../capital-fit';
import type { MeasureFn } from '../capital-fit';

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
const LABELS = { capital: 'Capital' };

/** Layout proportions (1280x720 reference units go through px()) and stamp timing. */
const LOOK = {
  radius: 30,
  padX: 56,
  padY: 44,
  gap: 20,
  chipFont: 30,
  chipSpacing: 1,
  chipPadX: 22,
  chipPadY: 4,
  /** gap kept between the voice bars and the key chip */
  barsGap: 16,
  stampMs: 420,
  exitMs: 380,
  /** a spoken line fades / rises in over this long, the name's glow flash lasts flashMs */
  lineMs: 280,
  /** voice indicator box, ref px */
  barsW: 74,
  barsH: 36,
};

/** Real text width through @remotion/layout-utils (needs the fonts loaded: see `fontsReady` below). */
const measure_chip = (ready: boolean, key: string): number => {
  const sz = px(LOOK.chipFont);
  const ls = px(LOOK.chipSpacing);
  const w = ready ? measure(key, { fontFamily: IOS.font, fontWeight: IOS.weight.semibold, fontSize: sz, letterSpacing: ls }) : key.length * sz * 0.8 + key.length * ls;
  return w + 2 * px(LOOK.chipPadX);
};

const measure: MeasureFn = (text, o) =>
  measureText({ text, fontFamily: o.fontFamily, fontWeight: String(o.fontWeight), fontSize: o.fontSize, letterSpacing: `${o.letterSpacing}px`, validateFontIsLoaded: false }).width;

/** Inter is loaded in src/ios/fonts.ts; hold the frame until the browser has them so nothing is measured with a fallback face. */
const useFontsReady = (): boolean => {
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender('AnswerCard fonts'));
  useEffect(() => {
    let live = true;
    Promise.all(['500 20px Inter', '600 20px Inter', '700 20px Inter'].map((f) => document.fonts.load(f)))
      .catch(() => undefined)
      .then(() => {
        if (!live) return;
        setReady(true);
        continueRender(handle);
      });
    return () => {
      live = false;
    };
  }, [handle]);
  return ready;
};

export const AnswerCard: React.FC<AnswerCardProps> = ({ stateKey, at, accent, box, exit, frame, nameAt, capitalAt, voice }) => {
  const designFrame = useDesignFrame();
  const f = frame ?? designFrame;
  const info = getState(stateKey);
  const fontsReady = useFontsReady();

  const stampTicks = ms(LOOK.stampMs);
  const k = spring((f - at) / stampTicks);
  const settle = { opacity: Math.min(1, k * 1.4), transform: `scale(${0.94 + 0.06 * k})` };

  // name and capital come in when they are spoken (a short rise + fade)
  const nameP = prog(f, nameAt ?? at, ms(LOOK.lineMs), cssEaseOut);
  const capP = prog(f, capitalAt ?? at, ms(LOOK.lineMs), cssEaseOut);
  const speaking = voice ? prog(f, voice.start - 3, 5, cssEaseOut) * (1 - prog(f, voice.start + voice.frames, 6, cssEaseOut)) : 0;

  const exitOpacity = exit === undefined ? 1 : 1 - prog(f, exit, ms(LOOK.exitMs), cssEaseIn);

  // fit inside the safe area
  const maxW = WIDTH - 2 * SAFE_X;
  const maxH = HEIGHT - 2 * SAFE_Y;
  const cardW = Math.min(box ? box.w : S.resultW, maxW);
  const innerW = cardW - 2 * px(LOOK.padX);
  const name = info.name;
  const fallback: MeasureFn = (t, o) => t.length * o.fontSize * 0.8 + t.length * o.letterSpacing; // only until the fonts are ready
  const m: MeasureFn = fontsReady ? measure : fallback;
  // name: sized from its real width (max NAME_LOOK.max, with headroom for the glow-flash scale)
  const nameSize = fitNameSize(name, innerW, IOS.font, m, IOS.weight.bold).size;

  // capital row: measured, scaled or stacked so it always sits inside innerW
  const cap = fitCapitalRow({
    label: LABELS.capital,
    capital: info.capital,
    innerW,
    fontFamily: IOS.font,
    measure: m,
  });

  // voice bars sit in the chip's row, to the right of the (centred) chip, and shrink / hide rather than touch it
  const chipW = measure_chip(fontsReady, info.key);
  const chipH = px(LOOK.chipFont) * 1.2 + 2 * px(LOOK.chipPadY);
  const rightInset = px(LOOK.padX * 0.6);
  const bars = fitVoiceBars(cardW, chipW, rightInset, px(LOOK.barsW), px(LOOK.barsGap));
  const barsH = px(LOOK.barsH) * (bars.width / px(LOOK.barsW));

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
        opacity: settle.opacity * exitOpacity,
      }}
    >
      <div
        style={{
          ...iosSurface(px(LOOK.radius)),
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
          transform: settle.transform,
        }}
      >
        <div
          style={{
            fontFamily: IOS.font,
            fontWeight: IOS.weight.semibold,
            fontSize: px(LOOK.chipFont),
            letterSpacing: px(LOOK.chipSpacing),
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            color: accent,
            background: IOS.color.fillStrong,
            borderRadius: px(LOOK.chipFont),
            padding: `${px(LOOK.chipPadY)}px ${px(LOOK.chipPadX)}px`,
          }}
        >
          {info.key}
        </div>

        {voice && bars.show ? (
          <div style={{ position: 'absolute', right: rightInset, top: px(LOOK.padY) + (chipH - barsH) / 2, opacity: speaking }}>
            <VoiceBars file={voice.file} tick={f - voice.start} color={accent} width={bars.width} height={barsH} />
          </div>
        ) : null}

        <div
          style={{
            fontFamily: IOS.font,
            fontWeight: IOS.weight.bold,
            letterSpacing: -nameSize * 0.02,
            fontSize: nameSize,
            lineHeight: 1,
            whiteSpace: 'nowrap',
            color: IOS.color.label,
            opacity: nameP,
            transform: `translateY(${px(18) * (1 - nameP)}px)`,
          }}
        >
          {name}
        </div>

        {/* capital: the row's space (cap.height) is reserved from the first frame, so the card never jumps while it fades in */}
        <div
          style={{
            fontFamily: IOS.font,
            color: IOS.color.label,
            width: '100%',
            height: cap.height,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            whiteSpace: 'nowrap',
            lineHeight: CAPITAL_LOOK.lineHeight,
            opacity: capP,
            transform: `translateY(${px(14) * (1 - capP)}px)`,
          }}
        >
          {cap.mode === 'inline' ? (
            <div style={{ fontSize: cap.valueSize, whiteSpace: 'nowrap' }}>
              <span style={{ fontWeight: CAPITAL_LOOK.labelWeight, color: IOS.color.secondary, letterSpacing: cap.labelSpacing, marginRight: cap.labelMargin }}>{LABELS.capital}</span>
              <span style={{ fontWeight: CAPITAL_LOOK.valueWeight, whiteSpace: 'nowrap' }}>{info.capital}</span>
            </div>
          ) : (
            <>
              <div style={{ fontSize: cap.labelSize, fontWeight: CAPITAL_LOOK.labelWeight, color: IOS.color.secondary, letterSpacing: cap.labelSpacing, whiteSpace: 'nowrap' }}>{LABELS.capital}</div>
              <div style={{ fontSize: cap.valueSize, fontWeight: CAPITAL_LOOK.valueWeight, marginTop: cap.stackGap, whiteSpace: 'nowrap' }}>{info.capital}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
