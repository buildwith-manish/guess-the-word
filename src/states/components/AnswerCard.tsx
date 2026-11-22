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
import React from 'react';
import { useDesignFrame } from '../../clock';
import { SAFE_X, SAFE_Y, S, px } from '../../style';
import { IOS } from '../../ios';
import { DUR, enter, exitTicks, iosOut, leave, spr, stagger } from '../motion';
import {RADIUS, glassPanel, COLOR, FONT, WEIGHT } from '../look';
import { VoiceBars } from './VoiceBars';
import { WIDTH, HEIGHT } from '../state-timing';
import { getState } from '../states-data';
import { CAPITAL_LOOK, fitCapitalRow, fitNameSize, fitVoiceBars } from '../capital-fit';
import type { MeasureFn } from '../capital-fit';
import { domMeasure as measure, fallbackMeasure as fallback, useFontsReady } from '../measure-dom';

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
  radius: 30,
  padX: 48,
  padY: 48,
  gap: 24,
  chipFont: 30,
  chipSpacing: 3.6,
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
  const w = ready ? measure(key, { fontFamily: FONT.sans, fontWeight: WEIGHT.strong, fontSize: sz, letterSpacing: ls }) : key.length * sz * 0.8 + key.length * ls;
  return w + 2 * px(LOOK.chipPadX);
};

export const AnswerCard: React.FC<AnswerCardProps> = ({ stateKey, at, accent, box, exit, frame, nameAt, capitalAt, voice }) => {
  const designFrame = useDesignFrame();
  const f = frame ?? designFrame;
  const info = getState(stateKey);
  const fontsReady = useFontsReady('AnswerCard fonts');

  // the card settles (normal), then the chip follows 2 ticks later; name and capital come in when they are spoken (quick)
  const settle = enter(f, at, 'normal', 14);
  const chipIn = enter(f, at + stagger(1), 'quick', 12);
  const nameIn = enter(f, nameAt ?? at, 'quick', 18);
  const capIn = enter(f, capitalAt ?? at, 'quick', 14);
  const speaking = voice ? spr(f, voice.start - 3, 'quick') * (1 - iosOut((f - (voice.start + voice.frames)) / exitTicks(DUR.uiShort))) : 0;

  // exit: about 70% of the entrance, iosOut, no bounce (inside plan.exit .. plan.duration)
  const out = exit === undefined ? undefined : leave(f, exit, exitTicks(DUR.uiLong), 12);
  const exitOpacity = out ? out.opacity : 1;

  // fit inside the safe area
  const maxW = WIDTH - 2 * SAFE_X;
  const maxH = HEIGHT - 2 * SAFE_Y;
  const cardW = Math.min(box ? box.w : S.resultW, maxW);
  const innerW = cardW - 2 * px(LOOK.padX);
  const name = info.name;
  const m: MeasureFn = fontsReady ? measure : fallback;
  // name: sized from its real width (max NAME_LOOK.max, with headroom for the glow-flash scale)
  const nameSize = fitNameSize(name, innerW, FONT.sans, m, WEIGHT.strong).size;

  // capital row: measured, scaled or stacked so it always sits inside innerW
  const cap = fitCapitalRow({
    label: LABELS.capital,
    capital: info.capital,
    innerW,
    fontFamily: FONT.sans,
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
          ...glassPanel(px(RADIUS.card), accent),
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
          transform: `${settle.transform} ${out ? out.transform : ''}`,
        }}
      >
        <div
          style={{
            opacity: chipIn.opacity,
            transform: chipIn.transform,
            fontFamily: FONT.sans,
            fontWeight: WEIGHT.strong,
            fontSize: px(LOOK.chipFont),
            letterSpacing: px(LOOK.chipSpacing),
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            color: accent,
            background: COLOR.fillStrong,
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
            fontFamily: FONT.sans,
            fontWeight: WEIGHT.strong,
            letterSpacing: -nameSize * 0.02,
            fontSize: nameSize,
            lineHeight: 1,
            whiteSpace: 'nowrap',
            color: COLOR.text.primary,
            opacity: nameIn.opacity,
            transform: nameIn.transform,
          }}
        >
          {name}
        </div>

        {/* capital: the row's space (cap.height) is reserved from the first frame, so the card never jumps while it fades in */}
        <div
          style={{
            fontFamily: FONT.sans,
            color: COLOR.text.primary,
            width: '100%',
            height: cap.height,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            whiteSpace: 'nowrap',
            lineHeight: CAPITAL_LOOK.lineHeight,
            opacity: capIn.opacity,
            transform: capIn.transform,
          }}
        >
          {cap.mode === 'inline' ? (
            <div style={{ fontSize: cap.valueSize, whiteSpace: 'nowrap' }}>
              <span style={{ fontWeight: CAPITAL_LOOK.labelWeight, color: COLOR.text.label, letterSpacing: cap.labelSpacing, marginRight: cap.labelMargin }}>{LABELS.capital}</span>
              <span style={{ fontWeight: CAPITAL_LOOK.valueWeight, whiteSpace: 'nowrap' }}>{info.capital}</span>
            </div>
          ) : (
            <>
              <div style={{ fontSize: cap.labelSize, fontWeight: CAPITAL_LOOK.labelWeight, color: COLOR.text.label, letterSpacing: cap.labelSpacing, whiteSpace: 'nowrap' }}>{LABELS.capital}</div>
              <div style={{ fontSize: cap.valueSize, fontWeight: CAPITAL_LOOK.valueWeight, marginTop: cap.stackGap, whiteSpace: 'nowrap' }}>{info.capital}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
