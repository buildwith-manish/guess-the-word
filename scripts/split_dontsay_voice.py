#!/usr/bin/env python3
"""Splits ONE full recording of the "Don't Say The Same As Me" voiceover into one clip per row of
docs/dontsay/lines.csv (ds_001 ... ds_173), using the script text as the answer key.

How it works (no pauses needed, the script is the source of truth):
  1. Whisper (faster-whisper) transcribes the whole recording with word timestamps.
  2. The spoken words are aligned to the script words of ALL rows in order (global alignment, tolerant to
     misheard / extra / missing words, digits spelled out, UK/US spelling).
  3. Each row gets start = first matched word, end = last matched word. Rows whose words were not found
     (coverage below --min-coverage) are reported and make the run fail (unless --allow-partial).
  4. Cut point between two rows = the quietest 10 ms window inside the gap between them, so a cut never
     lands inside a word. Clips are written as 16-bit mono WAV, with a little room at both ends;
     scripts/clean_dontsay_clips.sh then trims to exactly 0.1 s and loudness-normalises.

Usage:
  python3 scripts/split_dontsay_voice.py --audio docs/dontsay/raw/voiceover.mp3
Options: --csv docs/dontsay/lines.csv  --out public/dontsay/voiceover/clips  --model small.en
         --report docs/dontsay/voice_alignment.md  --min-coverage 0.6  --allow-partial
         --words words.json   (reuse a saved transcript instead of running Whisper; used by the tests)
Exit 1 when a row cannot be placed (nothing is written unless --allow-partial)."""
import argparse, csv, difflib, json, os, re, subprocess, sys, wave
import numpy as np

SR = 16000  # analysis rate for the energy search

# ----------------------------------------------------------------------------- text normalisation
ONES = ('zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen '
        'sixteen seventeen eighteen nineteen').split()
TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
SPELL = {'color': 'colour', 'colors': 'colours', 'favorite': 'favourite', 'math': 'maths', 'okay': 'ok',
         'whoa': 'woah', 'mum': 'mom'}


def num_words(n):
    if n < 20:
        return [ONES[n]]
    if n < 100:
        return [TENS[n // 10]] + ([ONES[n % 10]] if n % 10 else [])
    if n == 100:
        return ['one', 'hundred']
    return [str(n)]


def words_of(text):
    """Lower-case word list: digits spelled out, hyphens split, punctuation dropped."""
    out = []
    for tok in re.findall(r"[A-Za-z0-9']+", text.replace('-', ' ').replace('’', "'")):
        t = tok.lower().strip("'")
        if not t:
            continue
        if t.isdigit():
            out += num_words(int(t))
        else:
            t = t.replace("'", '')  # don't -> dont, let's -> lets: matches either spelling from the recogniser
            out.append(SPELL.get(t, t))
    return out


def sim(a, b):
    if a == b:
        return 1.0
    if a.startswith(b) or b.startswith(a):  # "hearts" / "heart", "match" / "matched"
        if min(len(a), len(b)) >= 4:
            return 0.85
    return difflib.SequenceMatcher(None, a, b).ratio()


# ----------------------------------------------------------------------------- alignment
def align(spoken, script):
    """Global alignment (Needleman-Wunsch). Returns (assign, exact): per spoken word the script index it belongs to,
    and whether it really matches that script word."""
    n, m = len(spoken), len(script)
    GAP = -1.0
    score = np.zeros((n + 1, m + 1), dtype=np.float32)
    back = np.zeros((n + 1, m + 1), dtype=np.int8)  # 0 diag, 1 up (skip spoken), 2 left (skip script)
    score[:, 0] = np.arange(n + 1) * GAP
    score[0, :] = np.arange(m + 1) * GAP
    back[1:, 0] = 1
    back[0, 1:] = 2
    simcache = {}
    for i in range(1, n + 1):
        a = spoken[i - 1]
        for j in range(1, m + 1):
            b = script[j - 1]
            k = (a, b)
            s = simcache.get(k)
            if s is None:
                r = sim(a, b)
                s = 2.0 if r >= 0.99 else 1.2 if r >= 0.8 else 0.4 if r >= 0.62 else -1.0
                simcache[k] = s
            d = score[i - 1, j - 1] + s
            u = score[i - 1, j] + GAP
            l = score[i, j - 1] + GAP
            if d >= u and d >= l:
                score[i, j], back[i, j] = d, 0
            elif u >= l:
                score[i, j], back[i, j] = u, 1
            else:
                score[i, j], back[i, j] = l, 2
    # Traceback: every spoken word is given the script position it sits next to (match, mismatch or extra word);
    # `exact` marks the ones that really match the script word.
    assign = [0] * n
    exact = [False] * n
    i, j = n, m
    while i > 0 or j > 0:
        b = back[i, j]
        if i > 0 and j > 0 and b == 0:
            assign[i - 1] = j - 1
            exact[i - 1] = sim(spoken[i - 1], script[j - 1]) >= 0.62
            i, j = i - 1, j - 1
        elif i > 0 and (j == 0 or b == 1):
            assign[i - 1] = min(j, m - 1)  # extra word (filler, repeat): joins the row it sits in front of
            i -= 1
        else:
            j -= 1
    return assign, exact


# ----------------------------------------------------------------------------- audio helpers
def decode_pcm(path, rate):
    r = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(rate), '-f', 's16le', '-'],
                       capture_output=True)
    if r.returncode:
        sys.exit('ffmpeg failed: ' + r.stderr.decode()[:400])
    return np.frombuffer(r.stdout, dtype='<i2').astype(np.float32) / 32768.0


