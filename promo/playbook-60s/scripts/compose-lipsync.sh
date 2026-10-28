#!/usr/bin/env bash
# Compose N InfiniteTalk segments onto playbook-60s base (no hardcoded segment count).
# Usage: bash scripts/compose-lipsync.sh
#   FORCE=1           regenerate pad/alpha/base
#   OVERLAY_ONLY=1    skip pad/alpha/base; only rebuild final mux (reuse alpha movs)
#   KEY=rembg|colorkey  NARR_H=320  CROP_H=720  FADE=0.2
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"
IT=infinitetalk; OUTD=$IT/out; WORK=_render; mkdir -p "$WORK" "$OUTD"
FINAL=unity-ta-playbook-60s.mp4
STILL=unity-ta-playbook-60s-still.png
QC=$OUTD/lipsync-all-qc.mp4
SEGJSON=$IT/SEGMENTS.json
NARR_H=${NARR_H:-300}; KEY=${KEY:-rembg}; FORCE=${FORCE:-0}
CROP_H=${CROP_H:-580}
FADE=${FADE:-0.2}
OVERLAY_ONLY=${OVERLAY_ONLY:-0}
VENV="${VENV:-$HOME/.venv-rembg}"
ALPHA_EXT=mov
WAV=narration-indextts.wav
BASE=${BASE:-$WORK/base-nonarr.mp4}

die(){ echo "ERROR: $*" >&2; exit 1; }
command -v ffmpeg >/dev/null || die "ffmpeg not found"
command -v ffprobe >/dev/null || die "ffprobe not found"
[ -f "$SEGJSON" ] || die "missing $SEGJSON"
[ -f "$WAV" ] || die "missing $WAV"

