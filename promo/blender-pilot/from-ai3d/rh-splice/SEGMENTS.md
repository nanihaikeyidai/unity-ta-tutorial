# Unity TA Q 讲解员 · RH 视频拼接 5 段

## 共用锚点
- **Idle 定姿**（首尾帧同一张）：正面站立，银白凌乱长发、浅灰蓝眼、黑高领+黑 techwear 大衣、战术裤厚底靴、银十字架；右手持教鞭自然垂于身侧偏前，左手抱浅蓝书贴胸；日漫 Q 版；纯色浅灰底。
- **参考图**：`promo/assets/ta-chibi-front-auth-rgba.png` → RH 上传为 `<Picture 1>`（首帧）与 `<Picture 2>`（尾帧，同图）
- **模式**：每段 **FL2VA**（首尾同 idle，中间做动作再回正）→ 段与段可硬切/短叠化无跳变
- **单段时长**：6.00s（RH/H3 常用档；若工作流只支持 5/6/8s 取最接近）
- **成片拼接顺序建议**：A 挥手 → B 指向 → C 点头 → D 强调 → E 讲解摊手（可按 cues 任意重排，因皆回 idle）
- **音**：无对白；`non_diegetic_music: N/A`；轻动作 Foley 即可

## 五段动作

| ID | 名 | 中间动作（约 1.0–4.5s） | 回正 |
|----|----|-------------------------|------|
| A | wave | 教鞭侧手臂抬起侧挥 2 下（讲解式招呼） | 臂回身侧 idle |
| B | point | 教鞭向前伸出指向画面右前方，停顿 | 收回 idle |
| C | nod | 微抬下巴后点头两下，肩几乎不动 | 头回正 idle |
| D | emphasize | 教鞭轻向下点两下强调，抱书手微抬 | 双臂回 idle |
| E | explain | 抱书手掌略外开说明，教鞭轻抬辅助 | 回 idle |

## 衔接规则
1. 每段 **0.00s = idle**，**6.00s = 同一 idle**（像素级同参考图姿态）。
2. 动作勿穿帮换装、勿换道具左右手、勿切镜（单镜 Static）。
3. 拼接：`ffmpeg -f concat` 按 A–E；或按解说 cues 抽段。
4. 若某段尾帧漂移：用该段首帧替换尾 2–3 帧，或 FL2VA 重跑。

## RH 工作流
- MiniMax H3 导演台：https://www.runninghub.cn/post/2084788947984666625
- 输出目录：`promo/blender-pilot/from-ai3d/rh-splice/`
- 文件名：`seg-A-wave.mp4` … `seg-E-explain.mp4` → `spliced-5.mp4`
