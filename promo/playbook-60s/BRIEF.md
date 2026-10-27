# Playbook 60s · Agent 介绍片（程序化）

> **目的**：用约 1 分钟成片，向其它 agent 讲清 *如何照* `AGENT-PLAYBOOK-explainer-lipsync.md` *复刻带口型的程序化解说片*。  
> **不是** Unity TA 学堂招生片加长版；口播内容 = Playbook 管线本身。  
> **日期**：2026-10-28（Asia/Shanghai）  
> **目录**：`/workspace/unity-ta-tutorial/promo/playbook-60s/`

## 规格

| 项 | 值 |
| --- | --- |
| 画幅 | 1280×720 @ ~30fps |
| 目标时长 | TTS 实际时长 + ~2s CTA 定格（**62.8s** = 60.772s wav + ~2s CTA hold；cues 已按能量对齐） |
| 主舞台 | Canvas 2D（`explainer.html` + `seek(t)`），**禁止 Three.js** |
| 配音 | IndexTTS 2.5（RH）+ `assets/voice-ref.wav` |
| 字幕 | 烧录中文（HTML 内）+ `narration.srt` |
| 讲解员 | 后期 InfiniteTalk 对口型叠左下；预览可用 pose 精灵 / `?noNarrator=1` |

## 本目录文件

| 文件 | 用途 |
| --- | --- |
| `narration.txt` | 旁白全文（简体） |
| `narration.srt` | 字幕（与临时 cues 对齐；TTS 后重切） |
| `cues.json` | 句级 t/end/text/gesture/scene |
| `explainer.html` | 程序主舞台预览 / Playwright 录制页 |
| `render.mjs` | Playwright 按帧 seek → ffmpeg mp4 |
| `BRIEF.md` | 本文 |
| `assets/` | 链到 `../assets/` 的定妆、音色、pose |
| `narration-indextts.wav` | IndexTTS 已就绪（**60.772s**，pcm_s16le mono 22050Hz）|

## 场景章（`scene`）

`hook` → `arch` → `step_tts` → `step_stage` → `step_lipsync` → `pitfalls` → `cta`

## 下一步（其它 agent）

1. RH IndexTTS：`narration.txt` + `assets/voice-ref.wav` → `narration-indextts.wav`  
   工作流：https://www.runninghub.cn/post/2087748051929755649  
2. 按 wav 实际时长重标 `cues.json` / `narration.srt`，改 HTML 内 `DURATION`。  
3. `NO_NARRATOR=1 node render.mjs` 出底片。  
4. 切旁白 ≤7.7s → InfiniteTalk（图+音频）→ rembg → qtrle ARGB → overlay。  
5. 权威文档：`/workspace/unity-ta-tutorial/promo/docs/AGENT-PLAYBOOK-explainer-lipsync.md`

## 硬禁止

- 勿当「桌面 AI 女友」整包接进来。  
- 勿用 MiniMax H3 做整片成片。  
- 勿用不透明权威定妆以外的错误 RGBA 喂 RH。  
- 勿覆盖 `promo/` 根下 v2/v3 成片与脚本。

## 已知音频瑕疵

IndexTTS 成片在 **~10.57–23.72s** 有约 **13s 静音缺口**（前后仍是连续旁白）。`cues.json` 在缺口内保持 `arch` 场景与上一句字幕。切 InfiniteTalk 时，纯静音段可跳过 RH，合成阶段冻帧/idle。
