#!/usr/bin/env bash
# Cleans the Christmas quiz voiceover clips: trim leading/trailing silence to 0.1 s, loudness-normalize to -16 LUFS
# (ffmpeg loudnorm, two passes). Originals are kept in raw/; the cleaned file is written back to clips/.
#
# Run:  bash scripts/clean_xmas_clips.sh
# Env:  ARCHIVE=clips.7z  CSV=docs/xmas/lines.csv  DIR=public/xmas/voiceover  (clips in $DIR/clips, originals in $DIR/raw)
#       SILENCE_DB=-50 (what counts as silence)  TARGET_LUFS=-16  TP=-1.5  LRA=11  DRY_RUN=1 (checks + table only)
# Re-running is safe: raw/ is the source of truth, a raw file is never overwritten.
# Fails (before touching anything) if an id in the CSV has no clip, or a clip has no CSV row.
set -euo pipefail

CSV="${CSV:-docs/xmas/lines.csv}"
DIR="${DIR:-public/xmas/voiceover}"
CLIPS="$DIR/clips"
RAW="$DIR/raw"
ARCHIVE="${ARCHIVE:-clips.7z}"
SILENCE_DB="${SILENCE_DB:--50}"
TARGET_LUFS="${TARGET_LUFS:--16}"
TP="${TP:--1.5}"
LRA="${LRA:-11}"
PAD_MS=100

command -v ffmpeg >/dev/null && command -v ffprobe >/dev/null || { echo "ffmpeg and ffprobe are required" >&2; exit 1; }
[ -f "$CSV" ] || { echo "missing $CSV" >&2; exit 1; }
# ---- unpack the archive when there are no clips yet ----
if [ -z "$(find "$CLIPS" -maxdepth 1 -type f -iname '*.wav' -print -quit 2>/dev/null)" ]; then
  [ -f "$ARCHIVE" ] || { echo "no clips in $CLIPS and no archive $ARCHIVE" >&2; exit 1; }
  sz=""; for c in 7z 7za 7zr; do command -v "$c" >/dev/null && sz="$c" && break; done
  [ -n "$sz" ] || { echo "$CLIPS is empty and unpacking $ARCHIVE needs 7z, 7za or 7zr" >&2; exit 1; }
  mkdir -p "$DIR"
  "$sz" x -y -o"$DIR" "$ARCHIVE" >/dev/null || { echo "could not unpack $ARCHIVE" >&2; exit 1; }
  echo "unpacked $ARCHIVE -> $CLIPS"
fi
[ -d "$CLIPS" ] || { echo "missing clips folder: $CLIPS" >&2; exit 1; }

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# ---- ids from the CSV (first column, header skipped, CRLF stripped) ----
tail -n +2 "$CSV" | tr -d '\r' | cut -d, -f1 | sed '/^$/d' | sort > "$tmp/ids.txt"
dups="$(uniq -d "$tmp/ids.txt")"
[ -z "$dups" ] || { echo "duplicate ids in $CSV:" >&2; echo "$dups" >&2; exit 1; }

# ---- clips: id = file name without extension ----
find "$CLIPS" -maxdepth 1 -type f \( -iname '*.wav' -o -iname '*.mp3' -o -iname '*.m4a' -o -iname '*.flac' -o -iname '*.ogg' \) \
  | while IFS= read -r f; do b="$(basename "$f")"; printf '%s\t%s\n' "${b%.*}" "$b"; done | sort > "$tmp/clips.tsv"
cut -f1 "$tmp/clips.tsv" > "$tmp/clip_ids.txt"
dups="$(uniq -d "$tmp/clip_ids.txt")"
[ -z "$dups" ] || { echo "same id with two extensions in $CLIPS:" >&2; echo "$dups" >&2; exit 1; }

missing="$(comm -23 "$tmp/ids.txt" "$tmp/clip_ids.txt")"
orphans="$(comm -13 "$tmp/ids.txt" "$tmp/clip_ids.txt")"
fail=0
if [ -n "$missing" ]; then echo "FAIL: ids in $CSV with no clip ($(echo "$missing" | wc -l)):" >&2; echo "$missing" | sed 's/^/  /' >&2; fail=1; fi
if [ -n "$orphans" ]; then echo "FAIL: clips with no row in $CSV ($(echo "$orphans" | wc -l)):" >&2; echo "$orphans" | sed 's/^/  /' >&2; fail=1; fi
[ "$fail" -eq 0 ] || exit 1
echo "ok: $(wc -l < "$tmp/ids.txt") ids, $(wc -l < "$tmp/clips.tsv") clips, all match"

