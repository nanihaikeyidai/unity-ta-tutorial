# Unity TA 实战学堂 · 程序化解说样片（纯 2D）

程序化成片：**Canvas 2D 主舞台** + **IndexTTS 旁白** + **烧录中文字幕** + **左下角 InfiniteTalk 对口型讲解员**。无 Three.js / WebGL。模型只做静帧 / RH 手势条素材；**禁止**用 MiniMax H3 当整片成片。

## Agent 权威文档（其它 agent 先读这个）

→ **[`docs/AGENT-PLAYBOOK-explainer-lipsync.md`](./docs/AGENT-PLAYBOOK-explainer-lipsync.md)**  
制作过程、RunningHub 工作流链接、IndexTTS → 主舞台 → InfiniteTalk → 合成一键命令、已知坑与验收清单。

手势库支线（FL2V 回正 / char-alpha）：[`docs/narrator-rh-splice-pipeline.md`](./docs/narrator-rh-splice-pipeline.md)  
口型目录说明：[`infinitetalk/README.md`](./infinitetalk/README.md)

## v3 成片（当前推荐）

| 文件 | 说明 |
| --- | --- |
| **`unity-ta-explainer-v3-lipsync.mp4`** | **Master**：1280×720 @30fps，约 33.5s；定妆图 + IndexTTS + RH InfiniteTalk 真张嘴 |
| `unity-ta-explainer-v3-lipsync-still.png` | 约 t=8s 静帧 |
| `infinitetalk/out/lipsync-all-qc.mp4` | 4 段对口型原片 QC |
| `_render_v3/base-nonarr.mp4` | 无讲解员底片（主舞台+烧字幕） |
| `scripts/compose-lipsync-v3.sh` | 冻帧 / rembg / overlay 合成 |
| `explainer-v2.html` | 可交互预览（`seek(t)`） |
| `narration-indextts.wav` | IndexTTS 2.5 旁白 |
| `narration.srt` / `cues.json` | 字幕与场景/手势时间轴 |

```bash
bash scripts/compose-lipsync-v3.sh   # 需已有 infinitetalk/out/lipsync-seg0N.mp4
```

## v2 成片（手势条，嘴基本不动）

| 文件 | 说明 |
| --- | --- |
| `unity-ta-explainer-v2.mp4` | 1280×720 @30fps，约 33.5s；RH `char-alpha` / pose 回退 |
| `unity-ta-explainer-v2-still.png` | 约 t=8s 静帧 |
| `scripts/render-v2.mjs` | Playwright 按帧 seek → ffmpeg |

### v2 相对更旧版的改进

1. **主舞台分章**：Intro / URP / Perf / Shader / CTA。
2. **讲解员**：优先 RH `char-alpha` 手势条，失败回退 `pose-*.png`。
3. **字幕**：画布内大号中文烧录。
4. **定稿**：`seek(t)` 确定性帧渲染。

### 打开预览

用静态服务器打开 `promo/` 目录后访问 `explainer-v2.html`（可用 `?autoplay=1`）。

```bash
# 无讲解员重渲底片
NO_NARRATOR=1 node scripts/render-v2.mjs
# 重渲含讲解员 v2
node scripts/render-v2.mjs
```

## 旧文件

| 文件 | 说明 |
| --- | --- |
| `explainer-60s.html` | v1 单页样片 |
| `unity-ta-explainer-2d.mp4` | v1 master |
| `blender-pilot/from-ai3d/rh-splice/` | RH 五段手势库 + alpha |

## 时间轴（约 33.5s）

| 时段 | 场景 |
| --- | --- |
| 0–7.4s | Intro |
| 7.4–11.6s | URP 管线 |
| 11.6–15.7s | 性能 |
| 15.7–22.7s | Shader |
| 22.7–33.5s | CTA + 定格 |

## Playbook 介绍片（~60s，进行中）

口播讲解 **Agent Playbook 管线本身**（非学堂招生加长版）。

- 目录：[`playbook-60s/`](./playbook-60s/)
- 一页说明：[`playbook-60s/BRIEF.md`](./playbook-60s/BRIEF.md)
- 权威管线文档仍是：[`docs/AGENT-PLAYBOOK-explainer-lipsync.md`](./docs/AGENT-PLAYBOOK-explainer-lipsync.md)
