/**
 * ComponentsSheet: one still frame showing every states component with real data for four states,
 * one per tier: Texas (EASY, outline), Colorado (MEDIUM, cropped), Virginia (HARD, rotated), Iowa (EXPERT, pixel).
 * Registered as the "ST-Components" Still in src/Root.tsx. Every component gets an explicit `frame`, so the sheet
 * does not depend on the Studio playhead. Top: four scaled question frames; second row: four scaled reveal frames;
 * bottom: loose specimens at real size.
 */
import React from 'react';
import { COLORS, FONTS, px } from '../style';
import { HEIGHT, WIDTH, LEVELS, buildQuestionPlan } from './state-timing';
import { STATES, getState } from './states-data';
import { AnswerCard } from './components/AnswerCard';
import { CropMask } from './components/CropMask';
import { EmojiFill } from './components/EmojiFill';
import { FlyIn } from './components/FlyIn';
import { MiniMap } from './components/MiniMap';
import { PixelReveal } from './components/PixelReveal';
import { STAGE_LAYOUT, StateStage } from './components/StateStage';
import { StateShape } from './components/StateShape';
import { TimerRing } from './components/TimerRing';

/** the four tiers (real data from states-data.ts) */
const TIER_KEYS = ['TX', 'CO', 'VA', 'IA'] as const;

/** sheet layout: scale of each mini frame (4 per row) and spacing */
const FRAME_SCALE = 1 / TIER_KEYS.length;
const GAP = 24;
/** where in the clock the question frames are sampled, and how far into the hold the reveal frames are */
const CLOCK_AT = 0.55;
const HOLD_AT = 0.5;
/** flight sampling for the FlyIn specimen */
const FLIGHT_DUR = 24;
const FLIGHT_AT = 0.5;

const Scaled: React.FC<{ x: number; y: number; caption: string; children: React.ReactNode }> = ({ x, y, caption, children }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: WIDTH * FRAME_SCALE, height: HEIGHT * FRAME_SCALE, overflow: 'hidden' }}>
    <div style={{ position: 'absolute', left: 0, top: 0, width: WIDTH, height: HEIGHT, transform: `scale(${FRAME_SCALE})`, transformOrigin: '0 0' }}>{children}</div>
    <div style={{ position: 'absolute', left: 8, bottom: 6, fontFamily: FONTS.body, fontWeight: 800, fontSize: 18, color: COLORS.ink, background: 'rgba(0,0,0,0.55)', padding: '2px 10px', borderRadius: 12 }}>{caption}</div>
  </div>
);

