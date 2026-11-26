/**
 * MusicBeds: mounts the music plan from music.ts (task MU2). One <Audio> per bed span (hook, each level, each
 * bonus, outro) plus the check-in swell. Place it in DontSayFull, next to the part Sequences.
 * Volume = MUSIC_VOLUME x crossfade x duck (music.ts) x the check-in lift below.
 */
import React from 'react';
import { Audio, Sequence, staticFile } from 'remotion';
import { TIME_SCALE } from '../timing';
import { MUSIC_LIFT, heartCheckInMusicGain } from '../scenes/HeartCheckIn';
import { MUSIC_VOLUME, bedGain, checkInSwells, duckGain, musicBeds } from '../music';

/** After the check-in card the lift eases back to 1 over this long (the card's own function stops dead at the cut). */
const LIFT_RELEASE_SEC = 0.3;
const musicSrc = (file: string): string => staticFile(`dontsay/music/${file}`);

/** Gain lift of the bed over a heart check-in: HeartCheckIn's own ramp inside the card, an eased release after it. */
const liftAt = (frame: number): number => {
  for (const s of checkInSwells) {
    if (frame < s.from) continue;
    const tick = (frame - s.from) / TIME_SCALE;
    if (frame < s.to) return heartCheckInMusicGain(tick);
    const x = (frame - s.to) / (LIFT_RELEASE_SEC * 60);
    if (x < 1) return 1 + (MUSIC_LIFT.to - 1) * 0.5 * (1 + Math.cos(Math.PI * x));
  }
  return 1;
};

export const MusicBeds: React.FC = () => (
  <>
    {musicBeds.map((b) => (
      <Sequence key={`${b.key}-${b.seqFrom}`} name={`music ${b.key}`} from={b.seqFrom} durationInFrames={b.seqTo - b.seqFrom} layout="none">
        <Audio
          src={musicSrc(b.file)}
          loop={b.loop}
          loopVolumeCurveBehavior="extend"
          startFrom={b.skip > 0 ? b.skip : undefined}
          allowAmplificationDuringRender
          volume={(f) => bedGain(b, b.seqFrom + f) * liftAt(b.seqFrom + f)}
        />
      </Sequence>
    ))}
    {checkInSwells.map((s) => (
      <Sequence key={`checkin-${s.from}`} name="music check-in swell" from={s.from} durationInFrames={Math.min(s.to - s.from, s.fileFrames)} layout="none">
        <Audio src={musicSrc(s.file)} volume={(f) => MUSIC_VOLUME * duckGain(s.from + f)} />
      </Sequence>
    ))}
  </>
);
