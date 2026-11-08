#!/usr/bin/env python3
"""Scan voiceover clips and update voiceover-manifest.json.

Clip naming convention:
  qq01.mp3 ... qq50.mp3          question-phase clips (play during timer)
  r01.mp3  ... r50.mp3           reveal clips (play after answer stamps in)
  bonus01.mp3 ... bonus05.mp3    bonus round reveal clips
  hook.mp3                       intro hook
  reminder_10.mp3                reminder after Q10
  reminder_25.mp3                reminder after Q25
  reminder_40.mp3                reminder after Q40
  scoreboard_intro.mp3           scoreboard intro
  scoreboard_legend.mp3          rank: 0-3 wrong
  scoreboard_expert.mp3          rank: 4-10 wrong
  scoreboard_good.mp3            rank: 11-20 wrong
  scoreboard_beginner.mp3        rank: 21-30 wrong
  scoreboard_keepgoing.mp3       rank: 31+ wrong
  outro.mp3                      end screen

Run after uploading clips to public/voiceover/:
  python3 scripts/scan-voiceover.py
"""
import os, json, subprocess, re

ROOT   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VO_DIR = os.path.join(ROOT, "public", "voiceover")
MANIFEST = os.path.join(ROOT, "src", "voiceover-manifest.json")

def get_duration(path):
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", path],
        capture_output=True, text=True
    )
    try:
        return float(r.stdout.strip())
    except Exception:
        return 0.0

def main():
    os.makedirs(VO_DIR, exist_ok=True)

    manifest = {
        "qq": {}, "q": {}, "bonus": {},
        "hook": None,
        "reminder": {},
        "scoreboard": {}
    }

    for f in sorted(os.listdir(VO_DIR)):
        if not re.search(r"\.(mp3|wav|m4a|aac|ogg|flac)$", f, re.I):
            continue
        path = os.path.join(VO_DIR, f)
        dur = get_duration(path)
        if dur <= 0:
            print(f"  ! could not measure {f}")
            continue

        entry = {"file": f, "seconds": round(dur, 3)}

        # qq## — question phase
        m = re.match(r"^qq0*(\d+)\.", f, re.I)
        if m:
            manifest["qq"][str(int(m.group(1)))] = entry
            continue

        # r## — reveal
        m = re.match(r"^r0*(\d+)\.", f, re.I)
        if m:
            manifest["q"][str(int(m.group(1)))] = entry
            continue

        # bonus##
        m = re.match(r"^bonus0*(\d+)\.", f, re.I)
        if m:
            manifest["bonus"][str(int(m.group(1)))] = entry
            continue

        # hook
        if re.match(r"^hook\.", f, re.I):
            manifest["hook"] = entry
            continue

        # reminder_##
        m = re.match(r"^reminder_(\d+)\.", f, re.I)
        if m:
            manifest["reminder"][m.group(1)] = entry
            continue

        # scoreboard_*
        m = re.match(r"^(scoreboard_intro|scoreboard_legend|scoreboard_expert|scoreboard_good|scoreboard_beginner|scoreboard_keepgoing)\.", f, re.I)
        if m:
            key = m.group(1).replace("scoreboard_", "")
            manifest["scoreboard"][key] = entry
            continue

        # outro
        if re.match(r"^outro\.", f, re.I):
            manifest["scoreboard"]["outro"] = entry
            continue

        print(f"  ! ignored {f} (unexpected name)")

    with open(MANIFEST, "w") as fh:
        json.dump(manifest, fh, indent=2)
        fh.write("\n")

    q  = len(manifest["q"])
    qq = len(manifest["qq"])
    b  = len(manifest["bonus"])
    sc = len(manifest["scoreboard"])
    print(f"\n  voiceover scan complete")
    print(f"  {qq}/50 question clips (qq##) · {q}/50 reveal clips (r##) · {b}/5 bonus clips")
    print(f"  hook: {'✓' if manifest['hook'] else '✗'} · reminders: {len(manifest['reminder'])}/3 · scoreboard: {sc}/6")
    print(f"  manifest → {os.path.relpath(MANIFEST, ROOT)}\n")

if __name__ == "__main__":
    main()
