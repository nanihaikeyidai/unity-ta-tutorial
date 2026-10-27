# Unity TA 程序化解说片 + InfiniteTalk 对口型 · Agent Playbook

> **受众**：其它 Cursor / Grok Bot agent（资产生成、视频提示词、directorMaster、通用）  
> **日期**：2026-10-27（Asia/Shanghai）  
> **项目根**：`/workspace/unity-ta-tutorial/promo/`  
> **关联**：[`narrator-rh-splice-pipeline.md`](./narrator-rh-splice-pipeline.md)（手势库支线）· [`infinitetalk/README.md`](../infinitetalk/README.md)（口型目录）· [`/workspace/jile-dasai/refs/programmatic-explainer-pipeline.md`](/workspace/jile-dasai/refs/programmatic-explainer-pipeline.md)（总流水线）

---

## 0. 一句话

成片 = **程序化 HTML/Canvas 主舞台** + **IndexTTS 旁白** + **烧字幕** + **左下 InfiniteTalk 对口型讲解员（RunningHub）**。

- **禁止** Three.js / WebGL 做主舞台（卡顿；本项目定稿是 Canvas 2D）。
- **禁止** 用 MiniMax H3 扩散视频当整片成片（H3 只用于手势库 FL2V 短条或静帧参考）。
- **不要** 把「桌面 AI 女友」整套 App（麦克风 / Whisper / LLM / 实时 Duix）接到解说片；只要 RH **InfiniteTalk 对口型层**。

```text
narration.txt + cues.json
        │
        ├─► IndexTTS 2.5 (RH) ──► narration-indextts.wav + SRT
        │
        ├─► explainer-v2.html seek(t) + Playwright ──► base-nonarr.mp4（主舞台+烧字幕，无讲解员）
        │
        └─► 切旁白 ≤10s + 定妆图
                    │
                    ▼
            RH InfiniteTalk（AI女友对口型V2）
                    │
                    ▼
            rembg → qtrle ARGB .mov → overlay 左下 → master.mp4
```

---

## 1. 当前推荐交付物

| 优先级 | 文件 | 说明 |
| --- | --- | --- |
| **Master（推荐）** | `/workspace/unity-ta-tutorial/promo/unity-ta-explainer-v3-lipsync.mp4` | 1280×720 @30fps，**33.5s**；IndexTTS + InfiniteTalk 真张嘴讲解员 |
| Still | `unity-ta-explainer-v3-lipsync-still.png` | 约 t=8s 静帧 |
| 口型 QC | `infinitetalk/out/lipsync-all-qc.mp4` | 4 段 RH 原片（含 pad）串联 |
| HTML 预览 | `explainer-v2.html` | `seek(t)` 交互；`?autoplay=1` / `?render=1&noNarrator=1` |
| 底片 | `_render_v3/base-nonarr.mp4` | 无讲解员主舞台（字幕已烧） |
| 旧 · v2 | `unity-ta-explainer-v2.mp4` | RH `char-alpha` 手势条 / pose 回退；**嘴基本不动** |
| 旧 · v1 | `unity-ta-explainer-2d.mp4` / `explainer-60s.html` | 早期样片 |

规格锁定：**1280×720**、约 **30fps**、时长跟 TTS（本片旁白 ~30.1s + CTA 定格 → **33.5s**）。

---

## 2. 目录地图

根目录：`/workspace/unity-ta-tutorial/promo/`

