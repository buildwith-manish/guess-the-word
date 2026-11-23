#!/usr/bin/env bash
# NFL voiceover clips. Step 1 checks the originals, step 2 cleans them.
#   source/  originals (never touched, committed)
#   clips/   cleaned output: 48 kHz mono wav, silence trimmed to 0.1 s at each end, loudnorm -16 LUFS (committed)
#   raw/ and clips_master/ are git-ignored scratch folders and are not used here.
#
# Run:  bash scripts/clean_nfl_clips.sh
# Env:  CSV=docs/nfl/lines.csv  DIR=public/nfl/voiceover  SILENCE_DB=-50  TARGET_LUFS=-16  TP=-1.5  LRA=11
#       MIN_SEC=0.3  DRY_RUN=1 (checks + duration table only, writes nothing)
# Fails (before writing anything) when: an id in the CSV has no file, a file has no CSV row, an id has two files,
# a file is empty or shorter than MIN_SEC. Pattern: scripts/clean_gta6_clips.sh (two-pass loudnorm, ids vs files first).
set -euo pipefail

CSV="${CSV:-docs/nfl/lines.csv}"
DIR="${DIR:-public/nfl/voiceover}"
SRC="$DIR/source"
OUT="$DIR/clips"
SILENCE_DB="${SILENCE_DB:--50}"
TARGET_LUFS="${TARGET_LUFS:--16}"
TP="${TP:--1.5}"
LRA="${LRA:-11}"
MIN_SEC="${MIN_SEC:-0.3}"
PAD_MS=100
RATE=48000

command -v ffmpeg >/dev/null && command -v ffprobe >/dev/null || { echo "ffmpeg and ffprobe are required" >&2; exit 1; }
[ -f "$CSV" ] || { echo "missing $CSV" >&2; exit 1; }
[ -d "$SRC" ] || { echo "missing source folder: $SRC" >&2; exit 1; }

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# ---- ids from the CSV ----
tail -n +2 "$CSV" | tr -d '\r' | cut -d, -f1 | sed '/^$/d' | sort > "$tmp/ids.txt"
dups="$(uniq -d "$tmp/ids.txt")"
[ -z "$dups" ] || { echo "FAIL: duplicate ids in $CSV:" >&2; echo "$dups" >&2; exit 1; }

# ---- files in source/: id = file name without extension ----
find "$SRC" -maxdepth 1 -type f \( -iname '*.wav' -o -iname '*.mp3' \) \
  | while IFS= read -r f; do b="$(basename "$f")"; printf '%s\t%s\n' "${b%.*}" "$b"; done | sort > "$tmp/files.tsv"
other="$(find "$SRC" -maxdepth 1 -type f ! \( -iname '*.wav' -o -iname '*.mp3' \) -printf '%f\n')"
cut -f1 "$tmp/files.tsv" > "$tmp/file_ids.txt"

fail=0
list() { echo "$2" | sed 's/^/  /' >&2; }
dups="$(uniq -d "$tmp/file_ids.txt")"
if [ -n "$dups" ]; then echo "FAIL: same id with two files (wav and mp3):" >&2; list x "$dups"; fail=1; fi
missing="$(comm -23 "$tmp/ids.txt" "$tmp/file_ids.txt")"
extra="$(comm -13 "$tmp/ids.txt" "$tmp/file_ids.txt")"
if [ -n "$missing" ]; then echo "FAIL: ids in $CSV with no file ($(echo "$missing" | wc -l)):" >&2; list x "$missing"; fail=1; fi
if [ -n "$extra" ]; then echo "FAIL: files with no row in $CSV ($(echo "$extra" | wc -l)):" >&2; list x "$extra"; fail=1; fi
if [ -n "$other" ]; then echo "FAIL: files that are not wav or mp3 in $SRC:" >&2; list x "$other"; fail=1; fi

