/**
 * voiceCues.ts: where every voice clip (ds_001 ... ds_173) starts in the full video.
 *
 * Pure (no React, no fonts) so Voice.tsx plays it and scripts/dontsay_voice_fit.ts checks it. Nothing is typed by hand:
 *   - which clip belongs to which round / bonus / level comes from audioMap.ts (generated from docs/dontsay/lines.csv),
 *   - when a segment starts comes from timing.ts `segments` (intro / reveal / result phases already stretch to the clips),
 *   - the scoreboard and outro slots come from slots.ts (the same numbers the scenes draw with).
 * The only values owned here are the small lead-ins below. Clips are cleaned to 0.1 s of silence at both ends
 * (scripts/clean_dontsay_clips.sh), so a clip started at a phase boundary is heard about 0.1 s later.
 */
import { bonusAudioOf, checkInId, hookIds, levelIds, outroIds, rankIds, rankIntroId, roundAudioOf } from './audioMap';
import { clipSec, introStdSec, secToTicks, segments, type Segment } from './timing';
import { OUTRO_IN_LEAD, outroAskAt, scoreboardBandAt } from './slots';

/** Lead-in after a segment/phase start, seconds. Tune here, nowhere else. */
export const VOICE_LEAD_SEC = {
  hookFirst: 0.1, // the first hook line starts almost at once (the notification is already sliding in)
  settings: 0.35, // after the rules sheet has started to slide up
  level: 0.15,
  reveal: 0.1, // with the lock click that opens the sealed answer
  result: 0.05, // with the Same answer / Safe chip
  checkIn: 0.1,
  bonusIntro: 0.2, // BonusVoiceOnly starts its intro voice at the same moment (VOICE_START = 6 ticks)
  bonusReveal: 0,
  rankIntro: 0.4, // after the rank card has landed
} as const;

export type VoiceKind =
  | 'hook' | 'settings' | 'level' | 'roundintro' | 'rule' | 'reveal' | 'result'
  | 'checkin' | 'bonusintro' | 'bonusreveal' | 'rank' | 'outro';

export type VoiceCue = {
  id: string;
  kind: VoiceKind;
  /** Absolute design tick (30 fps) in the full video. */
  tick: number;
  /** What it belongs to, for reports ("round 12", "bonus 3"). */
  label: string;
};

/** Hook narration start times (seconds from the hook start): back to back, each clip starts when the previous one ends.
 *  Used by Hook.tsx too, so the hearts / glow beats stay on the words. Estimated lengths apply until clips are measured. */
const HOOK_EST_SEC = [1.6, 1.7, 2.05, 0.9];
export const hookStartSecs = (): number[] => {
  let t = VOICE_LEAD_SEC.hookFirst;
  return hookIds.map((id, i) => {
    const start = t;
    t += clipSec(id) ?? HOOK_EST_SEC[i] ?? 1.5;
    return start;
  });
};

const at = (from: number, sec: number): number => from + secToTicks(sec);

const cuesOf = (s: Segment): VoiceCue[] => {
  switch (s.kind) {
    case 'hook':
      return hookIds.map((id, i) => ({ id, kind: 'hook' as const, tick: at(s.from, hookStartSecs()[i]), label: `hook ${i + 1}` }));
    case 'settingsCard': {
      const id = levelIds[1].settings;
      return id ? [{ id, kind: 'settings', tick: at(s.from, VOICE_LEAD_SEC.settings), label: 'settings card' }] : [];
    }
    case 'levelCard': {
      const out: VoiceCue[] = [{ id: levelIds[s.level].level, kind: 'level', tick: at(s.from, VOICE_LEAD_SEC.level), label: `level ${s.level}` }];
      const sheet = levelIds[s.level].settings;
      if (sheet && s.level !== 1) out.push({ id: sheet, kind: 'settings', tick: at(s.from, VOICE_LEAD_SEC.settings), label: `level ${s.level} rules` });
      return out;
    }
    case 'round': {
      const a = roundAudioOf(s.round.n);
      const out: VoiceCue[] = [{ id: a.intro, kind: 'roundintro', tick: s.phases.intro.from, label: `round ${s.round.n}` }];
      if (a.rule) {
        // the rule is spoken right after the prompt (both clips carry 0.1 s of silence, which is the natural gap)
        const after = clipSec(a.intro) ?? introStdSec;
        out.push({ id: a.rule, kind: 'rule', tick: at(s.phases.intro.from, after), label: `round ${s.round.n} rule` });
      }
      out.push({ id: a.reveal, kind: 'reveal', tick: at(s.phases.reveal.from, VOICE_LEAD_SEC.reveal), label: `round ${s.round.n}` });
      if (a.result) out.push({ id: a.result, kind: 'result', tick: at(s.phases.result.from, VOICE_LEAD_SEC.result), label: `round ${s.round.n}` });
      return out;
    }
    case 'heartCheckIn':
      return [{ id: checkInId, kind: 'checkin', tick: at(s.from, VOICE_LEAD_SEC.checkIn), label: 'heart check-in' }];
    case 'bonus': {
      const a = bonusAudioOf(s.bonus.n);
      return [
        { id: a.intro, kind: 'bonusintro', tick: at(s.phases.intro.from, VOICE_LEAD_SEC.bonusIntro), label: `bonus ${s.bonus.n}` },
        { id: a.reveal, kind: 'bonusreveal', tick: at(s.phases.reveal.from, VOICE_LEAD_SEC.bonusReveal), label: `bonus ${s.bonus.n}` },
      ];
    }
    case 'rankCard':
      return [{ id: rankIntroId, kind: 'rank', tick: at(s.from, VOICE_LEAD_SEC.rankIntro), label: 'rank card' }];
    case 'scoreboard':
      return rankIds.map((id, i) => ({ id, kind: 'rank' as const, tick: s.from + scoreboardBandAt[i], label: `rank band ${i + 1}` }));
    case 'outro': {
      const starts = outroAskAt(outroIds.length);
      return outroIds.map((id, i) => ({ id, kind: 'outro' as const, tick: s.from + starts[i] + OUTRO_IN_LEAD, label: `outro ask ${i + 1}` }));
    }
    default:
      return [];
  }
};

/** Every voice cue of the video in play order. Throws if the audio map and the timing disagree. */
export const buildVoiceCues = (): VoiceCue[] => {
  const all = segments.flatMap(cuesOf).sort((a, b) => a.tick - b.tick);
  const ids = new Set<string>();
  for (const c of all) {
    if (ids.has(c.id)) throw new Error(`voiceCues: clip ${c.id} is placed twice (${c.label})`);
    ids.add(c.id);
  }
  return all;
};
