# Unity TA 讲解员 · RH 视频拼接叠片开发文档

> 项目：`/workspace/unity-ta-tutorial` 程序化解说片左下角讲解员  
> 更新日期：2026-10-27（Asia/Shanghai；口型主线见 AGENT-PLAYBOOK）  
> 样片：`promo/blender-pilot/from-ai3d/rh-splice/explainer-with-narrator-alpha.mp4`  
> 关联主流程：[`/workspace/jile-dasai/refs/programmatic-explainer-pipeline.md`](/workspace/jile-dasai/refs/programmatic-explainer-pipeline.md)（主舞台仍程序化；本文件专讲「RH 出动作条 + 抠底叠片」支线）
> **口型主线（InfiniteTalk / AI女友对口型）已落地文档**：见 [`AGENT-PLAYBOOK-explainer-lipsync.md`](./AGENT-PLAYBOOK-explainer-lipsync.md)；当前推荐成片 `promo/unity-ta-explainer-v3-lipsync.mp4`。本文件仍保留手势库与历史 L1–L3 方案。

---

## 1. 目标与范围

**要解决的问题**

- Blender 绑骨 / 3D 灰模贴图路线人物观感差、动作僵。
- 需要可复用的讲解手势库，能按旁白 cues 拼接，并叠到解说成片左下角。
- 人物背景必须透明，才能叠在任意主舞台视频上。

**本支线交付**

| 交付物 | 路径 | 说明 |
| --- | --- | --- |
| Idle 定帧（不透明） | `rh-splice/idle-16x9.png` | FL2V 首尾共用 |
| 五段动作 mp4 | `rh-splice/seg-{A..E}-*.mp4` | 各约 6.58s，864×480 |
| 拼接动作带 | `rh-splice/spliced-5.mp4` | A→E 硬切，约 33s |
| 透明角色 | `rh-splice/char-alpha.webm` / `.mov` | 带 alpha，可二次叠片 |
| 最终效果样片 | `rh-splice/explainer-with-narrator-alpha.mp4` | 叠到 `unity-ta-explainer-2d.mp4` |
| 分段提示词 | `rh-splice/prompt-*.txt` | MiniMax H3 FL2VA |
| 分段规格 | `rh-splice/SEGMENTS.md` | 动作表 |

**明确不负责**

- 主舞台图解 / 字幕烧录的程序化实现（见主流程文档）。
- 最终成片剪辑调色。
- 用人脸实拍驱动（非目标）。

---

## 2. 总体架构

```text
权威定妆 PNG（不透明）
        │
        ▼
  idle-16x9 定帧  ─────────────────────────────┐
        │                                       │
        ▼                                       │
 RunningHub MiniMax H3  FL2V（首尾同 idle）      │
  每段：起 idle → 动作 → 回 idle                │
        │                                       │
        ▼                                       │
  seg-A..E.mp4  ──ffmpeg concat──► spliced-5   │
        │                                       │
        ▼                                       │
  rembg 逐帧抠底 ──► char-alpha.webm/.mov       │
        │                                       │
        ▼                                       │
  overlay 左下角 + 主舞台 mp4 + TTS 音轨         │
        │                                       │
        ▼                                       │
  explainer-with-narrator-alpha.mp4（预览成片）
```

**与主流程的关系**

- 主舞台：HTML/Canvas 程序化（禁止 Three.js 卡顿时）。
- 旁白：IndexTTS 2.5 + cues/SRT。
- 讲解员：**本支线**用 RH 短片库 + 抠底叠片；长期仍可回退 Rive/Spine 骨骼（见 §6）。

---

## 3. 环境与账号

