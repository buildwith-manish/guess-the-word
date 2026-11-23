import { hookId, outroIds, slotAudio } from './audioMap';
import { clipSec, segments, ticksToFrames } from './timing';
import { HOOK_VOICE_TICK } from './scenes/Hook';
import { outroVoiceMarks } from './scenes/Outro';
import { scoreVoice } from './scenes/ScoreScene';

/**
 * voiceTimeline: where every voice clip starts in XMAS-Full. No ids, texts or times are written here: the ids come from
 * audioMap.ts, the starts from timing.ts segments and from the score and outro scenes' own voice marks.
 * UNIT: design ticks (30 per second) from the first tick of the video; render frame = tick * 2 (ticksToFrames).
 *
 *   hook              at the start of the hook
 *   quip / bonus intro  at the start of the slot (the start of its intro)
 *   reveal / bonus reveal  at the start of the reveal; in the slot with an extra pause the title comes after the pause,
 *                      so the line starts when the pause ends
 *   end line, rank lines, outro asks  at the marks the score and outro scenes export
 */
export type VoiceEvent = {
  id: string;
  /** Short label for reports, e.g. "slot 5 intro". */
  what: string;
  /** Absolute design tick the clip starts at. */
  tick: number;
};

const build = (): VoiceEvent[] => {
  const out: VoiceEvent[] = [];
  const hook = segments.find((s) => s.kind === 'hook');
  if (!hook) throw new Error('voiceTimeline: timing.ts has no hook segment');
  out.push({ id: hookId, what: 'hook', tick: hook.from + HOOK_VOICE_TICK });

  for (const seg of segments) {
    if (seg.kind !== 'slot') continue;
    const a = slotAudio[seg.slot.slot - 1];
    if (!a || a.slot !== seg.slot.slot) throw new Error(`voiceTimeline: no audio map entry for slot ${seg.slot.slot}`);
    const { intro, pause, reveal } = seg.phases;
    out.push({ id: a.introId, what: `slot ${a.slot} intro`, tick: intro.from });
    out.push({ id: a.revealId, what: `slot ${a.slot} reveal`, tick: pause ? pause.to : reveal.from });
  }

  const score = segments.find((s) => s.kind === 'score');
  if (!score) throw new Error('voiceTimeline: timing.ts has no score segment');
  scoreVoice(score.from).forEach((v, i) => out.push({ id: v.id, what: i === 0 ? 'score end line' : `rank line ${i}`, tick: v.frame }));

  const outro = segments.find((s) => s.kind === 'outro');
  if (!outro) throw new Error('voiceTimeline: timing.ts has no outro segment');
  const spoken = outroVoiceMarks(outro.from).filter((m) => m.spoken);
  if (spoken.length !== outroIds.length) throw new Error(`voiceTimeline: ${spoken.length} spoken outro asks but ${outroIds.length} outro clips`);
  spoken.forEach((m, i) => out.push({ id: outroIds[i], what: `outro ask ${i + 1}`, tick: m.tick }));

  return out.sort((a, b) => a.tick - b.tick);
};

/** Every voice clip of the video with its start tick, in time order. */
export const voiceEvents: VoiceEvent[] = build();

/** Start of a clip in render frames of XMAS-Full. */
export const voiceStartFrame = (e: VoiceEvent): number => ticksToFrames(e.tick);

/**
 * Fingerprint of the voice timeline (ids, start ticks and the measured length of each slot clip). The baked duck envelope
 * carries the one it was built from; Audio.tsx refuses to use a stale envelope.
 */
export const voiceSignature = (): string => {
  let h = 0x811c9dc5;
  const add = (s: string) => {
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
  };
  for (const e of voiceEvents) add(`${e.id}@${e.tick};`);
  for (const a of slotAudio) add(`${a.slot}:${clipSec(a.slot, 'intro') ?? '-'}:${clipSec(a.slot, 'reveal') ?? '-'};`);
  return h.toString(16).padStart(8, '0');
};
