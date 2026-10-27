# Shared assets (symlinks)

- `voice-ref.wav` → `../../assets/voice-ref.wav`（IndexTTS 音色参考）
- `ta-chibi-front-auth.png` → 权威不透明定妆（InfiniteTalk / FL2V 输入）
- `ta-chibi-front-auth-rgba.png` → 带 alpha；**勿直接喂 RH**
- `pose-*.png` → 预览精灵回退（口型成片前）

Later RH steps should copy/symlink these into an `infinitetalk/in/` under this folder, same as the v3 playbook.