const Specimen: React.FC<{ caption: string; children: React.ReactNode }> = ({ caption, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
    {children}
    <div style={{ fontFamily: FONTS.body, fontWeight: 600, fontSize: 20, color: COLORS.muted }}>{caption}</div>
  </div>
);

export const ComponentsSheet: React.FC = () => {
  const colW = WIDTH * FRAME_SCALE;
  const rowH = HEIGHT * FRAME_SCALE;
  const L = STAGE_LAYOUT;

  const scene = (key: string) => {
    const info = getState(key);
    const plan = buildQuestionPlan(info.id - 1);
    const level = LEVELS[plan.levelIndex];
    const answered = STATES.filter((s) => s.id < info.id).map((s) => s.key);
    const qf = plan.timerStart + plan.timerFrames * CLOCK_AT;
    const rf = plan.stamp + plan.hold * HOLD_AT;
    const hint = plan.hintAt[plan.hintAt.length - 1];
    return { info, plan, level, answered, qf, rf, hint };
  };

  const question = (key: string) => {
    const { info, plan, level, answered, qf, hint } = scene(key);
    const box = L.shape.w;
    const rotation = info.rotation ?? 0;
    const emoji = <EmojiFill stateKey={key} size={box} at={hint} frame={qf} rotation={rotation} />;
    const shape = <StateShape stateKey={key} size={box} progress={1} glow={1} accent={level.accent} rotation={rotation} />;
    let body: React.ReactNode;
    if (info.level === 'EXPERT') {
      body = <PixelReveal stateKey={key} size={box} progress={(qf - plan.timerStart) / plan.timerFrames} accent={level.accent} at={plan.revealStart} dur={plan.stamp - plan.revealStart} frame={qf} />;
    } else if (info.level === 'MEDIUM' && info.cropSide) {
      body = (
        <CropMask side={info.cropSide} reveal={0} size={box}>
          <div style={{ position: 'relative', width: box, height: box }}>
            <div style={{ position: 'absolute', inset: 0 }}>{emoji}</div>
            <div style={{ position: 'absolute', inset: 0 }}>{shape}</div>
          </div>
        </CropMask>
      );
    } else {
      body = (
        <div style={{ position: 'relative', width: box, height: box }}>
          <div style={{ position: 'absolute', inset: 0 }}>{emoji}</div>
          <div style={{ position: 'absolute', inset: 0 }}>{shape}</div>
        </div>
      );
    }
    return (
      <StateStage
        level={info.level}
        number={info.id}
        frame={qf}
        slots={{
          title: { children: <div style={{ fontFamily: FONTS.display, fontSize: px(46), color: COLORS.ink, letterSpacing: px(6) }}>{info.level}</div> },
          ring: { children: <TimerRing from={plan.timerStart} duration={plan.timerFrames} accent={level.accent} size={L.ring.w} frame={qf} /> },
          shape: { children: body },
          miniMap: { children: <MiniMap answered={answered} current={key} size={L.miniMap.w} frame={qf} /> },
        }}
      />
    );
  };

  const reveal = (key: string) => {
    const { info, plan, level, answered, rf } = scene(key);
    const box = L.shape.w;
    const flying = key === TIER_KEYS[0];
    return (
      <StateStage
        level={info.level}
        number={info.id}
        frame={rf}
        energy={1}
        slots={{
          shape: flying ? undefined : { children: <StateShape stateKey={key} size={box} mode="filled" fill={1} glow={1} accent={level.accent} rotation={info.rotation ?? 0} /> },
          miniMap: { children: <MiniMap answered={flying ? answered : [...answered, key]} current={flying ? undefined : key} size={L.miniMap.w} frame={rf} /> },
          overlay: flying
            ? { children: <FlyIn stateKey={key} from={L.shape} to={L.miniMap} at={rf - FLIGHT_DUR * FLIGHT_AT} dur={FLIGHT_DUR} accent={level.accent} frame={rf} /> }
            : undefined,
          card: flying ? undefined : { children: <AnswerCard stateKey={key} at={plan.stamp} accent={level.accent} frame={rf} /> },
        }}
      />
    );
  };

  // specimens
  const co = scene('CO');
  const ia = scene('IA');
  const tx = scene('TX');
  const ringFrames = [
    { caption: 'TimerRing start', f: tx.plan.timerStart },
    { caption: 'TimerRing mid', f: tx.plan.timerStart + tx.plan.timerFrames * 0.5 },
    { caption: 'TimerRing last second', f: tx.plan.timerStart + tx.plan.timerFrames - 15 },
  ];
  const pixelStages = [0.1, 0.5, 0.9];
  const sides = ['left', 'right', 'top', 'bottom'] as const;
  const spec = 260;

  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: WIDTH, height: HEIGHT, background: COLORS.base, overflow: 'hidden' }}>
      {TIER_KEYS.map((k, i) => (
        <Scaled key={`q-${k}`} x={i * colW} y={0} caption={`${k} question · ${getState(k).level}`}>
          {question(k)}
        </Scaled>
      ))}
      {TIER_KEYS.map((k, i) => (
        <Scaled key={`r-${k}`} x={i * colW} y={rowH} caption={`${k} reveal`}>
          {reveal(k)}
        </Scaled>
      ))}

      <div style={{ position: 'absolute', left: GAP, top: rowH * 2 + GAP, right: GAP, display: 'flex', flexWrap: 'wrap', gap: GAP, alignItems: 'flex-start' }}>
        {ringFrames.map((r) => (
          <Specimen key={r.caption} caption={r.caption}>
            <TimerRing from={tx.plan.timerStart} duration={tx.plan.timerFrames} accent={tx.level.accent} size={spec} frame={r.f} />
          </Specimen>
        ))}
        {pixelStages.map((p) => (
          <Specimen key={`px-${p}`} caption={`PixelReveal IA ${Math.round(p * 100)}%`}>
            <PixelReveal stateKey="IA" size={spec} progress={p} accent={ia.level.accent} at={ia.rf + 999} dur={1} frame={0} />
          </Specimen>
        ))}
        <Specimen caption="PixelReveal cross-fade">
          <PixelReveal stateKey="IA" size={spec} progress={1} accent={ia.level.accent} at={0} dur={2} frame={1} />
        </Specimen>
        <Specimen caption="EmojiFill TX">
          <div style={{ width: spec, height: spec }}>
            <EmojiFill stateKey="TX" size={spec} at={0} frame={999} />
          </div>
        </Specimen>
        {sides.map((side, i) => (
          <Specimen key={side} caption={`CropMask ${side} reveal ${(i / sides.length).toFixed(2)}`}>
            <CropMask side={side} reveal={i / sides.length} size={spec}>
              <StateShape stateKey="CO" size={spec} mode="filled" fill={1} glow={0} accent={co.level.accent} />
            </CropMask>
          </Specimen>
        ))}
        <Specimen caption="MiniMap + region glow">
          <MiniMap answered={co.answered} current="CO" highlightRegion="West" size={spec * 2} frame={0} />
        </Specimen>
      </div>
    </div>
  );
};