mapfile -t IDS   < <(python3 -c "import json;d=json.load(open('$SEGJSON'));print('\n'.join(s['id'] for s in d['segments']))")
mapfile -t STARTS < <(python3 -c "import json;d=json.load(open('$SEGJSON'));print('\n'.join(str(s['start']) for s in d['segments']))")
mapfile -t ENDS   < <(python3 -c "import json;d=json.load(open('$SEGJSON'));print('\n'.join(str(s['end']) for s in d['segments']))")
mapfile -t SKIPS  < <(python3 -c "import json;d=json.load(open('$SEGJSON'));print('\n'.join('1' if s.get('skip_rh') else '0' for s in d['segments']))")
N=${#IDS[@]}
[ "$N" -ge 1 ] || die "no segments"
AUDIO_TOTAL=$(python3 -c "import json;print(json.load(open('$SEGJSON')).get('audio_total',47.772))")
PICTURE_DUR=$(python3 -c "print(round(float('$AUDIO_TOTAL')+2,1))")
echo "segments=$N audio=$AUDIO_TOTAL picture=$PICTURE_DUR fade=$FADE overlay_only=$OVERLAY_ONLY"

if [ "$OVERLAY_ONLY" != 1 ]; then
  # Ensure a source exists for every segment (skip_rh → black/idle placeholder mp4 from character still)
  AUTH=$IT/in/character.png
  [ -f "$AUTH" ] || die "missing $AUTH"
  for i in "${!IDS[@]}"; do
    id=${IDS[$i]}; src=$OUTD/lipsync-$id.mp4
    if [ "${SKIPS[$i]}" = 1 ]; then
      if [ "$FORCE" = 1 ] || [ ! -s "$src" ]; then
        need=$(python3 -c "print(round(float('${ENDS[$i]}')-float('${STARTS[$i]}'),3))")
        ffmpeg -loglevel error -y -loop 1 -i "$AUTH" -t "$need" -r 25 \
          -vf "scale=576:1024:force_original_aspect_ratio=decrease,pad=576:1024:(ow-iw)/2:(oh-ih)/2:white" \
          -c:v libx264 -pix_fmt yuv420p -an "$src"
        echo "placeholder (skip_rh) $src (${need}s)"
      fi
    else
      [ -s "$src" ] || die "MISSING lip-sync clip: $src (run InfiniteTalk for $id)"
    fi
  done

  if [ "$KEY" = rembg ] && ! "$VENV/bin/python" -c "import rembg" 2>/dev/null; then
    echo "WARN: rembg venv unusable -> colorkey"; KEY=colorkey
  fi

  # 0) freeze-pad short clips to cue window
  for i in "${!IDS[@]}"; do
    id=${IDS[$i]}
    src=$OUTD/lipsync-$id.mp4
    pad=$OUTD/lipsync-$id-padded.mp4
    need=$(python3 -c "print(round(float('${ENDS[$i]}')-float('${STARTS[$i]}'),3))")
    dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$src")
    short=$(python3 -c "print(1 if float('$dur')+0.05 < float('$need') else 0)")
    if [ "$short" = 1 ]; then
      if [ "$FORCE" != 1 ] && [ -s "$pad" ] && [ "$pad" -nt "$src" ]; then
        echo "skip pad $id"
      else
        ffmpeg -loglevel error -y -i "$src" \
          -vf "tpad=stop_mode=clone:stop_duration=$(python3 -c "print(max(0, float('$need')-float('$dur')+0.05))")" \
          -an -c:v libx264 -crf 18 -preset fast -pix_fmt yuv420p "$pad"
        echo "pad $id ${dur}s -> ${need}s"
      fi
    else
      if [ "$FORCE" = 1 ] || [ ! -e "$pad" ] || [ "$src" -nt "$pad" ]; then
        ln -f "$src" "$pad" 2>/dev/null || cp -f "$src" "$pad"
        echo "no pad $id (${dur}s)"
      else
        echo "skip pad $id"
      fi
    fi
  done

  # 1) alpha per segment
  for i in "${!IDS[@]}"; do
    id=${IDS[$i]}
    src=$OUTD/lipsync-$id-padded.mp4
    dst=$OUTD/lipsync-$id-alpha.$ALPHA_EXT
    if [ "$FORCE" != 1 ] && [ -s "$dst" ] && [ "$dst" -nt "$src" ]; then echo "skip alpha $id"; continue; fi
    fps=$(ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 "$src")
    if [ "$KEY" = rembg ]; then
      fr=$WORK/$id-frames; rm -rf "$fr" "$fr-a"; mkdir -p "$fr" "$fr-a"
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
      ffmpeg -loglevel error -y -framerate "$fps" -i "$fr-a/%05d.png" -c:v qtrle -pix_fmt argb "$dst"
      rm -rf "$fr" "$fr-a"
    else
      col=$(ffmpeg -loglevel error -i "$src" -vf "crop=1:1:2:2,format=rgb24" -frames:v 1 -f rawvideo - | od -An -tx1 | tr -d ' \n')
      ffmpeg -loglevel error -y -i "$src" \
        -vf "crop=576:${CROP_H}:0:0,colorkey=0x$col:0.22:0.06,format=rgba" \
        -an -c:v qtrle -pix_fmt argb "$dst"
    fi
    echo "alpha -> $dst"
  done

  # 2) base without narrator
  if [ "$FORCE" = 1 ] || [ ! -s "$BASE" ]; then
    NO_NARRATOR=1 OUT_MP4="$ROOT/$BASE" OUT_STILL="$ROOT/$WORK/base-nonarr-still.png" \
      node "$ROOT/render.mjs" || die "base render failed"
  fi
fi

[ -s "$BASE" ] || die "no base video $BASE"
for i in "${!IDS[@]}"; do
  a=$OUTD/lipsync-${IDS[$i]}-alpha.$ALPHA_EXT
  [ -s "$a" ] || die "missing alpha $a (run without OVERLAY_ONLY first)"
done

# 3) overlay all segments — time-fit each alpha to cue window + crossfade at boundaries
in_args=(-i "$BASE")
for i in "${!IDS[@]}"; do
  in_args+=(-i "$OUTD/lipsync-${IDS[$i]}-alpha.$ALPHA_EXT")
done
in_args+=(-i "$WAV")
AIDX=$((1 + N))

fc="[0:v]format=yuv420p[v0]"
for i in "${!IDS[@]}"; do
  n=$((i+1))
  prev=$i
  s=${STARTS[$i]}
  e=${ENDS[$i]}
  alpha=$OUTD/lipsync-${IDS[$i]}-alpha.$ALPHA_EXT
  # Place next seg FADE early so alpha fades overlap; span covers through cue end.
  if [ "$i" -eq 0 ]; then
    place=$(python3 -c "print(float('$s'))")
    fade_in=0
  else
    place=$(python3 -c "print(max(0.0, float('$s')-float('$FADE')))")
    fade_in=$FADE
  fi
  place_end=$(python3 -c "print(float('$e'))")
  need=$(python3 -c "print(round(float('$place_end')-float('$place'),6))")
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$alpha")
  # Always time-fit (setpts) so whole lip-sync maps into [place, end].
  # Seg01 7.72→7.0 must NOT chop mouth; later segs fit to need+FADE span.
  ratio=$(python3 -c "print(float('$need')/max(float('$dur'),1e-6))")

  if [ "$i" -eq $((N-1)) ]; then
    fade_out=0
  else
    fade_out=$FADE
  fi

  fade_chain=""
  if python3 -c "import sys; sys.exit(0 if float('$fade_in')>0.001 else 1)"; then
    fade_chain="${fade_chain},fade=t=in:st=0:d=${fade_in}:alpha=1"
  fi
  if python3 -c "import sys; sys.exit(0 if float('$fade_out')>0.001 else 1)"; then
    fout_st=$(python3 -c "print(max(0.0, float('$need')-float('$fade_out')))")
    fade_chain="${fade_chain},fade=t=out:st=${fout_st}:d=${fade_out}:alpha=1"
  fi

  # scale → rgba → time-fit → fps → trim to need → reset pts → alpha fades → place on timeline
  fc="${fc};[${n}:v]scale=-2:${NARR_H},format=rgba,setpts=PTS*(${ratio}),fps=25,trim=duration=${need},setpts=PTS-STARTPTS${fade_chain},setpts=PTS-STARTPTS+${place}/TB[n${n}];[v${prev}][n${n}]overlay=12:H-h-6:format=auto:eof_action=pass:enable='gte(t\,${place})*lte(t\,${place_end})'[v${n}]"
  echo "overlay ${IDS[$i]}: dur=${dur}s need=${need}s ratio=${ratio} place=${place}..${place_end} fade_in=${fade_in} fade_out=${fade_out}"
done
LAST=v$N
echo "filter_complex built (${#fc} chars)"
ffmpeg -loglevel error -stats -y "${in_args[@]}" -filter_complex "$fc" \
  -map "[$LAST]" -map "${AIDX}:a" \
  -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -c:a aac -b:a 192k \
  -t "$PICTURE_DUR" -movflags +faststart "$FINAL"
echo "OK -> $ROOT/$FINAL"
ffprobe -v error -show_entries format=duration,size -of default "$FINAL"

ffmpeg -loglevel error -y -ss 8 -i "$FINAL" -frames:v 1 "$STILL"
echo "still -> $ROOT/$STILL"

# QC concat padded (skip if missing under OVERLAY_ONLY)
: > "$WORK/lipsync-qc-list.txt"
qc_ok=1
for id in "${IDS[@]}"; do
  p=$OUTD/lipsync-$id-padded.mp4
  if [ ! -s "$p" ]; then qc_ok=0; break; fi
  echo "file '$ROOT/$p'" >> "$WORK/lipsync-qc-list.txt"
done
if [ "$qc_ok" = 1 ]; then
  ffmpeg -loglevel error -y -f concat -safe 0 -i "$WORK/lipsync-qc-list.txt" -c copy "$QC" \
    || ffmpeg -loglevel error -y -f concat -safe 0 -i "$WORK/lipsync-qc-list.txt" -c:v libx264 -crf 20 -an "$QC"
  echo "qc -> $ROOT/$QC"
else
  echo "skip qc (padded missing)"
fi
