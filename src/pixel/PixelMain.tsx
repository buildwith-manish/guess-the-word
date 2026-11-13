import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { EndScreen } from '../EndScreen';
import { Bonus } from '../BonusRound';
import { Iris } from '../Iris';
import { Reminder } from '../Reminder';
import { Scoreboard } from '../Scoreboard';
import { HudPlanContext } from '../Hud';
import settings from '../../settings.json';
import { PixelRound } from './PixelRound';
import { PixelIntro, PixelLevelCard } from './PixelScenes';
import {
  FPS,
  INTRO_PLAN,
  PIXEL_END,
  PIXEL_SCOREBOARD,
  PIXEL_HUD_PLAN,
  PIXEL_MUSIC_END,
  PIXEL_TIMELINE,
  TIME_SCALE,
  T,
  levelCardPlan,
  locate,
  pixelBonusClockStart,
  pixelBonusRevealHold,
  pixelBonusVoices,
  questionClock,
  usePixelFrame,
} from './pixel-timing';
import { BRANDS } from './brands';

/**
 * Composition root for "Guess the Brand: Pixelated".
 * Like Main.tsx it only decides which scene is on screen; every scene reads its own
 * local frame, so any frame range can be rendered in any order.
 * The shared HUD (progress bar, STREAK, BONUS ERASES) reads the pixel quiz's plan from context.
 */
const Scenes: React.FC = () => {
  const frame = usePixelFrame();
  const { seg, local } = locate(frame);
  switch (seg.kind) {
    case 'intro':
      return <PixelIntro frame={local} plan={INTRO_PLAN} />;
    case 'levelCard':
      return <PixelLevelCard frame={local} level={seg.level} duration={seg.duration} />;
    case 'question':
      return <PixelRound frame={local} index={seg.index} erases={seg.erases} />;
    case 'iris':
      return (
        <AbsoluteFill>
          <Iris frame={local} seg={seg} />
        </AbsoluteFill>
      );
    case 'bonus':
      return (
        <AbsoluteFill>
          <Bonus
            frame={local}
            puzzle={seg.puzzle}
            index={seg.index}
            clockStart={pixelBonusClockStart(seg.index)}
            revealHold={pixelBonusRevealHold(seg.index)}
          />
        </AbsoluteFill>
      );
    case 'reminder':
      return (
        <AbsoluteFill>
          <Reminder frame={local} seg={seg} />
        </AbsoluteFill>
      );
    case 'scoreboard':
      return <Scoreboard frame={local} rowAt={PIXEL_SCOREBOARD.rowAt} />;
    case 'endScreen':
      return <EndScreen frame={local} />;
    default:
      return <AbsoluteFill style={{ background: '#000' }} />;
  }
};

type Cue = { frame: number; sfx: string; volume?: number; rate?: number };
/** a voiceover clip on the timeline (absolute design frames) */
type Voice = { frame: number; file: string; frames: number };
const VOICE_LIST: Voice[] = [];

/** when each rule card lands, as a fraction of the rules line (keep in sync with PixelScenes RULE_CARDS) */
const RULE_CARD_AT = [0, 0.34, 0.64];
const RANK_COUNT = (settings.scoreboard.ranks as string[][]).length;
/** Scoreboard beats — keep in sync with Scoreboard.tsx (rowBase 46, step 22), same as sound.ts. */
const SB_ROW_BASE = 46;
const SB_STEP = 22;

