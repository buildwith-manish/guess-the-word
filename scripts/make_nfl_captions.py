#!/usr/bin/env python3
"""Word-timed captions for the NFL clips that are NOT shown as on-screen text.

Captioned types: hook, level, reveal, dyk, scorecard, prediction, rank, outro (clue and cardintro are skipped:
clues are already on screen, "Card n." is the card header). Each clip in public/nfl/voiceover/clips is transcribed
with Whisper (word timestamps). docs/nfl/lines.csv is the source of truth: the caption shows the words of lines.csv,
and Whisper only supplies the timing. Words Whisper heard differently are reported, never shown.

Run:  pip install openai-whisper   (needs ffmpeg and the model download)
      python3 scripts/make_nfl_captions.py            (env: MODEL=small.en, CSV, CLIPS, ONLY=id,id)
Writes src/nfl/captions.json: { model, clips: { <id>: { type, words: [{ w, start, end }] } } }  (seconds from clip start).
Exit 1 if a captioned clip is missing. Differences are printed and exit code stays 0 (read the report).
"""
import csv, difflib, json, os, re, sys

CSV = os.environ.get('CSV', 'docs/nfl/lines.csv')
CLIPS = os.environ.get('CLIPS', 'public/nfl/voiceover/clips')
MODEL = os.environ.get('MODEL', 'small.en')
ONLY = [s for s in os.environ.get('ONLY', '').split(',') if s]
OUT = 'src/nfl/captions.json'
TYPES = {'hook', 'level', 'reveal', 'dyk', 'scorecard', 'prediction', 'rank', 'outro'}

ONES = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split()
TENS = 'x x twenty thirty forty fifty sixty seventy eighty ninety'.split()

def spell(n):
    if n < 20: return ONES[n]
    if n < 100: return TENS[n // 10] + ('' if n % 10 == 0 else ' ' + ONES[n % 10])
    if n < 1000: return ONES[n // 100] + ' hundred' + ('' if n % 100 == 0 else ' and ' + spell(n % 100))
    return spell(n // 1000) + ' thousand' + ('' if n % 1000 == 0 else (' and ' if n % 1000 < 100 else ' ') + spell(n % 1000))

def norm(word):
    """Compare form: lowercase letters and digits only, small integers spelled out."""
    w = word.lower().replace('\u2019', "'")
    w = re.sub(r'(\d),(\d)', r'\1\2', w)
    w = re.sub(r'\d+', lambda m: spell(int(m.group())) if int(m.group()) < 10000 else m.group(), w)
    return re.sub(r'[^a-z0-9]', '', w)

def main():
    rows = [r for r in csv.DictReader(open(CSV, newline='', encoding='utf-8-sig')) if r['type'].strip() in TYPES]
    if ONLY: rows = [r for r in rows if r['id'] in ONLY]
    missing = [r['id'] for r in rows if not os.path.exists(os.path.join(CLIPS, r['id'] + '.wav'))]
    if missing:
        print('missing clips:', ', '.join(missing)); sys.exit(1)
    import whisper
    model = whisper.load_model(MODEL)
    out, report = {}, []
    for r in rows:
        text = r['text'].strip()
        shown = text.split()
        res = model.transcribe(os.path.join(CLIPS, r['id'] + '.wav'), word_timestamps=True, language='en', initial_prompt=text, condition_on_previous_text=False)
        heard = [(w['word'].strip(), w['start'], w['end']) for s in res['segments'] for w in s['words']]
        a = [norm(w) for w in shown]
        b = [norm(h[0]) for h in heard]
        timing = [None] * len(shown)
        notes = []
        for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
            if tag == 'equal':
                for k in range(i2 - i1): timing[i1 + k] = (heard[j1 + k][1], heard[j1 + k][2])
            elif ''.join(a[i1:i2]) == ''.join(b[j1:j2]) and i2 > i1:  # same letters split or joined differently
                n = i2 - i1
                t0, t1 = heard[j1][1], heard[j2 - 1][2]
                for k in range(n): timing[i1 + k] = (t0 + (t1 - t0) * k / n, t0 + (t1 - t0) * (k + 1) / n)
            else:
                notes.append(f"csv '{' '.join(shown[i1:i2])}' / heard '{' '.join(h[0] for h in heard[j1:j2])}'")
        # words with no timing: spread between the neighbours that have one
        for i, t in enumerate(timing):
            if t is not None: continue
            lo = next((timing[k][1] for k in range(i - 1, -1, -1) if timing[k]), 0.0)
            hi_i = next((k for k in range(i + 1, len(timing)) if timing[k]), None)
            hi = timing[hi_i][0] if hi_i is not None else (heard[-1][2] if heard else lo + 0.3)
            run = [k for k in range(i, hi_i if hi_i is not None else len(timing)) if timing[k] is None]
            step = max(hi - lo, 0.05) / len(run)
            for n, k in enumerate(run): timing[k] = (lo + step * n, lo + step * (n + 1))
        out[r['id']] = {'type': r['type'].strip(), 'words': [{'w': w, 'start': round(t[0], 3), 'end': round(t[1], 3)} for w, t in zip(shown, timing)]}
        if notes: report.append((r['id'], notes))
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump({'model': MODEL, 'clips': out}, open(OUT, 'w'), indent=1)
    print(f'{len(out)} clips captioned -> {OUT}')
    print(f'{len(report)} clips differ from lines.csv (the caption shows lines.csv):')
    for cid, notes in report:
        print(' ', cid); [print('    ', n) for n in notes]

if __name__ == '__main__': main()