| 路径 | 用途 |
| --- | --- |
| `assets/ta-chibi-front-auth.png` | **权威定妆**（不透明 RGB；InfiniteTalk / FL2V 输入） |
| `assets/ta-chibi-front-auth-rgba.png` | 带 alpha 变体；**勿直接喂 FL2V**（会抠穿大衣） |
| `assets/voice-ref.wav` | IndexTTS 音色参考（= `jile-dasai/refs/voice/default-timbre-ref.wav`） |
| `assets/pose-*.png` / `silver-*.png` | 静姿回退（v2 无 alpha 条时用） |
| `narration.txt` | 旁白全文 |
| `narration.srt` / `narration.vtt` | 字幕 |
| `cues.json` | 句级起止 + `gesture` + `scene` |
| `narration-indextts.wav` | IndexTTS 成片音轨 |
| `explainer-v2.html` | 程序主舞台 |
| `scripts/render-v2.mjs` | Playwright 按帧 `seek(t)` → ffmpeg |
| `scripts/compose-lipsync-v3.sh` | InfiniteTalk 段 → 抠底 → 叠片 → master |
| `infinitetalk/SEGMENTS.json` | 4 段时间窗与音频路径 |
| `infinitetalk/in/character.png` | 喂给 RH 的定妆拷贝 |
| `infinitetalk/audio/seg0N-*.wav` | 切好的旁白段 |
| `infinitetalk/out/lipsync-seg0N.mp4` | RH 下载原片 |
| `infinitetalk/out/lipsync-seg0N-padded.mp4` | 冻帧补齐后 |
| `infinitetalk/out/lipsync-seg0N-alpha.mov` | rembg + **qtrle ARGB** |
| `_render_v3/` | v3 中间件（base、frames、qc list） |
| `_render_v2/stills/` | v2 分章静帧 QC |
| `blender-pilot/from-ai3d/rh-splice/` | **手势库支线**：五段 FL2V + `char-alpha.mov` |
| `docs/AGENT-PLAYBOOK-explainer-lipsync.md` | **本文（权威 agent 文档）** |
| `docs/narrator-rh-splice-pipeline.md` | 手势拼接叠片详解 |
| `node_modules/` + `package.json` | Playwright 等（需已 `npm i`） |

抠底 venv：`/workspace/.venv-rembg`（`rembg` + `u2net`）。

---

## 3. RunningHub 工作流速查表

账号：**「梅林」**（本机浏览器通常已登录；个人中心收藏可搜名字）。  
费用备忘：InfiniteTalk 实测约 **287 币/段**；**非会员输出封顶约 7.72s** @25fps、**576×1024** 竖幅。音频更长会被截断 → **本地冻帧补齐，勿盲目重跑 RH**。

| 用途 | 名称 | URL |
| --- | --- | --- |
| IndexTTS 2.5 旁白 | IndexTTS 工作流 | https://www.runninghub.cn/post/2087748051929755649 |
| 语音转写 / 时间戳 | Confucius4 转写 | https://www.runninghub.cn/post/2104649076645130241 |
| 定妆 / 静帧 | 全能生图王 | https://www.runninghub.cn/post/2112563481311535106 |
| 改图 / 修定妆 | qwenimage2.0 改图 | https://www.runninghub.cn/post/2101937853101076481 |
| 手势 FL2V（非成片） | MiniMax H3 导演台 | https://www.runninghub.cn/post/2084788947984666625 |
| **对口型主用（图+音频）** | **AI女友对口型V2 / InfiniTetalk** | https://www.runninghub.cn/ai-detail/1961314367356735490 |
| 图片单人对口型 | infinitetalk 图片单人 | https://www.runninghub.cn/post/1990376514787172354 |
| 视频 V2V 对口型 | KJ-Infinitetalk 视频 | https://www.runninghub.cn/post/1967963475878248449 |
| InfiniteTalk 官方单人 | 官方单人数字人 | https://www.runninghub.cn/post/2019977262745001985 |
| 首尾帧+口型 | wan2.2+InfiniteTalk 首尾帧 | https://www.runninghub.cn/post/2020007962508529666 |
| 短剧参考（非本片） | Work-Fisher 短剧 | https://www.runninghub.cn/post/2109735475824123905 |

B 站「桌面 AI 女友」参考短链（只学 InfiniteTalk 层）：https://b23.tv/ZpceMUu

---

## 4. 端到端制作过程（按顺序，可复制）

### Stage A — 规格与定妆

1. 成片规格：1280×720、~30fps、时长 = TTS 结束 + 短 CTA 定格。
2. 定妆：使用**不透明 RGB**  
   `/workspace/unity-ta-tutorial/promo/assets/ta-chibi-front-auth.png`  
   - 正面、嘴清晰、勿挡脸；同光同角色。  
   - **禁止**把错误 RGBA（大衣被抠成透明 → 叠片白鬼影）直接当 RH 输入。  
   - 拷到口型输入：  
     ```bash
     cp /workspace/unity-ta-tutorial/promo/assets/ta-chibi-front-auth.png \
        /workspace/unity-ta-tutorial/promo/infinitetalk/in/character.png
     ```