def window_db(x, rate, win=0.010):
    n = max(1, int(rate * win))
    k = len(x) // n
    rms = np.sqrt(np.mean(x[:k * n].reshape(k, n) ** 2, axis=1) + 1e-12)
    return 20 * np.log10(rms + 1e-9)


def quietest(db, t0, t1):
    """Time (s) of the quietest 10 ms window in [t0, t1] (ties go to the middle)."""
    a, b = max(0, int(t0 / 0.010)), min(len(db) - 1, int(t1 / 0.010))
    if b <= a:
        return (t0 + t1) / 2, float(db[min(a, len(db) - 1)])
    seg = db[a:b + 1]
    mid = (len(seg) - 1) / 2
    idx = int(np.lexsort((np.abs(np.arange(len(seg)) - mid), np.round(seg, 1)))[0])
    return (a + idx) * 0.010 + 0.005, float(seg[idx])


def silence_runs(db, t0, t1, thr, min_win=5):
    """Pauses inside [t0, t1]: list of (centre_s, length_s) for runs of >= min_win windows (10 ms) below thr."""
    a, b = max(0, int(t0 / 0.010)), min(len(db) - 1, int(t1 / 0.010))
    runs, k = [], a
    while k <= b:
        if db[k] < thr:
            j = k
            while j + 1 <= b and db[j + 1] < thr:
                j += 1
            if j - k + 1 >= min_win:
                runs.append((((k + j) / 2 + 0.5) * 0.010, (j - k + 1) * 0.010))
            k = j + 1
        else:
            k += 1
    return runs