/** Reuses the WAVs already in public/sounds; mirrors the cue timing in sound.ts. */
const clockOf = (index: number) => questionClock(BRANDS[index].id);
const buildCues = (): Cue[] => {
  const cues: Cue[] = [];
  const add = (frame: number, sfx: string, extra: Partial<Cue> = {}) => cues.push({ frame: Math.round(frame), sfx, ...extra });
  const ticks = (clockStart: number, seconds: number, low: string) => {
    for (let k = 1; k < seconds; k++) add(clockStart + k * FPS, seconds - k <= 3 ? low : 'tick');
  };

  PIXEL_TIMELINE.segments.forEach((seg) => {
    const f0 = seg.from;
    switch (seg.kind) {
      case 'intro': {
        const P = INTRO_PLAN;
        // cold open: whoosh as the wall builds, title slams
        add(f0 + 2, 'whoosh');
        add(f0 + 3, 'boom');
        add(f0 + 18, 'boom');
        // rule cards: one ping per card as it lands, a pop for the tease
        add(f0 + P.a + 2, 'thump');
        add(f0 + P.a + 4, 'rule-sweep');
        RULE_CARD_AT.forEach((k) => add(f0 + P.a + 4 + Math.round(P.ruleSpan * k), 'ping-hi'));
        add(f0 + P.a + 4 + Math.round(P.ruleSpan * 0.64) + 12, 'pop');
        // 3 - 2 - 1
        for (let k = 0; k < 3; k++) add(f0 + P.a + P.countAt + k * 15, k === 2 ? 'thump' : 'tick');
        add(f0 + P.frames - 6, 'whoosh');
        if (P.introVoice) VOICE_LIST.push({ frame: f0 + P.introVoice.start, file: P.introVoice.file, frames: P.introVoice.frames });
        if (P.rulesVoice) VOICE_LIST.push({ frame: f0 + P.rulesVoice.start, file: P.rulesVoice.file, frames: P.rulesVoice.frames });
        break;
      }
      case 'levelCard':
        add(f0 + 3, 'thump');
        add(f0 + 15, 'boom');
        {
          const lv = levelCardPlan(seg.level).voice;
          if (lv) VOICE_LIST.push({ frame: f0 + lv.start, file: lv.file, frames: lv.frames });
        }
        break;
      case 'question': {
        add(f0 + 1, 'pop');
        const start = f0 + clockOf(seg.index).timerStart;
        // a tick every second; the picture sharpens on each one
        const clock = clockOf(seg.index);
        if (clock.questionVoice) VOICE_LIST.push({ frame: Math.round(f0 + clock.questionVoice.start), file: clock.questionVoice.file, frames: clock.questionVoice.frames });
        if (clock.answerVoice) VOICE_LIST.push({ frame: Math.round(f0 + clock.answerVoice.start), file: clock.answerVoice.file, frames: clock.answerVoice.frames });
        if (clock.fast) {
          add(f0 + 4, 'ping-hi');
          add(f0 + 4, 'thump');
        }
        ticks(start, clock.seconds, 'thump');
        const reveal = start + clock.countdown;
        add(reveal - 20, 'riser', { volume: 0.6 });
        add(reveal, 'boom', { volume: settings.sound.panic.stampBoomVolume });
        add(reveal + 6, 'stamp');
        add(reveal + 10, 'chime-arp');
        break;
      }
      case 'bonus': {
        const clockStart = f0 + pixelBonusClockStart(seg.index);
        const bv = pixelBonusVoices(seg.index, seg.puzzle.seconds);
        if (bv.question) VOICE_LIST.push({ frame: Math.round(f0 + bv.question.start), file: bv.question.file, frames: bv.question.frames });
        if (bv.answer) VOICE_LIST.push({ frame: Math.round(f0 + bv.answer.start), file: bv.answer.file, frames: bv.answer.frames });
        const clockFrames = Math.round(seg.puzzle.seconds * FPS);
        const clockEnd = clockStart + clockFrames;
        add(f0, 'siren');
        add(f0, 'whoosh');
        add(f0 + settings.bonus.preRollFrames + 2, 'pop');
        ticks(clockStart, seg.puzzle.seconds, 'thump');
        if (seg.puzzle.seconds > 3) add(clockEnd - 2 * FPS, 'drumroll');
        add(clockEnd, 'stamp');
        add(clockEnd + settings.bonus.answerChipDelayFrames, 'chime-erase');
        break;
      }
      case 'reminder':
        add(f0, 'remind');
        break;
      case 'iris':
        add(f0, 'whoosh');
        break;
      case 'scoreboard': {
        const rowAt = PIXEL_SCOREBOARD.rowAt;
        for (let i = 0; i < RANK_COUNT; i++) {
          const fromBottom = RANK_COUNT - 1 - i;
          const at = rowAt ? rowAt[i] : SB_ROW_BASE + fromBottom * SB_STEP;
          add(f0 + at, 'row', { rate: (330 + fromBottom * 110) / 330 });
        }
        add(f0 + (rowAt ? rowAt[0] : SB_ROW_BASE + (RANK_COUNT - 1) * SB_STEP) + 21, 'legend');
        PIXEL_SCOREBOARD.voices.forEach((v) => VOICE_LIST.push({ frame: f0 + v.start, file: v.file, frames: v.frames }));
        break;
      }
      case 'endScreen':
        add(f0 + 9, 'boom');
        add(f0 + 52, 'jingle-cta');
        add(f0 + 140, 'ding');
        add(f0 + 196, 'ding-hi');
        if (PIXEL_END.voice) VOICE_LIST.push({ frame: f0 + PIXEL_END.voice.start, file: PIXEL_END.voice.file, frames: PIXEL_END.voice.frames });
        break;
    }
  });
  return cues;
};
const CUES = buildCues();
const VOICE: Voice[] = VOICE_LIST.slice().sort((a, b) => a.frame - b.frame);

/** music dips under every voiceover clip (quick attack, slower release), like the main video */
const MUSIC_VOL = 0.35;
const musicVolume = (renderFrame: number) => {
  const f = renderFrame / TIME_SCALE; // design frames
  let duck = 1;
  for (const v of VOICE) {
    const into = f - v.frame;
    if (into < -4 || into > v.frames + 12) continue;
    const k = into < 0 ? (into + 4) / 4 : into <= v.frames ? 1 : 1 - (into - v.frames) / 12;
    duck = Math.min(duck, 1 - (1 - settings.voiceover.duckFloor) * Math.max(0, Math.min(1, k)));
  }
  return MUSIC_VOL * duck;
};

const Sound: React.FC = () => (
  <>
    {/* music runs until the scoreboard, like the main video */}
    <Sequence from={0} durationInFrames={Math.max(1, Math.round(PIXEL_MUSIC_END * TIME_SCALE))} layout="none">
      <Audio src={staticFile('sounds/music-base.wav')} loop volume={musicVolume} />
    </Sequence>
    {CUES.map((c, i) => (
      <Sequence key={i} from={Math.round(c.frame * TIME_SCALE)} durationInFrames={Math.round(3 * FPS * TIME_SCALE)} layout="none">
        <Audio src={staticFile(`sounds/${c.sfx}.wav`)} playbackRate={c.rate ?? 1} volume={c.volume ?? 1} />
      </Sequence>
    ))}
    {/* voiceover: question lines before the clock, answer lines after the reveal */}
    {VOICE.map((v, i) => (
      <Sequence key={`vo${i}`} from={Math.round(v.frame * TIME_SCALE)} durationInFrames={Math.max(1, Math.ceil(v.frames * TIME_SCALE))} layout="none">
        <Audio src={staticFile(`${settings.voiceover.dir}/${v.file}`)} volume={settings.voiceover.volume} />
      </Sequence>
    ))}
  </>
);

export const PixelMain: React.FC = () => (
  <HudPlanContext.Provider value={PIXEL_HUD_PLAN}>
    <Scenes />
    <Sound />
  </HudPlanContext.Provider>
);
