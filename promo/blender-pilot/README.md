# Blender 3渲2 pilot — Unity TA Q-chibi narrator

Pilot for **Blender → EEVEE cel → PNG sequence → webm/mp4**. Soft organic Q-chibi (日漫), **not** cube/cylinder proxy. Not production mesh.

## Outputs

| Path | What |
|------|------|
| `ta-narrator-q-v2.blend` | Soft-Q mesh + armature + cel mats + 48f wave |
| `renders-v2/frame_####.png` | 48 × 512×768 RGBA @ 24fps |
| `out/wave-pilot-v2.webm` | VP9 + alpha, 2s loop |
| `out/wave-pilot-v2.mp4` | H.264 on dark `#15151c` bg |
| `out/preview-sheet-v2.png` | 8-frame contact sheet |
| `scripts/build_ta_narrator_q_v2.py` | Full rebuild script |
| `ta-narrator-q.blend` / `renders/` / `out/wave-pilot.*` | **v1** geometric proxy (legacy) |

## Re-render v2

```bash
# From scratch (rebuild mesh + anim + render ~4–6 min)
blender -b -P scripts/build_ta_narrator_q_v2.py

# Remux
ffmpeg -y -framerate 24 -i renders-v2/frame_%04d.png \
  -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 1400k -auto-alt-ref 0 \
  out/wave-pilot-v2.webm

ffmpeg -y -f lavfi -i "color=c=0x15151c:s=512x768:r=24:d=2" \
  -framerate 24 -i renders-v2/frame_%04d.png \
  -filter_complex "[0:v][1:v]overlay=0:0:format=auto,format=yuv420p" \
  -c:v libx264 -crf 17 -movflags +faststart -t 2 out/wave-pilot-v2.mp4
```

## Look (v2)

- Soft UV-spheres only (head / hair clumps / body / limbs) — **no cubes**
- **EEVEE** Diffuse → Shader-to-RGB → constant ColorRamp → Emission
- **Inverted-hull** outline on head (Solidify + backface-cull black). Body/arms skip hull to avoid per-blob “island” outlines that read as detached limbs
- Head: silver anime hair clumps, blue eyes, blush, lips
- Body: dark techwear coat silhouette, collar cross, boots; left hand book + right hand pointer

## Animation / rig

- 2.0s / 48 frames / 24fps
- Root idle bob + head micro-nod
- **Right arm wave** via rigid BONE-parented soft segments (upper / forearm / hand)
- Body object-parented only — **no armature deform** on torso (avoids weight-tear / sludge under wave)
- Props: rigid BONE parent + `matrix_world` bind (no stretch)

## Honesty — quality limits

- Reads as **日漫 Q-chibi** silver-hair techwear TA at a glance (big head, blue eyes, coat, pointer/book). **Not** a likeness of `pose-idle.png` / Trellis sheet — still sphere-built soft proxy.
- Shoulder–arm crease still visible (soft spheres overlap, not welded topology). Extreme wave can show a gap; kept wave gentle on purpose.
- No real coat straps / hair cards / face blendshapes / finger topology.
- Not wired into `explainer-60s.html` — stays under `blender-pilot/`.
- Stale `out/wave-pilot-v2.*` from earlier exploding-parts passes were overwritten by this rebuild.

## Next if greenlit

1. Import Trellis / better Q mesh under `from-trellis/` as **v3** (lock face to sheet)
2. Manual weight paint or NLA gesture library (idle / talk / wave / point / nod)
3. Export webm per gesture for 2D explainer corner
