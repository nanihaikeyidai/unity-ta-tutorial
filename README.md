# Unity TA 实战学堂

面向技术美术的 **Unity URP / 性能优化 / Shader** 中文互动教程站。  
深色科技风 UI · 程序动画演示 · IndexTTS 2.5 中文讲解 + 同步字幕。

## 解说片 Agent Playbook（必读）

其它 agent 复现「程序主舞台 + IndexTTS + InfiniteTalk 对口型」请先读：

→ **[`promo/docs/AGENT-PLAYBOOK-explainer-lipsync.md`](promo/docs/AGENT-PLAYBOOK-explainer-lipsync.md)**

- 当前推荐成片：`promo/unity-ta-explainer-v3-lipsync.mp4`
- 手势库支线：`promo/docs/narrator-rh-splice-pipeline.md`
- jile 侧指针副本：`refs/unity-ta-explainer-agent-playbook.md`

> 完整 RH 手势条 `seg-*.mp4` / `char-alpha.mov` 体积大，未入库；需要时在本地 `promo/blender-pilot/from-ai3d/rh-splice/` 生成。

## 本地预览

用任意静态文件服务器打开本仓库根目录即可（例如编辑器自带 Live Preview）。  
**语音讲解**推荐 **Chrome / Edge**；首次点击「播放讲解」时系统可能会下载语音包。

## 站点地图

| 页面 | 说明 |
|------|------|
| `index.html` | 首页：导览、课程地图、学习路径 |
| `urp.html` | URP：Forward+、Renderer Feature、灯光阴影、后处理、Camera Stack |
| `perf.html` | 性能：SRP Batcher、GPU Instancing、Overdraw 热力、LOD / Profiler |
| `shader.html` | Shader：PBR、法线贴图、Fresnel、Dissolve |
| `css/styles.css` | 设计系统与布局 |
| `js/app.js` | 导航、粒子背景、滚动显现 |
| `js/voice.js` | IndexTTS mp3 播放 + 同步字幕；缺音频时回退 `speechSynthesis` |
| `js/demos/*.js` | 各课 Canvas / DOM 演示 |
| `DESIGN.md` | 信息架构与视觉规范（验收用） |

## 技术说明

- 纯静态，无构建步骤、无后端依赖。
- 动画：CSS transitions + `requestAnimationFrame` Canvas；无 jQuery。
- 语音：RunningHub IndexTTS 2.5 预生成 mp3；`js/voice.js` 底部字幕条按句推进；缺文件时回退 `speechSynthesis`。

## v1 范围与已知缺口（v2）

见 `DESIGN.md` 末尾「验收清单 / v2  backlog」。


## 语音讲解（RunningHub IndexTTS 2.5）

- 讲解稿：`scripts/speeches.json`（口语短句）
- 生成脚本：`python3 scripts/generate_tts.py`（需 `RUNNINGHUB_API_KEY`，**顺序**排队）
- workflowId：`1970149188463980545`（[IndexTTS 2.5](https://www.runninghub.cn/post/1970149188463980545)）
- 参考音色：项目内 `promo/assets/voice-ref.wav`（或自备 IndexTTS 参考 wav）
- 音频输出：`audio/speech-*.mp3`
- 前端：`js/voice.js` 优先播放 mp3；播放时底部显示**同步字幕条**（按字数加权对齐音频时长）；缺失 mp3 时回退 `speechSynthesis`
- 后续视频/图片优先复用创作者工作流：https://www.runninghub.cn/user-center/1952241019687493634

