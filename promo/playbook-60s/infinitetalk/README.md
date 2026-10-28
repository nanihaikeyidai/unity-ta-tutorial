# InfiniteTalk 下一段（Playbook ~48s，已切除静音）

给下一个 agent / RH 操作者：IndexTTS 已出并**切除 13s 静音缺口**，音轨已切好，**本目录不再调用 RunningHub**（由上游安排）。

## 静音处理

原 `narration-indextts.wav` 在 **10.70–23.70s** 有约 **13.0s** 死静音（IndexTTS 瑕疵）。已用显式 cut-concat 切除：

- 备份：`../narration-indextts-raw-with-silence.wav`（60.772s）
- 当前：`../narration-indextts.wav`（**47.772s** = `0–10.70` + `23.70–end`）
- cues / srt / 本分段表均按清理后时间轴（缺口后时刻 −13.0）

## 输入

| 项 | 路径 |
| --- | --- |
| 定妆（不透明 RGB） | `in/character.png` ← 权威 **`promo/assets/ta-digital-human-front.png`**（银发数字人；非旧 chibi） |
| 分段表 | `SEGMENTS.json` |
| 音频 | `audio/seg01.wav` … `audio/seg07.wav` |
| 全长旁白 | `../narration-indextts.wav`（**47.772s**） |

## 工作流

- RunningHub：[AI女友对口型V2 / InfiniTetalk](https://www.runninghub.cn/ai-detail/1961314367356735490)
- 每段：`character.png` + 对应 `audio/segXX.wav` → 下载到 `out/lipsync-segXX.mp4`
- **单段封顶 ~7.72s**；本目录已切 ≤7.5s
- **无 `skip_rh` 静音段**——静音已在源 wav 切除，7 段全部进 InfiniteTalk

## 7 段一览

| id | start–end | dur | RH? | 说明 |
| --- | --- | --- | --- | --- |
| seg01 | 0.00–7.00 | 7.000 | ✅ | hook + arch 起 |
| seg02 | 7.00–14.50 | 7.500 | ✅ | arch 续 |
| seg03 | 14.50–22.00 | 7.500 | ✅ | arch / step_tts |
| seg04 | 22.00–29.50 | 7.500 | ✅ | step_tts / stage / lipsync |
| seg05 | 29.50–37.00 | 7.500 | ✅ | lipsync / pitfalls 起 |
| seg06 | 37.00–44.50 | 7.500 | ✅ | pitfalls / cta 起 |
| seg07 | 44.50–47.772 | 3.272 | ✅ | cta 尾 |

`SEGMENTS.json` 里全部 `skip_rh: false`。

## 合成

底片（无讲解员）：

```bash
cd promo/playbook-60s
NO_NARRATOR=1 OUT_MP4=$PWD/_render/base-nonarr.mp4 \
  OUT_STILL=$PWD/_render/base-nonarr-still.png node render.mjs
```

成片目标时长 ≈ **49.8s**（47.772s wav + ~2s CTA hold）。

口型叠片（时长拟合 + 段间交叉淡化）：

```bash
# 全量（含 rembg）；仅重叠合成用 OVERLAY_ONLY=1
CROP_H=720 NARR_H=320 KEY=rembg FADE=0.2 OVERLAY_ONLY=1 bash scripts/compose-lipsync.sh
# 需要：out/lipsync-seg01..07.mp4 全部就位
# 成片：unity-ta-playbook-60s.mp4
# 段间：setpts 按时长窗拟合 + FADE≈0.2s alpha 交叉淡化，减轻硬切闪动
```

## 坑

1. 定妆必须不透明权威图；错误 RGBA 会穿帮。  
2. 本机 alpha 用 **qtrle ARGB `.mov`**，别信 webm alpha。  
3. 静音已在源轨切除；不要再按旧 60.772s / seg03–04 skip 表切段。  
4. 权威管线：`../docs/AGENT-PLAYBOOK-explainer-lipsync.md`


## 成片状态（2026-10-28）

- 7 段 InfiniteTalk **已齐**：`out/lipsync-seg01.mp4` … `lipsync-seg07.mp4`（576×1024；多数 ~7.72s；seg07 ~3.24s）
- 合成：`CROP_H=720` 裁掉底部拖影 → rembg u2net → qtrle ARGB `.mov` → overlay 左下（`NARR_H=320`）；段间时长拟合 + `FADE=0.2` 交叉淡化
- 成片：`../unity-ta-playbook-60s.mp4`（**49.8s** / 1280×720）
- QC：`out/lipsync-all-qc.mp4`
- 定妆权威：`../../assets/ta-digital-human-front.png`