# ----------------------------------------------------------------------------- transcription
def transcribe(audio, model_name, prompt):
    from faster_whisper import WhisperModel
    model = WhisperModel(model_name, device='cpu', compute_type='int8')
    segs, info = model.transcribe(audio, language='en', word_timestamps=True, beam_size=5, vad_filter=False,
                                  condition_on_previous_text=False, initial_prompt=prompt)
    words = []
    for s in segs:
        for w in s.words or []:
            words.append({'w': w.word, 'start': float(w.start), 'end': float(w.end)})
    print(f'transcribed {len(words)} words, {info.duration:.1f} s')
    return words


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--audio', required=True)
    ap.add_argument('--csv', default='docs/dontsay/lines.csv')
    ap.add_argument('--out', default='public/dontsay/voiceover/clips')
    ap.add_argument('--model', default='small.en')
    ap.add_argument('--report', default='docs/dontsay/voice_alignment.md')
    ap.add_argument('--min-coverage', type=float, default=0.3, help='below this a row is treated as not found')
    ap.add_argument('--warn-coverage', type=float, default=0.75, help='below this a row is listed to be checked by ear')
    ap.add_argument('--allow-partial', action='store_true')
    ap.add_argument('--words', help='JSON list of {w,start,end}; skips Whisper')
    ap.add_argument('--lead', type=float, default=0.12, help='room kept before the first word of a clip (s)')
    ap.add_argument('--tail', type=float, default=0.25, help='room kept after the last word of a clip (s)')
    args = ap.parse_args()

    with open(args.csv, newline='', encoding='utf-8') as f:
        rows = [(r['id'].strip(), r['type'].strip(), r['text'].strip()) for r in csv.DictReader(f) if (r.get('id') or '').strip()]
    print(f'{len(rows)} script rows')

    if args.words:
        words = json.load(open(args.words))
    else:
        vocab = ', '.join(sorted({w for _, _, t in rows for w in re.findall(r"[A-Za-z][A-Za-z'-]+", t)}))
        words = transcribe(args.audio, args.model, "Don't say the same as me. " + vocab[:600])
        json.dump(words, open(os.path.splitext(args.report)[0] + '.words.json', 'w'))

    spoken, sp_src = [], []
    for k, w in enumerate(words):
        for t in words_of(w['w']):
            spoken.append(t)
            sp_src.append(k)
    script, owner = [], []
    for ri, (_, _, text) in enumerate(rows):
        for t in words_of(text):
            script.append(t)
            owner.append(ri)

    assign, exact = align(spoken, script)
    print(f'aligned {sum(exact)} of {len(script)} script words ({len(spoken)} spoken)')

    sm = [False] * len(script)      # script word j was heard (exact match)
    for si, sj in enumerate(assign):
        if exact[si]:
            sm[sj] = True
    first_j, last_j = {}, {}
    for j, o in enumerate(owner):
        first_j.setdefault(o, j)
        last_j[o] = j
    own_k = [set() for _ in rows]   # whisper word indices that sit inside each row (any word, even misheard)
    hit = [0] * len(rows)           # words that match the script exactly
    for si, sj in enumerate(assign):
        own_k[owner[sj]].add(sp_src[si])
        if exact[si]:
            hit[owner[sj]] += 1
    need = [0] * len(rows)
    for o in owner:
        need[o] += 1

    info = []
    for ri, (rid, rtype, text) in enumerate(rows):
        ks = sorted(own_k[ri])
        cov = hit[ri] / max(1, need[ri])
        if ks:
            info.append({'id': rid, 'type': rtype, 'text': text, 'cov': cov,
                         'start': min(words[k]['start'] for k in ks), 'end': max(words[k]['end'] for k in ks)})
        else:
            info.append({'id': rid, 'type': rtype, 'text': text, 'cov': 0.0, 'start': None, 'end': None})

    # fill rows with no words from their neighbours (only used with --allow-partial; they are flagged)
    bad = [x for x in info if x['cov'] < args.min_coverage or x['start'] is None]
    weak = [x for x in info if x not in bad and x['cov'] < args.warn_coverage]
    order_errors = [(a['id'], b['id']) for a, b in zip(info, info[1:])
                    if a['start'] is not None and b['start'] is not None and b['start'] < a['start'] - 0.02]

    pcm = decode_pcm(args.audio, SR)
    db = window_db(pcm, SR)
    speech_db = float(np.percentile(db, 90))
    total = len(pcm) / SR

    # cut points between consecutive placed rows
    rid_idx = {r[0]: i for i, r in enumerate(rows)}
    placed = [x for x in info if x['start'] is not None]
    cuts = {}
    for a, b in zip(placed, placed[1:]):
        ia, ib = rid_idx[a['id']], rid_idx[b['id']]
        t0, t1 = a['end'] - 0.04, b['start'] + 0.04
        if t1 - t0 < 0.02:
            t0, t1 = (a['end'] + b['start']) / 2 - 0.01, (a['end'] + b['start']) / 2 + 0.01
        runs = silence_runs(db, t0, t1, speech_db - 25)
        a_tail_heard = sm[last_j[ia]]       # last word of the upper row was heard
        b_head_heard = sm[first_j[ib]]      # first word of the lower row was heard
        t = None
        if runs and a_tail_heard and not b_head_heard:
            t = runs[0][0]                  # a word was lost at the start of the lower row: cut at the first pause after the upper row
        elif runs and b_head_heard and not a_tail_heard:
            t = runs[-1][0]                 # a word was lost at the end of the upper row: cut at the last pause before the lower row
        elif runs:
            t = max(runs, key=lambda r: r[1])[0]
        if t is None:
            t, _ = quietest(db, t0, t1)
        lo = int(t / 0.010)
        cuts[(a['id'], b['id'])] = (t, float(db[min(max(lo, 0), len(db) - 1)]))

    report = ['# Voice alignment report', '', f'- recording: `{os.path.basename(args.audio)}` ({total:.1f} s)',
              f'- script rows: {len(rows)}; placed: {len(placed)}; not found: {len(bad)}; to check by ear: {len(weak)}',
              f'- spoken words {len(spoken)}, script words {len(script)}, exact matches {sum(exact)}', '']
    loud_cuts = [(k, v) for k, v in cuts.items() if v[1] > speech_db - 22]
    if bad:
        report += ['## Rows that could not be placed (re-record or check the text)', '']
        report += [f'- `{x["id"]}` ({x["type"]}) coverage {x["cov"]:.0%}: {x["text"]}' for x in bad]
        report.append('')
    if weak:
        report += ['## Placed, but Whisper heard these differently from the script (listen to these clips)', '']
        report += [f'- `{x["id"]}` ({x["type"]}) {x["cov"]:.0%} matched: {x["text"]}' for x in weak]
        report.append('')
    if order_errors:
        report += ['## Rows out of order (the recording does not follow lines.csv here)', '']
        report += [f'- `{a}` then `{b}`' for a, b in order_errors]
        report.append('')
    if loud_cuts:
        report += ['## Cuts that land close to speech (no clear pause; listen to these clips)', '']
        report += [f'- `{a}` | `{b}` at {cuts[(a, b)][0]:.2f} s (level {cuts[(a, b)][1]:.0f} dB vs speech {speech_db:.0f} dB)' for (a, b), _ in loud_cuts]
        report.append('')
    ok = not bad and not order_errors
    report.insert(2, f'- result: **{"OK" if ok else "NEEDS ATTENTION"}**')
    os.makedirs(os.path.dirname(args.report) or '.', exist_ok=True)
    open(args.report, 'w').write('\n'.join(report) + '\n')
    print('\n'.join(report))

    if not ok and not args.allow_partial:
        print('\nnot writing clips (use --allow-partial to cut the rows that were found)', file=sys.stderr)
        sys.exit(1)

    # write clips from the full-quality audio
    full_rate = 44100
    full = decode_pcm(args.audio, full_rate)
    os.makedirs(args.out, exist_ok=True)
    n_written = 0
    for idx, x in enumerate(placed):
        prev = placed[idx - 1] if idx else None
        nxt = placed[idx + 1] if idx + 1 < len(placed) else None
        s = cuts[(prev['id'], x['id'])][0] if prev else max(0.0, x['start'] - args.lead)
        e = cuts[(x['id'], nxt['id'])][0] if nxt else min(total, x['end'] + args.tail)
        if x['cov'] < args.min_coverage:
            continue
        seg = full[int(s * full_rate):int(e * full_rate)]
        path = os.path.join(args.out, f'{x["id"]}.wav')
        with wave.open(path, 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(full_rate)
            w.writeframes((np.clip(seg, -1, 1) * 32767).astype('<i2').tobytes())
        x['clip_start'], x['clip_end'] = s, e
        n_written += 1
    json.dump(info, open(os.path.splitext(args.report)[0] + '.json', 'w'), indent=1)
    print(f'wrote {n_written} clips to {args.out}')


if __name__ == '__main__':
    main()
