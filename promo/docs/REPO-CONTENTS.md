# 本仓库收录范围

## 已收录
- 教程站静态页（html/css/js）
- Agent playbook、RH 管线文档
- 成片 master：v2 / v3-lipsync（mp4 + still）
- IndexTTS 旁白 wav、cues/srt/vtt、定妆与关键 pose
- InfiniteTalk 输入/分段音频 + 4 段 lipsync mp4 + QC
- playbook-60s 文稿与脚本（进行中）
- blender-pilot/rh-splice：`SEGMENTS.md`、`prompt-*.txt`、idle 静帧

## 未收录（体积 / 可本地再生）
- `*.mov`、`char-alpha.*`、`seg-*.mp4`、`spliced-5.mp4`（手势库完整条，见本地 rh-splice）
- `infinitetalk/out/*-alpha.mov`、`*-padded.mp4`（合成中间件）
- `_render*/`、`node_modules/`、旧版 2d/60s webm
- `blender/` 源文件、Trellis / preview 大图

复现口型成片：按 `AGENT-PLAYBOOK-explainer-lipsync.md` 用 RH 重跑即可。