| 项 | 值 |
| --- | --- |
| RunningHub | 账号「梅林」，浏览器已登录 |
| H3 工作流 | [导演台全能](https://www.runninghub.cn/post/2084788947984666625) |
| 实测图 | `https://www.runninghub.cn/workflow/2114305794417192962`（FL2V） |
| 本地 Blender | 4.3（仅早期试点；现动作不依赖） |
| 抠底 | Python venv `/workspace/.venv-rembg`，`rembg` + `u2net` |
| 合成 | `ffmpeg` |

---

## 4. 阶段说明（可执行）

### Stage 0 — 定妆与 Idle 定帧

1. 权威正面：`promo/assets/ta-chibi-front-auth.png`（**用 RGB 不透明版**）。
2. **禁止**用错误 RGBA 抠图当首尾帧：曾把黑大衣 alpha 抠穿，导致 FL2V 首尾「白幽灵」。
3. 生成 16:9 定帧：

```bash
# 逻辑：整图不透明粘贴到 #E4E4E4 画布（保留原图黑底板亦可）
# 产出：rh-splice/idle-16x9.png （1536×864）
```

角色设定锚点：银白凌乱长发、浅灰蓝眼、黑高领 + 黑 techwear 大衣、战术裤厚底靴、银十字架；右手教鞭、左手抱书；日漫 Q 版。

### Stage 1 — 设计可衔接动作段

原则：

- 每段 **FL2V**：`<Picture 1>` = `<Picture 2>` = 同一 `idle-16x9.png`。
- 时长约 **6s**（实测网格约 158 帧 @24fps ≈ 6.58s）。
- 中间做动作，**最后约 1.5–2s 必须收回 idle**，才能硬切拼接。
- 单镜 Static，不切镜、不换装、不换道具左右手。

当前五段：

| ID | 文件 | 动作 |
| --- | --- | --- |
| A | `seg-A-wave-v2.mp4` | 教鞭手侧挥两下回正 |
| B | `seg-B-point.mp4` | 教鞭指向右前收回（幅度偏小，待加强） |
| C | `seg-C-nod.mp4` | 点头两下回正 |
| D | `seg-D-emphasize.mp4` | 教鞭下点强调回正 |
| E | `seg-E-explain.mp4` | 抱书手外开讲解回正 |

提示词模板：`prompt-*.txt`（H3 `integrated_multimodal_description` / `overall_soundscape` / `non_diegetic_music`；`non_diegetic_music: N/A`）。

### Stage 2 — RunningHub 出片

1. 打开 H3 导演台，任务类型切 **FL2V / 首尾帧**。
2. UNET 用 `minimax_h3_fl2va_*`（勿停在仅 r2v）。
3. 首帧、尾帧都上传 **同一** `idle-16x9.png`。
4. 粘贴对应 `prompt-*.txt` 全文，时长 ~6s，出片。
5. 下载到 `rh-splice/seg-*.mp4`，记录 task id。

验收：

- 首尾帧大衣实色（非白幽灵）。
- 中段有可读动作。
- 尾段接近 idle（指针/手臂回落），硬切不跳变。

### Stage 3 — 拼接动作带

```bash
cd promo/blender-pilot/from-ai3d/rh-splice
printf "%s\n" \
  "file 'seg-A-wave-v2.mp4'" \
  "file 'seg-B-point.mp4'" \
  "file 'seg-C-nod.mp4'" \
  "file 'seg-D-emphasize.mp4'" \
  "file 'seg-E-explain.mp4'" > concat-list.txt
ffmpeg -y -f concat -safe 0 -i concat-list.txt -c copy spliced-5.mp4
```

生产环境应按 **cues.json 的 gesture 字段** 选段拼接（不必固定 A→E），空档播短 idle 循环。

### Stage 4 — 抠底（透明通道）

```text
spliced-5.mp4
  → 抽帧 alpha-frames/src/%04d.png
  → rembg(u2net) → alpha-frames/out/%04d.png
  → 内容裁切 → char-alpha.webm (VP9+alpha) / char-alpha.mov (qtrle)
```

注意：

- 用 **`u2net`**；`u2net_human_seg` 易裁掉教鞭。
- 不要对黑大衣做 colorkey（与海军蓝底板接近，易抠穿衣服）。
- 灰侧栏 `#E4E4E4` + 深蓝底板由 rembg 去掉。

### Stage 5 — 叠到解说片

```text
base:  unity-ta-explainer-2d.mp4 (1280×720 + 原声)
char:  char-alpha.* 缩至约 340px 高，左下边距约 12×10px
若底片已有旧 2D 小人：柔边遮罩盖住，避免双影
→ explainer-with-narrator-alpha.mp4
```

---

## 5. 目录速查

```text
promo/
  assets/ta-chibi-front-auth.png          # 权威定妆（不透明）
  unity-ta-explainer-2d.mp4               # 程序化解说底片
  cues.json                               # 旁白/手势时间轴
  docs/narrator-rh-splice-pipeline.md     # 本文件
  blender-pilot/from-ai3d/rh-splice/
    idle-16x9.png
    prompt-A-wave.txt … prompt-E-explain.txt
    seg-*.mp4 / spliced-5.mp4
    char-alpha.webm / char-alpha.mov
    explainer-with-narrator-alpha.mp4
    alpha-frames/ … preview/
```

---

## 6. 已知问题与优化点

### 6.1 当前短板

| 问题 | 现象 | 优先级 |
| --- | --- | --- |
| 动作库偏少 | 仅 5 段；B 指向幅度弱 | P0 |
| **无口型** | 旁白在播，嘴基本不动 | **P0** |
| 手势未对齐语音 | 现为整段拼接预览，未按 cues 切段 | P0 |
| FL2V 背景漂移 | 灰底偶变深蓝方板 | P1 |
| 分辨率 | RH 输出 864×480，叠 720p 尚可 | P2 |
| rembg 耗时 | 全长 ~790 帧逐帧 | P2 |

### 6.2 动作丰富度（下一批资产）

建议扩到 **12+ 段**，全部「起 idle / 回 idle」：

| 建议 ID | 手势 | 对应 cues.gesture |
| --- | --- | --- |
| wave | 挥手招呼 | `wave` |
| point_r / point_l | 左/右指 | `point` |
| nod / shake | 点头 / 轻摇头 | `nod` |
| emphasize | 教鞭下点 | `emphasize` |
| explain | 摊书说明 | `talk` |
| think | 托腮/微侧头 | `think` |
| count_1..3 | 竖指计数 | 步骤场 |
| celebrate | 小幅度庆祝 | CTA |
| idle_breathe | 2s 呼吸 idle | 气口填充 |

出片规则不变：FL2V + 同 idle 首尾 + 强化「末 2s 回正」提示词。B 类指向段加大臂伸展与停顿。

### 6.3 口型与语音同步（重点优化）

#### 参考：B 站「桌面 AI 女友」+ RunningHub InfiniteTalk（2026-10-26 学习笔记）

来源短链：[b23.tv/ZpceMUu](https://b23.tv/ZpceMUu)（桌面 AI 女友 · 实时语音 + 数字人口型）。拆开后是两套东西，不要混用：

| 层 | 做什么 | 是否适合 Unity TA 解说片 |
| --- | --- | --- |
| 桌面 App（AI Girlfriend V2 / DSH） | 麦克风→VAD→Whisper→LLM→TTS；可选本机 Duix/HeyGem 实时口型 | ❌ 实时对话用；解说片是离线成片，不必上整套 |
| **RunningHub InfiniteTalk** | **图/视频 + 音频 → 对口型数字人短片** | ✅ **直接可借鉴** |

**RH 可跟练的工作流 / 应用**

| 名称 | 链接 | 输入 | 用途 |
| --- | --- | --- | --- |
| AI女友对口型V2 = InfiniTetalk（艾橘溪） | https://www.runninghub.cn/ai-detail/1961314367356735490 | 图片 + 音频 + 秒数 | 图生说话/唱歌；约 9s≈10min |
| infinitetalk 图片单人对口型 | https://www.runninghub.cn/post/1990376514787172354 | 图 + 音频 | 自动匹配音频时长；可拿尾帧续生成 |
| KJ-Infinitetalk 视频对口型 | https://www.runninghub.cn/post/1967963475878248449 | 视频 + 音频 | V2V；视频时长 ≥ 音频一半 |
| InfiniteTalk 官方单人 | https://www.runninghub.cn/post/2019977262745001985 | 图/设定见页 | 官方单人数字人 |
| wan2.2+InfiniteTalk 首尾帧 | https://www.runninghub.cn/post/2020007962508529666 | 首尾帧 + 音频 | 与我们 FL2V 手势段可组合 |

技术栈印象：WanVideo I2V + InfiniteTalk Single +（可选）LightX2V 蒸馏；本机同系模型见各页 HuggingFace / 夸克盘说明。

**接到本项目的推荐接法**

```text
IndexTTS 旁白 wav（已有）
        +
idle-16x9 / 权威定妆正面（嘴部清晰、勿挡脸）
        │
        ▼
 RH InfiniteTalk（图+音频）──► talk-lipsync-N.mp4（真张嘴）
        │
        ├─ 短句分段（≤8–10s，对齐数字人女友「短答/分段」经验）
        │
        ▼
 rembg 抠底 ──► 与手势库按 cues 切换：
   气口/手势段 = 现有 FL2V 回正库（wave/point/…）
   口播句     = InfiniteTalk 对口型段
```

进阶：对手势成品做 **V2V InfiniteTalk**（保留挥手/指向，只改嘴），要求底视频时长 ≥ 音频一半。

素材规范（从女友教程迁移）：正面、嘴清晰、同角色同光；待机与说话构图一致；音频干净、与口播稿一致。

---


目标：**旁白在播时人物张嘴说话；静音/气口回闭口 idle。**

推荐分三档，由易到难：

#### 方案 L1 — 能量包络驱动「张/合」两态（最快落地）

1. IndexTTS 出 `narration.wav`。
2. 算短时 RMS / 响度包络 → 二值或三档：`closed` / `half` / `open`（或 20–30fps 曲线）。
3. 资产：同 idle 下额外出 **闭口 idle**、**半张**、**张嘴** 三张静帧（或三段极短 FL2V 循环），或对现有 `char-alpha` 只替换嘴部 ROI。
4. 合成时：底层用手势段（躯干/手臂），上层按包络切嘴型层；或整段在「talk 手势」上叠嘴型序列。
5. 对齐：`cues.json` 的句级起止 + 包络；气口强制 `closed`。

适合当前 RH 拼接管线，不改骨骼。

#### 方案 L2 — 独立「说话循环」段 + cues 选段

1. 新增 RH 段：`talk_loop`（轻微点头 + 手臂微动 + 嘴开合暗示），仍回 idle。
2. `cues.json`：`gesture: talk` 的区间播 talk 段（可循环裁切），句末切回 idle。
3. 仍用 L1 包络加强真张嘴。

#### 方案 L3 — 切层 / Rive 口型（长期主路径）

1. 定妆切头层：脸、上唇、下唇、牙（或 2–3 张嘴型精灵）。
2. Rive/Spine：`talk` 状态机由音量或 viseme 驱动。
3. 主舞台程序化 `seek(t)` 与 TTS 同一时间轴——与 [`programmatic-explainer-pipeline.md`](/workspace/jile-dasai/refs/programmatic-explainer-pipeline.md) 骨骼方案合流。

**viseme（可选升级）**：用轻量音素对齐（或 Confucius4 转写时间戳）映射 A/E/I/O/U/闭口；比纯 RMS 更像说话，成本更高。

### 6.4 与 cues 联动的播放器伪代码

```text
on frame t:
  g = gesture_at(cues, t)          # idle|wave|point|nod|emphasize|talk|…
  play_or_loop(segment[g], align_to_idle_cut)
  mouth = envelope(narration, t)   # closed|half|open
  composite(mouth_layer[mouth])
  if silence_gap(t): mouth = closed; prefer idle segment
```

---

## 7. 验收清单

- [ ] 每段首尾大衣实色、姿态接近同一 idle  
- [ ] 硬切拼接无明显跳变  
- [ ] `char-alpha.*` 棋盘格下背景为空，大衣不透  
- [ ] 叠片后左下一人，无双影  
- [ ] 音轨为 IndexTTS/解说原声，声画大致同长  
- [ ] （优化后）有声区间嘴型开合；静音闭口  
- [ ] （优化后）gesture 与旁白句子对齐，而非固定 A→E 循环  

---

## 8. 下一步建议（执行序）

1. **补 talk / point 加强段**（RH FL2V，回 idle）。  
2. **L1 口型**：从现有定妆出闭口/张嘴静帧或短循环 + RMS 驱动，叠进下一版 `explainer-with-narrator-alpha`。  
3. **按 `cues.json` 自动选段拼接**，替换固定 A→E。  
4. 评估是否迁 Rive 做 L3，与主流程骨骼方案统一。

---

## 9. 修订记录

| 日期 | 内容 |
| --- | --- |
| 2026-10-25 | RH 五段 FL2V、拼接、rembg 抠底、解说样片叠片首版 |
| 2026-10-25 | 修复 RGBA 抠穿大衣 → 改用不透明 idle-16x9 |
| 2026-10-26 | 本文档；增补动作库与口型同步优化方案 |
| 2026-10-26 | 收录 B站桌面AI女友 / RH InfiniteTalk 对口型参考与接入方案 |