# ---- durations ----
: > "$tmp/dur.tsv"
while IFS=$'\t' read -r id name; do
  f="$SRC/$name"
  size="$(stat -c %s "$f")"
  dur="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f" 2>/dev/null || true)"
  dur="${dur:-0}"; [ "$dur" != "N/A" ] || dur=0
  if [ "$size" -eq 0 ]; then echo "FAIL: empty file: $name" >&2; fail=1; fi
  if awk -v d="$dur" -v m="$MIN_SEC" 'BEGIN{exit !(d < m)}'; then echo "FAIL: $name is $dur s (shorter than $MIN_SEC s)" >&2; fail=1; fi
  printf '%s\t%.3f\n' "$id" "$dur" >> "$tmp/dur.tsv"
done < "$tmp/files.tsv"
[ "$fail" -eq 0 ] || { echo "stopped: nothing written" >&2; exit 1; }
echo "ok: $(wc -l < "$tmp/ids.txt") ids, $(wc -l < "$tmp/files.tsv") files, all match, none empty or under $MIN_SEC s"

echo
echo "duration of every clip (seconds)"
awk -F'\t' '{printf "%s %6.2f%s", $1, $2, (NR % 4 == 0 ? "\n" : "   ")} END{print ""}' "$tmp/dur.tsv"
echo "total: $(awk -F'\t' '{s+=$2} END{printf "%.1f s", s}' "$tmp/dur.tsv")"
echo
echo "10 longest"
sort -t$'\t' -k2,2nr "$tmp/dur.tsv" | head -10 | awk -F'\t' '{printf "  %-9s %6.2f\n",$1,$2}'
echo

if [ "${DRY_RUN:-0}" = "1" ]; then echo "DRY_RUN=1: nothing written"; exit 0; fi

# ---- clean: source/ -> clips/<id>.wav ----
mkdir -p "$OUT"
# strip silence at both ends (peak threshold); the 0.1 s pad is added after loudnorm
TRIM="silenceremove=start_periods=1:start_threshold=${SILENCE_DB}dB:detection=peak,areverse,silenceremove=start_periods=1:start_threshold=${SILENCE_DB}dB:detection=peak,areverse"
PAD="adelay=${PAD_MS}:all=1,apad=pad_dur=0.1"
MONO="aformat=channel_layouts=mono"

field() { sed -n "s/.*\"$1\" *: *\"\([^\"]*\)\".*/\1/p" "$2" | tail -1; }

n=0
while IFS=$'\t' read -r id name; do
  in="$SRC/$name"
  # pass 1: measure the trimmed mono audio
  ffmpeg -nostdin -hide_banner -y -i "$in" -af "$MONO,$TRIM,loudnorm=I=${TARGET_LUFS}:TP=${TP}:LRA=${LRA}:print_format=json" -f null - 2> "$tmp/p1.log" || { echo "FAIL pass 1: $name" >&2; tail -5 "$tmp/p1.log" >&2; exit 1; }
  mi="$(field input_i "$tmp/p1.log")"; mtp="$(field input_tp "$tmp/p1.log")"; mlra="$(field input_lra "$tmp/p1.log")"
  mth="$(field input_thresh "$tmp/p1.log")"; moff="$(field target_offset "$tmp/p1.log")"
  if [ -z "$mi" ] || [ -z "$mth" ] || [ "$mi" = "-inf" ]; then echo "FAIL: no loudness measured for $name (silent clip?)" >&2; exit 1; fi
  # pass 2: apply linearly with the measured values, 48 kHz mono, then the 0.1 s pads
  ffmpeg -nostdin -hide_banner -y -i "$in" -af "$MONO,$TRIM,loudnorm=I=${TARGET_LUFS}:TP=${TP}:LRA=${LRA}:measured_I=${mi}:measured_TP=${mtp}:measured_LRA=${mlra}:measured_thresh=${mth}:offset=${moff}:linear=true,aresample=${RATE},${PAD}" \
    -ar "$RATE" -ac 1 -c:a pcm_s16le "$tmp/out.wav" 2> "$tmp/p2.log" || { echo "FAIL pass 2: $name" >&2; tail -5 "$tmp/p2.log" >&2; exit 1; }
  mv "$tmp/out.wav" "$OUT/$id.wav"
  n=$((n + 1))
done < "$tmp/files.tsv"

echo "cleaned $n clips -> $OUT (originals untouched in $SRC)"