3. 音色参考：  
   `/workspace/unity-ta-tutorial/promo/assets/voice-ref.wav`  
   （与 `/workspace/jile-dasai/refs/voice/default-timbre-ref.wav` 同源）

### Stage B — 脚本 + cues

| 文件 | 作用 |
| --- | --- |
| `narration.txt` | 旁白全文（一句一意，避免超长句） |
| `cues.json` | `t`/`end`/`text`/`gesture`/`scene` |
| `narration.srt` | 与 cues 对齐的烧录字幕源 |

本片分章（约）：

| 时段 | scene | 内容 |
| --- | --- | --- |
| 0–7.4s | intro | 动能标题 |
| 7.4–11.6s | urp | URP 管线节点 |
| 11.6–15.7s | perf | Overdraw / Profiler |
| 15.7–22.7s | shader | Fresnel / Dissolve |
| 22.7–33.5s | cta | 学习路径 + 定格 |

`gesture` 取值：`wave` / `talk` / `point` / `emphasize` / `nod` / `idle`（手势库支线用；口型主线按段切音频即可）。

### Stage C — IndexTTS

1. 打开 https://www.runninghub.cn/post/2087748051929755649  
2. 上传 `voice-ref.wav` + 粘贴 `narration.txt`  
3. 下载结果为：  
   `/workspace/unity-ta-tutorial/promo/narration-indextts.wav`  
4. 用 Confucius4（可选）或本地对齐刷新 `narration.srt` / `cues.json` 起止时间。  
5. 确认：`ffprobe` 时长 ≈ 字幕末句 end（本片旁白约 30.1s）。

### Stage D — 程序主舞台（无讲解员底片）

```bash
cd /workspace/unity-ta-tutorial/promo
# 依赖（首次）
npm install playwright 2>/dev/null || true
npx playwright install chromium 2>/dev/null || true

# 出无讲解员底片（烧字幕，主舞台分章动效）
NO_NARRATOR=1 \
  OUT_MP4=/workspace/unity-ta-tutorial/promo/_render_v3/base-nonarr.mp4 \
  OUT_STILL=/workspace/unity-ta-tutorial/promo/_render_v3/base-nonarr-still.png \
  node scripts/render-v2.mjs
```

要点：

- `explainer-v2.html` 通过 `window.__explainer.seek(t)` **绝对时间轴**；Playwright 逐帧截图再 ffmpeg，**不要**只靠墙钟录屏。  
- `?noNarrator=1` / env `NO_NARRATOR=1`：底片不含左下角色（留给口型层）。  
- **无 Three.js**。分章：Intro / URP / Perf / Shader / CTA。

预览：

```bash
cd /workspace/unity-ta-tutorial/promo && python3 -m http.server 8765
# http://127.0.0.1:8765/explainer-v2.html?autoplay=1
```

### Stage E — InfiniteTalk 对口型（AI 女友方式）

分段定义见 `infinitetalk/SEGMENTS.json`（本片 4 段）：

| id | timeline | audio | gestures（备注） |
| --- | --- | --- | --- |
| seg01 | 0.0–7.4 | `audio/seg01-0-7.4.wav` | wave, talk |
| seg02 | 7.4–15.7 | `audio/seg02-7.4-15.7.wav` | point, emphasize（**音频 8.3s > 7.72 → 需 pad**） |
| seg03 | 15.7–22.7 | `audio/seg03-15.7-22.7.wav` | talk, nod |
| seg04 | 22.7–30.1 | `audio/seg04-22.7-30.1.wav` | point, wave |

切旁白（示例；已有文件可跳过）：

```bash
cd /workspace/unity-ta-tutorial/promo
python3 - <<'PY'
import json, subprocess
from pathlib import Path
root = Path('.')
wav = root / 'narration-indextts.wav'
segs = json.loads((root/'infinitetalk/SEGMENTS.json').read_text())
(root/'infinitetalk/audio').mkdir(parents=True, exist_ok=True)
for s in segs:
    out = root/'infinitetalk'/s['audio']
    subprocess.check_call([
        'ffmpeg','-y','-i',str(wav),
        '-ss',str(s['start']),'-to',str(s['end']),
        '-c:a','pcm_s16le',str(out)
    ])
    print('wrote', out)
PY
```

