# Rive layers (Unity TA narrator) — cut pack

Source: `../pose-idle.png` (1024×1024 RGBA). Character faces camera:
character **RIGHT** arm = screen **LEFT** (pointer); character **LEFT** = screen **RIGHT** (book).

## Files

| File | Role |
|------|------|
| `00-torso.png` | Body from neck down: coat, pants, boots (full canvas) |
| `01-head.png` | Head + hair (full canvas) |
| `02-arm-r.png` | Right arm + hand + pointer (full canvas) |
| `03-arm-l.png` | Left arm + book (full canvas) |
| `04-pointer.png` | Pointer stick only (optional; also still on arm-r) |
| `*-crop.png` | Tight crops of each layer |
| `manifest.json` | Bboxes, pivots, nonzero pixel counts |
| `_preview-*.png` | QA composites (not for rig) |

## Bone hierarchy (target)

```
root
└─ hip
   └─ torso
      ├─ neck
      │  └─ head
      ├─ shoulderL
      │  └─ armL   (+ book)
      └─ shoulderR
         └─ armR
            └─ hand
               └─ pointer
```

Suggested pivots (fraction of 1024 canvas) — see `manifest.json` for px:
- torso/hip ≈ (0.50, 0.62)
- head/neck ≈ (0.50, 0.41)
- arm-r shoulder ≈ (0.44, 0.43)
- arm-l shoulder ≈ (0.56, 0.43)

## State machine targets (later Rive)

`idle` · `talk` · `wave` · `point` · `nod` · `emphasize`

## Known seams / caveats (v1 cut)

- Soft feather overlaps at neck & shoulders are intentional.
- Head mask is generous (hanging hair); may still include some shoulder/coat fringe — refine before production rig.
- Book stays on `03-arm-l`; underside of sleeve/coat behind book is missing if arm moves far.
- Torso is very dark on checker previews; alpha is real (see manifest nonzero counts).
- **Status:** layer cut only. Blender 3渲2 pilot takes priority — **do not start Rive rigging from this pack yet.**