# ---- before-table: duration and integrated loudness of every clip (measured on the originals) ----
src_of() { # file name in clips/ -> the original: raw/ if already saved, else clips/
  if [ -f "$RAW/$1" ]; then echo "$RAW/$1"; else echo "$CLIPS/$1"; fi
}
integrated() { # integrated loudness (LUFS) of a file; -inf if silent
  ffmpeg -nostdin -nostats -hide_banner -i "$1" -af ebur128 -f null - 2>&1 | awk '/Integrated loudness:/{f=1} f&&/I:/{print $2; exit}'
}
: > "$tmp/stats.tsv"
while IFS=$'\t' read -r id name; do
  f="$(src_of "$name")"
  dur="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")"
  lufs="$(integrated "$f")"
  printf '%s\t%.2f\t%s\n' "$id" "$dur" "${lufs:--99}" >> "$tmp/stats.tsv"
done < "$tmp/clips.tsv"

echo
echo "10 longest clips (before cleaning)"
printf '%-10s %10s %10s\n' id seconds LUFS
sort -t$'\t' -k2,2nr "$tmp/stats.tsv" | head -10 | awk -F'\t' '{printf "%-10s %10.2f %10s\n",$1,$2,$3}'
echo
echo "10 quietest clips (before cleaning)"
printf '%-10s %10s %10s\n' id seconds LUFS
sort -t$'\t' -k3,3n "$tmp/stats.tsv" | head -10 | awk -F'\t' '{printf "%-10s %10.2f %10s\n",$1,$2,$3}'
echo

if [ "${DRY_RUN:-0}" = "1" ]; then echo "DRY_RUN=1: nothing written"; exit 0; fi

# ---- clean ----
mkdir -p "$RAW"
# strip silence at both ends (peak threshold); the 0.1 s pad is added after loudnorm
TRIM="silenceremove=start_periods=1:start_threshold=${SILENCE_DB}dB:detection=peak,areverse,silenceremove=start_periods=1:start_threshold=${SILENCE_DB}dB:detection=peak,areverse"
PAD="adelay=${PAD_MS}|${PAD_MS},apad=pad_dur=0.1"

field() { # value of a key in loudnorm's JSON block
  sed -n "s/.*\"$1\" *: *\"\([^\"]*\)\".*/\1/p" "$2" | tail -1
}

n=0
while IFS=$'\t' read -r id name; do
  [ -f "$RAW/$name" ] || cp -p "$CLIPS/$name" "$RAW/$name"
  in="$RAW/$name"
  ext="${name##*.}"
  rate="$(ffprobe -v error -select_streams a:0 -show_entries stream=sample_rate -of csv=p=0 "$in")"
  codec=()
  case "${ext,,}" in wav) codec=(-c:a pcm_s16le) ;; esac

  # pass 1: measure the trimmed audio
  ffmpeg -nostdin -hide_banner -y -i "$in" -af "$TRIM,loudnorm=I=${TARGET_LUFS}:TP=${TP}:LRA=${LRA}:print_format=json" -f null - 2> "$tmp/p1.log" || { echo "FAIL pass 1: $name" >&2; tail -5 "$tmp/p1.log" >&2; exit 1; }
  mi="$(field input_i "$tmp/p1.log")"; mtp="$(field input_tp "$tmp/p1.log")"; mlra="$(field input_lra "$tmp/p1.log")"
  mth="$(field input_thresh "$tmp/p1.log")"; moff="$(field target_offset "$tmp/p1.log")"
  if [ -z "$mi" ] || [ -z "$mth" ] || [ "$mi" = "-inf" ]; then echo "FAIL: no loudness measured for $name (silent clip?)" >&2; exit 1; fi

  # pass 2: apply with the measured values (linear), then the 0.1 s pads
  ffmpeg -nostdin -hide_banner -y -i "$in" -af "$TRIM,loudnorm=I=${TARGET_LUFS}:TP=${TP}:LRA=${LRA}:measured_I=${mi}:measured_TP=${mtp}:measured_LRA=${mlra}:measured_thresh=${mth}:offset=${moff}:linear=true,aresample=${rate},${PAD}" \
    -ar "$rate" "${codec[@]}" "$tmp/out.$ext" 2> "$tmp/p2.log" || { echo "FAIL pass 2: $name" >&2; tail -5 "$tmp/p2.log" >&2; exit 1; }
  mv "$tmp/out.$ext" "$CLIPS/$name"
  n=$((n + 1))
done < "$tmp/clips.tsv"

echo "cleaned $n clips -> $CLIPS (originals in $RAW)"
