#!/usr/bin/env python3
"""Scan voiceover clips and update voiceover-manifest.json.

This repo plays voiceover natively via Remotion <Audio> + <Sequence> — no
pre-mixing needed. But the voiceover-manifest.json must be regenerated
whenever voiceover clips are added/changed.

Run this AFTER uploading new voiceover clips to public/voiceover/:
  python3 scripts/scan-voiceover.py

Then run:  node scripts/voiceover-scan.js  (the Node version that does the same thing)
"""
import os, json, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VO_DIR = os.path.join(ROOT, 'public', 'voiceover')
MANIFEST = os.path.join(ROOT, 'src', 'voiceover-manifest.json')

def get_duration(path):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                        '-of', 'csv=p=0', path], capture_output=True, text=True)
    try:
        return float(r.stdout.strip())
    except:
        return 0.0

def main():
    if not os.path.isdir(VO_DIR):
        print(f"No voiceover directory at {VO_DIR}")
        print("Creating it...")
        os.makedirs(VO_DIR, exist_ok=True)

    manifest = {"q": {}, "bonus": {}}

    for f in sorted(os.listdir(VO_DIR)):
        if not f.endswith(('.wav', '.mp3')):
            continue
        path = os.path.join(VO_DIR, f)
        dur = get_duration(path)
        if dur <= 0:
            continue

        # Parse: q01.wav -> q/1, bonus1.wav -> bonus/1
        name = f.rsplit('.', 1)[0]
        if name.startswith('q') and name[1:].isdigit():
            qid = int(name[1:])
            manifest["q"][str(qid)] = {"file": f, "seconds": round(dur, 2)}
        elif name.startswith('bonus') and name[5:].isdigit():
            bid = int(name[5:])
            manifest["bonus"][str(bid)] = {"file": f, "seconds": round(dur, 2)}

    with open(MANIFEST, 'w') as f:
        json.dump(manifest, f, indent=2)

    q_count = len(manifest["q"])
    b_count = len(manifest["bonus"])
    print(f"✅ Scanned {q_count + b_count} voiceover clips")
    print(f"   Questions: {q_count}")
    print(f"   Bonus: {b_count}")
    print(f"   Manifest: {MANIFEST}")

if __name__ == '__main__':
    main()