规则：

- 单段音频目标 **≤10s**；实际 RH 非会员常 **封顶 ~7.72s**。  
- 打开主用 App：https://www.runninghub.cn/ai-detail/1961314367356735490  
- 每段上传：`infinitetalk/in/character.png` + 对应 `audio/seg0N-*.wav` + 秒数。  
- 下载到：  
  `infinitetalk/out/lipsync-seg01.mp4` … `lipsync-seg04.mp4`  
- 若 `ffprobe` 时长 < cue 窗（如 seg02）：**不要重跑 RH**；合成脚本会用 `tpad=stop_mode=clone` 冻帧补齐。

备选入口：图片单人 `post/1990376514787172354`；已有手势片要改嘴用 V2V `post/1967963475878248449`（底视频时长 ≥ 音频一半）。

### Stage F — 合成 master

```bash
cd /workspace/unity-ta-tutorial/promo
bash scripts/compose-lipsync-v3.sh
# 全量重做：FORCE=1 bash scripts/compose-lipsync-v3.sh
# 调讲解员高度：NARR_H=300（默认）
# rembg 不可用时：KEY=colorkey（质量较差，仅应急）
```

脚本做的事：

1. 按 `SEGMENTS.json` **冻帧 pad** → `lipsync-seg0N-padded.mp4`  
2. `crop=576:580` 裁掉竖幅下半空背景 → **rembg `u2net`**（`/workspace/.venv-rembg`）→ **qtrle ARGB `.mov`**  
   - **坑**：本机 `libvpx-vp9` 会丢掉 alpha（只剩 yuv420p）；**禁止**用 webm 当透明中间件。  
   - **坑**：`u2net_human_seg` 会砍掉教鞭/大衣边缘 → 用 **`u2net`**。  
3. 确保 `_render_v3/base-nonarr.mp4` 存在（缺则自动 `NO_NARRATOR=1` 重渲）。  
4. 按时码左下 `overlay`（高约 `NARR_H=300`）+ mux `narration-indextts.wav` →  
   `unity-ta-explainer-v3-lipsync.mp4`（`-t 33.5`）  
5. 抽 still + 拼 `lipsync-all-qc.mp4`

### Stage G —（可选）手势库支线

口型主线已够用；若要挥手/指向「气口动作」或未来 **V2V InfiniteTalk**：

- 读 [`narrator-rh-splice-pipeline.md`](./narrator-rh-splice-pipeline.md)  
- 资产在 `blender-pilot/from-ai3d/rh-splice/`：  
  - idle：`idle-16x9.png`（不透明）  
  - 五段 FL2V 回正：`seg-A-wave` / `seg-B-point` / `seg-C-nod` / `seg-D-emphasize` / `seg-E-explain`  
  - 透明条：`char-alpha.mov`（优先）/ `char-alpha.webm`  
- H3 提示词：同目录 `prompt-*.txt`；工作流用导演台 `post/2084788947984666625`  
- v2 曾按 cues 叠 `char-alpha`；v3 master **改用 InfiniteTalk**，手势库可作气口或 V2V 底视频。

---

## 5. 技术要点与已知坑

| 主题 | 做法 / 坑 |
| --- | --- |
| 时间轴 | 一切对齐 **绝对 `seek(t)`** + `cues.json`；禁止墙钟漂移录屏当定稿 |
| 字幕 | 烧在 Canvas 主舞台（底片已带）；叠讲解员时避开左下 |
| Alpha | 错误 RGBA idle → 大衣透空白鬼影；定妆用 **不透明 RGB** |
| rembg | 用 **`u2net`**；`u2net_human_seg` 切鞭/衣 |
| 透明编码 | **qtrle ARGB `.mov`**；本 box 上 **webm/vp9 丢 alpha** |
| RH 时长 | 非会员 ~**7.72s** 封顶；超长本地 `tpad` 冻帧，勿重跑烧币 |
| 竖幅构图 | RH 出 576×1024，角色偏上 → `crop=576:580` 再叠 |
| 规格 | 1280×720 ~30fps；时长跟 TTS + CTA |
| 禁止项 | 整片 H3；主舞台 Three.js；桌面女友整套实时链路 |

---

