/**
 * Voice.tsx: the voiceover layer of "DontSay-Full". One <Audio> per clip, placed at the frame voiceCues.ts gives it.
 * The scenes only draw; they do not play voice clips (one owner, so a line can never play twice). A cue whose clip is not
 * in timings.generated.ts yet is skipped, so the video still renders while the voice arrives in batches.
 */
import React from 'react';
import { Audio, Sequence, staticFile } from 'remotion';
import { RENDER_FPS, clipPath, clipSec, ticksToFrames } from './timing';
import { buildVoiceCues } from './voiceCues';

const cues = buildVoiceCues();

export const VoiceLayer: React.FC<{ volume?: number }> = ({ volume = 1 }) => (
  <>
    {cues.map((c) => {
      const dur = clipSec(c.id);
      if (dur === undefined) return null;
      return (
        <Sequence key={c.id} name={`voice ${c.id} ${c.label}`} from={ticksToFrames(c.tick)} durationInFrames={Math.ceil((dur + 0.05) * RENDER_FPS)} layout="none">
          <Audio src={staticFile(clipPath(c.id))} volume={volume} />
        </Sequence>
      );
    })}
  </>
);
