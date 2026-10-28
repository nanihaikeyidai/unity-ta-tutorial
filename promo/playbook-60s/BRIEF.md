# Playbook 60s · Agent 介绍片（程序化）

> **目的**：用约 1 分钟成片，向其它 agent 讲清 *如何照* `AGENT-PLAYBOOK-explainer-lipsync.md` *复刻带口型的程序化解说片*。  
> **不是** Unity TA 学堂招生片加长版；口播内容 = Playbook 管线本身。  
> **日期**：2026-10-28（Asia/Shanghai）  
> **目录**：`promo/playbook-60s/`

## 规格

| 项 | 值 |
| --- | --- |
| 画幅 | 1280×720 @ ~30fps |
| 目标时长 | TTS 实际时长 + ~2s CTA 定格（**49.8s** = 47.772s wav + ~2s CTA hold；cues 已按能量对齐） |
| 主舞台 | Canvas 2D（`explainer.html` + `seek(t)`），**禁止 Three.js** |
| 配音 | IndexTTS 2.5（RH）+ `assets/voice-ref.wav` |
| 字幕 | 烧录中文（HTML 内）+ `narration.srt` |
| 讲解员 | **银发数字人** InfiniteTalk 对口型叠左下（定妆 `../assets/ta-digital-human-front.png` → `infinitetalk/in/character.png`）；预览可用 pose / `?noNarrator=1` |

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
| `narration-indextts.wav` | IndexTTS 已就绪（**47.772s**（已切除原 10.70–23.70 静音；备份 `narration-indextts-raw-with-silence.wav`），pcm_s16le mono 22050Hz）|

## 场景章（`scene`）

`hook` → `arch` → `step_tts` → `step_stage` → `step_lipsync` → `pitfalls` → `cta`

## 下一步（其它 agent）

1. RH IndexTTS：`narration.txt` + `assets/voice-ref.wav` → `narration-indextts.wav`  
   工作流：https://www.runninghub.cn/post/2087748051929755649  
2. 按 wav 实际时长重标 `cues.json` / `narration.srt`，改 HTML 内 `DURATION`。  
3. `NO_NARRATOR=1 node render.mjs` 出底片。  
4. 切旁白 ≤7.7s → InfiniteTalk（图+音频）→ rembg → qtrle ARGB → overlay。  
5. 权威文档：`promo/docs/AGENT-PLAYBOOK-explainer-lipsync.md`


## 成片交付（已合成）

| 文件 | 说明 |
| --- | --- |
| `unity-ta-playbook-60s.mp4` | **49.8s** · 1280×720 · IndexTTS + 烧字幕 + 左下银发数字人口型 |
| `unity-ta-playbook-60s-still.png` | t≈8s 静帧 |
| `infinitetalk/out/lipsync-seg01..07.mp4` | RH InfiniteTalk 原片（新数字人） |
| `infinitetalk/out/lipsync-*-alpha.mov` | crop 上半身 `CROP_H=720` + rembg u2net → qtrle ARGB |
| `infinitetalk/out/lipsync-all-qc.mp4` | 7 段 padded 串联 QC |

合成命令：

```bash
cd promo/playbook-60s
# 全量（含 rembg）；仅重叠合成用 OVERLAY_ONLY=1
CROP_H=720 NARR_H=320 KEY=rembg FADE=0.2 OVERLAY_ONLY=1 bash scripts/compose-lipsync.sh
```

数字人定妆权威路径：`promo/assets/ta-digital-human-front.png`（同步到 `playbook-60s/infinitetalk/in/character.png`）。

段间衔接：口型片 **时长拟合**（`setpts=PTS*(need/dur)`）+ 边界 **交叉淡化**（`FADE≈0.2s` alpha fade，下一段提前叠入），减轻硬切闪动。仅重合成可用 `OVERLAY_ONLY=1`。

## 硬禁止

- 勿当「桌面 AI 女友」整包接进来。  
- 勿用 MiniMax H3 做整片成片。  
- 勿用不透明权威定妆以外的错误 RGBA 喂 RH。  
- 勿覆盖 `promo/` 根下 v2/v3 成片与脚本。

## 已知音频瑕疵

原 IndexTTS 成片在 **10.70–23.70s** 有约 **13s 静音缺口**。已用显式 cut-concat（`0–10.70` + `23.70–end`）切除，备份为 `narration-indextts-raw-with-silence.wav`。当前 `narration-indextts.wav` ≈ **47.772s**；cues/srt/IT 分段均按清理后时间轴（缺口后时刻 −13.0）。
