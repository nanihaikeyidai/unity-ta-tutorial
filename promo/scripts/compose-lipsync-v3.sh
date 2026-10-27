#!/usr/bin/env bash
# Compose InfiniteTalk lip-sync segments into Unity TA explainer v3.
# Usage: bash scripts/compose-lipsync-v3.sh   (env: FORCE=1 redo all, KEY=rembg|colorkey, NARR_H=300)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"
IT=infinitetalk; OUTD=$IT/out; WORK=_render_v3; mkdir -p "$WORK"
FINAL=unity-ta-explainer-v3-lipsync.mp4
STILL=unity-ta-explainer-v3-lipsync-still.png
QC=$OUTD/lipsync-all-qc.mp4
NARR_H=${NARR_H:-300}; KEY=${KEY:-rembg}; FORCE=${FORCE:-0}
# Crop empty lower half of RH 576x1024 portrait (character ~y0–560)
CROP_H=${CROP_H:-580}
VENV=/workspace/.venv-rembg
# NOTE: this box's libvpx-vp9 drops alpha (yuv420p only). Use qtrle ARGB .mov instead.
ALPHA_EXT=mov
die(){ echo "ERROR: $*" >&2; exit 1; }
command -v ffmpeg >/dev/null || die "ffmpeg not found"
[ -f narration-indextts.wav ] || die "missing narration-indextts.wav"

