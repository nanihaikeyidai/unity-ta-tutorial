# InfiniteTalk 对口型（L3 路径）→ explainer v3

## 路径
定妆图 `in/character.png`（来自 `assets/ta-chibi-front-auth.png`）+ 分段旁白 → **RunningHub InfiniteTalk（AI女友对口型 V2）** → 真张嘴短片 → rembg 抠像 → 叠进程序主舞台。

## RunningHub
| 项 | 值 |
|---|---|
| App | [AI女友对口型V2 / InfiniTetalk](https://www.runninghub.cn/ai-detail/1961314367356735490) |
| 输入 | 图片 + 音频 + 秒数 |
| 实测费用 | **约 287 币 / 段** |
| 输出上限 | **单段视频固定约 7.72s**（音频更长时会被截断，需本地冻帧补齐；勿盲目重跑 RH） |
| 分辨率 | 576×1024 竖幅人像（角色约占上半，下半为深蓝空背景） |

相关入口：
- [图片单人对口型](https://www.runninghub.cn/post/1990376514787172354)
- [视频 V2V 对口型](https://www.runninghub.cn/post/1967963475878248449)

## 分段（`SEGMENTS.json`）
| id | timeline | 音频时长 | RH 片 | 本地处理 |
|---|---|---|---|---|
| seg01 | 0.0–7.4 | 7.4s | 7.72s | OK |
| seg02 | 7.4–15.7 | 8.3s | 7.72s | **短 ~0.58s → 末帧冻帧 pad 到 8.36s** |
| seg03 | 15.7–22.7 | 7.0s | 7.72s | OK（略长，overlay 到下一段） |
| seg04 | 22.7–30.1 | 7.29s | 7.72s | OK |

音频在 `audio/`；RH 结果在 `out/lipsync-seg01.mp4` … `lipsync-seg04.mp4`。

## 合成：`scripts/compose-lipsync-v3.sh`
```bash
cd /workspace/unity-ta-tutorial/promo && bash scripts/compose-lipsync-v3.sh
# FORCE=1 全量重做；KEY=colorkey 跳过 rembg；NARR_H=300 调讲解员高度
```

1. **冻帧补齐**：cue 窗 > RH 片时长时（seg02）`tpad=stop_mode=clone` → `out/lipsync-seg0N-padded.mp4`。
2. **抠像**：裁掉竖幅下半空背景（`crop=576:580`）→ rembg u2net（`/workspace/.venv-rembg`）→ **qtrle ARGB `.mov`**（本机 `libvpx-vp9` 会丢掉 alpha，不能用 webm）。
3. **底片**：`_render_v3/base-nonarr.mp4`（程序主舞台 + 烧字幕，无讲解员）。
4. **叠片**：按 `start` 时间左下 overlay（高 ~300px），混入 `narration-indextts.wav`；字幕沿用底片。

## 输出
| 文件 | 说明 |
|---|---|
| `../unity-ta-explainer-v3-lipsync.mp4` | **成片** 1280×720 / 33.5s / IndexTTS 旁白 + InfiniteTalk 口型讲解员 |
| `../unity-ta-explainer-v3-lipsync-still.png` | t≈8s 静帧 |
| `out/lipsync-all-qc.mp4` | 4 段（含 pad）原始对口型串联 QC |
| `out/lipsync-seg0N-alpha.mov` | 抠像后 ARGB 中间件 |