## 6. 给其它 agent 的分工

| Agent / 角色 | 做什么 | 不做什么 |
| --- | --- | --- |
| **资产生成** | 定妆、RH IndexTTS / InfiniteTalk、rembg、compose、维护本 playbook | 不要改成「整片生成视频」 |
| **视频提示词** | **仅当用户明确要** H3 镜头或手势 FL2VA 提示词时写 `prompt-*.txt` | **主线解说片不默认整片 H3** |
| **directorMaster / 通用** | 按本文 Stage A→F 出 v3 master；验收清单打勾 | 不要接 Whisper/LLM 实时女友 App |
| **手势支线维护者** | 扩 FL2V 回正库、V2V 口型实验 | 不要覆盖 `unity-ta-explainer-v3-lipsync.mp4` 为手势-only 版除非用户要求 |

技能入口（若已安装）：`programmatic-explainer-video`（总原则）；口型细节以**本文**为准。

---

## 7. 验收清单

- [ ] Master 存在：`/workspace/unity-ta-tutorial/promo/unity-ta-explainer-v3-lipsync.mp4`
- [ ] `ffprobe`：约 **33.5s**、**1280×720**、音轨为 IndexTTS
- [ ] 说话区间嘴有开合；气口/定格不持续乱张
- [ ] 左下讲解员背景透明干净（无灰底方板、无白边鬼影、大衣不透）
- [ ] 字幕可读、不与讲解员严重重叠
- [ ] 主舞台分章动效正常（Intro→URP→Perf→Shader→CTA），**无 Three.js 卡顿**
- [ ] 声画同步（句级 cues 与嘴动大致同窗）
- [ ] QC：`infinitetalk/out/lipsync-all-qc.mp4` 四段可看

抽帧自检：

```bash
ffmpeg -y -ss 2 -i /workspace/unity-ta-tutorial/promo/unity-ta-explainer-v3-lipsync.mp4 -frames:v 1 /tmp/qc-t2.png
ffmpeg -y -ss 8 -i /workspace/unity-ta-tutorial/promo/unity-ta-explainer-v3-lipsync.mp4 -frames:v 1 /tmp/qc-t8.png
ffmpeg -y -ss 20 -i /workspace/unity-ta-tutorial/promo/unity-ta-explainer-v3-lipsync.mp4 -frames:v 1 /tmp/qc-t20.png
```

---

## 8. 一键命令摘要

```bash
# === 环境 ===
cd /workspace/unity-ta-tutorial/promo
# rembg venv 应已存在：/workspace/.venv-rembg

# === 定妆进口型输入 ===
cp assets/ta-chibi-front-auth.png infinitetalk/in/character.png

# ===（若旁白/字幕已改）重新切段 ===
# 编辑 narration.txt / cues.json / narration.srt 后：
# 1) RH IndexTTS → narration-indextts.wav
# 2) 按 SEGMENTS.json ffmpeg 切 infinitetalk/audio/seg0N-*.wav
# 3) 每段上传 character.png + wav 到：
#    https://www.runninghub.cn/ai-detail/1961314367356735490
# 4) 下载为 infinitetalk/out/lipsync-seg0N.mp4

# === 无讲解员底片 ===
NO_NARRATOR=1 \
  OUT_MP4="$PWD/_render_v3/base-nonarr.mp4" \
  OUT_STILL="$PWD/_render_v3/base-nonarr-still.png" \
  node scripts/render-v2.mjs

# === 合成 v3 master ===
bash scripts/compose-lipsync-v3.sh
# FORCE=1 bash scripts/compose-lipsync-v3.sh

# === 验收 ===
ffprobe -v error -show_entries format=duration,size \
  -show_entries stream=codec_name,width,height,r_frame_rate \
  -of default=noprint_wrappers=1 unity-ta-explainer-v3-lipsync.mp4
ls -la unity-ta-explainer-v3-lipsync.mp4 unity-ta-explainer-v3-lipsync-still.png \
       infinitetalk/out/lipsync-all-qc.mp4
```

---

## 9. 修订记录

| 日期 | 内容 |
| --- | --- |
| 2026-10-27 | 首版 Agent Playbook：程序主舞台 v2 + InfiniteTalk 对口型 v3 端到端；RH 链接全表；坑与一键命令 |
