import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { EndScreen } from '../EndScreen';
import { Bonus } from '../BonusRound';
import { Iris } from '../Iris';
import { Reminder } from '../Reminder';
import { Scoreboard } from '../Scoreboard';
import { HudPlanContext } from '../Hud';
import { BONUS_CLOCK_START } from '../timing';
import settings from '../../settings.json';
import { PixelRound } from './PixelRound';
import { PixelIntro, PixelLevelCard } from './PixelScenes';
import {
  COUNTDOWN_SECONDS,
  FPS,
  PIXEL_HUD_PLAN,
  PIXEL_MUSIC_END,
  PIXEL_TIMELINE,
  TIME_SCALE,
  T,
  locate,
  usePixelFrame,
} from './pixel-timing';

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
      return <PixelIntro frame={local} />;
    case 'levelCard':
      return <PixelLevelCard frame={local} level={seg.level} />;
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
          <Bonus frame={local} puzzle={seg.puzzle} index={seg.index} />
        </AbsoluteFill>
      );
    case 'reminder':
      return (
        <AbsoluteFill>
          <Reminder frame={local} seg={seg} />
        </AbsoluteFill>
      );
    case 'scoreboard':
      return <Scoreboard frame={local} />;
    case 'endScreen':
      return <EndScreen frame={local} />;
    default:
      return <AbsoluteFill style={{ background: '#000' }} />;
  }
};

type Cue = { frame: number; sfx: string; volume?: number; rate?: number };

const RANK_COUNT = (settings.scoreboard.ranks as string[][]).length;
/** Scoreboard beats — keep in sync with Scoreboard.tsx (rowBase 46, step 22), same as sound.ts. */
const SB_ROW_BASE = 46;
const SB_STEP = 22;

/** Reuses the WAVs already in public/sounds; mirrors the cue timing in sound.ts. */
const buildCues = (): Cue[] => {
  const cues: Cue[] = [];
  const add = (frame: number, sfx: string, extra: Partial<Cue> = {}) => cues.push({ frame: Math.round(frame), sfx, ...extra });
  const ticks = (clockStart: number, seconds: number, low: string) => {
    for (let k = 1; k < seconds; k++) add(clockStart + k * FPS, seconds - k <= 3 ? low : 'tick');
  };

  PIXEL_TIMELINE.segments.forEach((seg) => {
    const f0 = seg.from;
    switch (seg.kind) {
      case 'intro':
        add(f0 + 4, 'boom');
        add(f0 + 26, 'boom');
        // rules scene
        add(f0 + T.introA + 4, 'thump');
        add(f0 + T.introA + 4, 'rule-sweep');
        add(f0 + T.introA + 38, 'ping-hi');
        add(f0 + T.introA + 84, 'jingle-rules');
        break;
      case 'levelCard':
        add(f0 + 3, 'thump');
        add(f0 + 15, 'boom');
        break;
      case 'question': {
        add(f0 + 1, 'pop');
        const start = f0 + T.lead;
        // a tick every second; the picture sharpens on each one
        ticks(start, COUNTDOWN_SECONDS, 'thump');
        const reveal = start + T.countdown;
        add(reveal - 20, 'riser', { volume: 0.6 });
        add(reveal, 'boom', { volume: settings.sound.panic.stampBoomVolume });
        add(reveal + 6, 'stamp');
        add(reveal + 10, 'chime-arp');
        break;
      }
      case 'bonus': {
        const clockStart = f0 + BONUS_CLOCK_START(seg.index);
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
      case 'scoreboard':
        for (let i = 0; i < RANK_COUNT; i++) {
          const fromBottom = RANK_COUNT - 1 - i;
          add(f0 + SB_ROW_BASE + fromBottom * SB_STEP, 'row', { rate: (330 + fromBottom * 110) / 330 });
        }
        add(f0 + SB_ROW_BASE + (RANK_COUNT - 1) * SB_STEP + 21, 'legend');
        break;
      case 'endScreen':
        add(f0 + 9, 'boom');
        add(f0 + 52, 'jingle-cta');
        add(f0 + 140, 'ding');
        add(f0 + 196, 'ding-hi');
        break;
    }
  });
  return cues;
};
const CUES = buildCues();

const Sound: React.FC = () => (
  <>
    {/* music runs until the scoreboard, like the main video */}
    <Sequence from={0} durationInFrames={Math.max(1, Math.round(PIXEL_MUSIC_END * TIME_SCALE))} layout="none">
      <Audio src={staticFile('sounds/music-base.wav')} loop volume={0.35} />
    </Sequence>
    {CUES.map((c, i) => (
      <Sequence key={i} from={Math.round(c.frame * TIME_SCALE)} durationInFrames={Math.round(3 * FPS * TIME_SCALE)} layout="none">
        <Audio src={staticFile(`sounds/${c.sfx}.wav`)} playbackRate={c.rate ?? 1} volume={c.volume ?? 1} />
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