mapfile -t STARTS < <(python3 -c "import json;[print(s['start']) for s in json.load(open('$IT/SEGMENTS.json'))]")
mapfile -t ENDS   < <(python3 -c "import json;[print(s['end']) for s in json.load(open('$IT/SEGMENTS.json'))]")
[ ${#STARTS[@]} -eq 4 ] || die "SEGMENTS.json must have 4 segments"
missing=0
for n in 1 2 3 4; do f=$OUTD/lipsync-seg0$n.mp4
  [ -s "$f" ] || { echo "MISSING: $f" >&2; missing=1; }; done
[ $missing -eq 0 ] || die "lip-sync clips not ready; put RunningHub InfiniteTalk outputs in $OUTD/"

if [ "$KEY" = rembg ] && ! "$VENV/bin/python" -c "import rembg" 2>/dev/null; then
  echo "WARN: rembg venv unusable -> colorkey"; KEY=colorkey; fi

# 0) freeze-pad any clip shorter than its cue window (esp. seg02: 7.72 vs 8.3)
for n in 1 2 3 4; do
  src=$OUTD/lipsync-seg0$n.mp4
  pad=$OUTD/lipsync-seg0$n-padded.mp4
  need=$(python3 -c "print(round(${ENDS[$((n-1))]}-${STARTS[$((n-1))]},3))")
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$src")
  short=$(python3 -c "print(1 if float('$dur')+0.05 < float('$need') else 0)")
  if [ "$short" = 1 ]; then
    if [ "$FORCE" != 1 ] && [ -s "$pad" ] && [ "$pad" -nt "$src" ]; then
      echo "skip pad seg0$n (need ${need}s, have ${dur}s)"
    else
      ffmpeg -loglevel error -y -i "$src" -vf "tpad=stop_mode=clone:stop_duration=$(python3 -c "print(max(0, float('$need')-float('$dur')+0.05))")" \
        -an -c:v libx264 -crf 18 -preset fast -pix_fmt yuv420p "$pad"
      echo "pad seg0$n ${dur}s -> ${need}s (+freeze) -> $pad"
    fi
  else
    if [ "$FORCE" = 1 ] || [ ! -e "$pad" ] || [ "$src" -nt "$pad" ]; then
      ln -f "$src" "$pad" 2>/dev/null || cp -f "$src" "$pad"
      echo "no pad needed seg0$n (${dur}s >= ${need}s)"
    else
      echo "skip pad seg0$n"
    fi
  fi
done

# 1) alpha per segment (crop top character region, rembg, encode qtrle ARGB)
for n in 1 2 3 4; do
  src=$OUTD/lipsync-seg0$n-padded.mp4
  dst=$OUTD/lipsync-seg0$n-alpha.$ALPHA_EXT
  if [ "$FORCE" != 1 ] && [ -s "$dst" ] && [ "$dst" -nt "$src" ]; then echo "skip alpha seg0$n"; continue; fi
  fps=$(ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 "$src")
  if [ "$KEY" = rembg ]; then
    fr=$WORK/seg0$n-frames; rm -rf "$fr" "$fr-a"; mkdir -p "$fr" "$fr-a"
    ffmpeg -loglevel error -y -i "$src" -vf "crop=576:${CROP_H}:0:0" "$fr/%05d.png"
    "$VENV/bin/python" - "$fr" "$fr-a" <<'PY'
import sys, os
from rembg import remove, new_session
from PIL import Image
s = new_session("u2net")
i, o = sys.argv[1], sys.argv[2]
files = sorted(f for f in os.listdir(i) if f.endswith(".png"))
for k, f in enumerate(files, 1):
    remove(Image.open(os.path.join(i, f)), session=s).save(os.path.join(o, f))
    if k % 25 == 0 or k == len(files):
        print(f"  rembg {k}/{len(files)}", flush=True)
PY
    # qtrle keeps ARGB alpha; libvpx-vp9 on this box strips to yuv420p
    ffmpeg -loglevel error -y -framerate "$fps" -i "$fr-a/%05d.png" \
      -c:v qtrle -pix_fmt argb "$dst"
    rm -rf "$fr" "$fr-a"
  else
    col=$(ffmpeg -loglevel error -i "$src" -vf "crop=1:1:2:2,format=rgb24" -frames:v 1 -f rawvideo - | od -An -tx1 | tr -d ' \n')
    ffmpeg -loglevel error -y -i "$src" \
      -vf "crop=576:${CROP_H}:0:0,colorkey=0x$col:0.22:0.06,format=rgba" \
      -an -c:v qtrle -pix_fmt argb "$dst"
  fi
  echo "alpha -> $dst ($(ffprobe -v error -select_streams v:0 -show_entries stream=pix_fmt -of csv=p=0 "$dst"))"
done

# 2) base stage without narrator
BASE=$WORK/base-nonarr.mp4; PATCH=0
if [ "$FORCE" = 1 ] || [ ! -s "$BASE" ]; then
  if NO_NARRATOR=1 OUT_MP4="$ROOT/$BASE" OUT_STILL="$ROOT/$WORK/still.png" node scripts/render-v2.mjs; then :; else
    echo "WARN: no-narrator re-render failed -> v2 + blur patch"; BASE=unity-ta-explainer-v2.mp4; PATCH=1; fi
fi
[ -s "$BASE" ] || die "no base video"

# 3) overlay timed segments + mux narration
in=(-i "$BASE"); for n in 1 2 3 4; do in+=(-i "$OUTD/lipsync-seg0$n-alpha.$ALPHA_EXT"); done
in+=(-i narration-indextts.wav)
fc="[0:v]format=yuv420p"
[ $PATCH = 1 ] && fc="[0:v]split[b0][b1];[b1]crop=360:400:0:320,boxblur=20:2[bp];[b0][bp]overlay=0:320"
fc="$fc[v0]"
for n in 1 2 3 4; do
  s=${STARTS[$((n-1))]}
  fc="$fc;[$n:v]scale=-2:$NARR_H,format=rgba,setpts=PTS-STARTPTS+$s/TB[n$n];[v$((n-1))][n$n]overlay=12:H-h-6:format=auto:eof_action=pass[v$n]"
done
ffmpeg -loglevel error -stats -y "${in[@]}" -filter_complex "$fc" -map "[v4]" -map 5:a \
  -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -c:a aac -b:a 192k \
  -t 33.5 -movflags +faststart "$FINAL"
echo "OK -> $ROOT/$FINAL"
ffprobe -v error -show_entries format=duration,size -of default "$FINAL"

# 4) still at ~t=8s (during seg02)
ffmpeg -loglevel error -y -ss 8 -i "$FINAL" -frames:v 1 "$STILL"
echo "still -> $ROOT/$STILL"

# 5) QC concat of raw lipsync (padded where needed)
printf "file '%s'\n" "$ROOT/$OUTD/lipsync-seg01-padded.mp4" \
  "$ROOT/$OUTD/lipsync-seg02-padded.mp4" \
  "$ROOT/$OUTD/lipsync-seg03-padded.mp4" \
  "$ROOT/$OUTD/lipsync-seg04-padded.mp4" > "$WORK/lipsync-qc-list.txt"
ffmpeg -loglevel error -y -f concat -safe 0 -i "$WORK/lipsync-qc-list.txt" -c copy "$QC" \
  || ffmpeg -loglevel error -y -f concat -safe 0 -i "$WORK/lipsync-qc-list.txt" -c:v libx264 -crf 20 -an "$QC"
echo "qc -> $ROOT/$QC"
