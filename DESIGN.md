# Unity TA 学堂 · 设计说明（验收用）

## 1. 信息架构（IA）

```
首页 index
 ├─ 课程地图 → URP / 性能 / Shader 三章
 └─ 学习路径说明

URP 章（5 课）
  Forward+ 流水线 → Renderer Feature → 灯光阴影 → 后处理 → Camera Stack

性能章（4 课）
  SRP Batcher → GPU Instancing → Overdraw → LOD & Profiler 心智

Shader 章（4 课）
  PBR 速通 → 法线贴图 → Fresnel → Dissolve
```

每课固定模块：**标题 · 中文讲解（含隐喻）·「播放讲解」· 代码块（可选）· Live 演示面板**。  
章末有「下一章」CTA，形成线性学习流，也可用顶栏跳转。

## 2. 视觉系统

| Token | 值 | 用途 |
|-------|-----|------|
| 背景 | `#0a0e17` / `#06090f` | 深海军黑 |
| 强调青 | `#22d3ee` | 链接、激活、主 CTA |
| 强调紫 | `#a78bfa` | 语音按钮、隐喻条 |
| 卡片 | `rgba(17,24,39,0.72)` + blur | 玻璃拟态 |
| 字体 | system-ui / PingFang / Noto | 中文优先 |
| 等宽 | JetBrains Mono 栈 | 代码 |

动效原则：进入用 `IntersectionObserver` 上浮显现；卡片 hover 上移 + 顶边渐变线；粒子背景低透明度，避免抢内容。目标观感：**60fps 级轻量动效**，无重型 3D 库。

## 3. 语音 UX

- 按钮文案：**播放讲解**；播放中变暂停态（`.playing`）。
- 文案来源：区块 `data-speech`（专为朗读润色）或可见正文。
- 引擎：`speechSynthesis`，优先 `zh-CN` 系统声。
- 切页 / 再点同一按钮：取消当前朗读，避免叠音。
- 不支持时：按钮禁用并提示。

## 4. 演示与课文的对应

| 演示 | 说明的概念 |
|------|------------|
| Pipeline 跑马灯 | Forward+ Pass 顺序 |
| Feature 层叠卡片 | Renderer Feature 注入 |
| Draw Call 仪表 | SRP Batcher 开/关 |
| Overdraw 热力图 | 透明层数与填充浪费 |
| Normal 砖面 | 法线贴图骗光照 |
| Fresnel 球 | `pow(1-N·V, Power)` |
| Dissolve | `clip(noise - threshold)` + 灼烧边 |

## 5. 验收清单（v1）

- [ ] 四页均可打开，导航高亮正确，移动端菜单可用  
- [ ] 首页三张课程卡可进入对应章  
- [ ] 每课「播放讲解」有声（Chrome），可暂停  
- [ ] URP 管线节点依次点亮；Feature 卡片浮动  
- [ ] 性能页 Batcher 开关改变示意 Draw Call；Overdraw 滑杆改变热力  
- [ ] Shader 页法线灯光移动；Fresnel Power 有效；Dissolve 自动/手动溶解  
- [ ] 代码块可读、隐喻条存在、深色主题一致  

## 6. v2 Backlog（已知缺口）

- 真实 WebGL / Three.js 对照 Unity 材质球（当前为 2D Canvas 示意）  
- 更多课：Shader Graph 节点图动画、Render Graph API、移动端功耗  
- 进度本地存储、章节测验  
- 可选录制好的真人/TTS 音频文件（不依赖系统声）  
- 英文切换、PWA 离线包  

---

**设计意图一句话**：让 TA 学员「看见」管线与公式，并用耳朵听完一课，而不是只读文档。
