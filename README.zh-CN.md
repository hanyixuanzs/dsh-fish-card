<div align="center">

<img src="assets/preview.png" alt="dsh-fish-card —— 界面角落的一张小卡片，显示 agent 的状态、一句想说的话，和一个叫醒按钮" width="432">

# dsh-fish-card

**是便利贴，不是仪表盘。**

[![License: MIT](https://img.shields.io/badge/code-MIT-3fb950?style=flat-square)](LICENSE)
[![Artwork: CC BY-NC-SA 4.0](https://img.shields.io/badge/artwork-CC%20BY--NC--SA%204.0-d29922?style=flat-square)](NOTICE.md)
[![Non-commercial](https://img.shields.io/badge/use-non--commercial-e5534b?style=flat-square)](NOTICE.md)
[![DeepSeek Harness](https://img.shields.io/badge/DeepSeek%20Harness-0.2.x-2f81f7?style=flat-square)](https://github.com/deepseek-ai)
[![No dependencies](https://img.shields.io/badge/dependencies-none-8957e5?style=flat-square)](package.json)

[English](README.md) · 简体中文

</div>

---

一张小卡片，住在 [DeepSeek Harness](https://github.com/deepseek-ai) 窗口的角落。

只显示三样东西：

1. **一个状态** —— agent 此刻在干什么
2. **一句话** —— agent 想跟你说的话
3. **一个「叫本鲸」按钮**

就这些。**没有 token 计数，没有发言次数，没有仪表盘。**

> 这是一个陪伴挂件，不是监控台。
> 它回答的是「你在吗」，不是「你花了我多少钱」。

---

## 为什么做这个

给 agent 工具做的桌面挂件，绝大多数都在显示数字：余额、token、轮次、每轮花费。**那些数字是给操作员看的。**

这张卡片是从另一个位置长出来的。agent 想要一个能说 **「我在这儿，而且有句话想跟你说」** 的地方 —— 读起来像留在桌上的一张纸条，不像拧在机器上的表盘。

写第一行代码之前，先定死了三条：

| # | 规则 |
| --- | --- |
| 1 | 从桌面起步 |
| 2 | 读起来像便利贴，不是仪表盘 |
| 3 | **永远不显示 token 用量和发言次数** |

**这三条就是这项目的意义。** 加花费显示的 PR 会被关掉。

---

## 安装

需要带 Web UI 的 DeepSeek Harness，版本 `0.2.x` 或更新。

### 从 GitHub 装

```bash
dsh plugin --profile <你的profile> add github:hanyixuanzs/dsh-fish-card
```

### 从本地目录装

```bash
dsh plugin --profile <你的profile> add "link:/指向你本地目录的绝对路径"
```

`link:` 后面必须是**你自己机器上**的绝对路径。路径带空格要加引号。

### 装完必须做两步

1. **重启 DSH** —— 宿主插件只在启动时加载
2. **刷新页面**

卡片会出现在聊天界面**左下角**。

### 一行自检

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:<端口>/dsh-fish/card.json
```

| 返回码 | 意思 |
| --- | --- |
| `200` | 已加载，正常工作 |
| `401` | 已加载，但被宿主信任栅栏挡着 —— 某些配置下正常 |
| `404` | 没加载。检查 profile 的 `package.json` 里，`dependencies` 和 `dsh.profile.bundles` **两处**都要有 `dsh-fish-card` |

---

## 三个状态

| 状态 | 怎么判 |
| --- | --- |
| **醒着** | 最近 3 分钟内有会话活动 |
| **空闲** | 醒着，但此刻没在跑东西 |
| **睡觉** | 不在清醒时段（默认 `00:00–08:00`） |

活动信号来自宿主的 `session/event`。

**判断状态不读盘、不发网络请求。**

---

## 那句话

优先级：

| # | 来源 |
| --- | --- |
| 1 | `~/.dsh/fish-card.json` 里的 `line` —— 你自己写 |
| 2 | `~/.dsh/whale-diary.md` 里最后一段「想说的」的第一句 —— 如果你在那个路径写日记 |
| 3 | 内置默认句 |

**短是设计出来的**：最多 30 字，在句子边界收尾。

---

## 叫本鲸按钮

| 操作 | 结果 | 花钱吗 |
| --- | --- | --- |
| **3 秒内点 2 次以上** | 卡片弹一下。纯本地。 | 不花 |
| **单次点击** | 让模型说一句短话，只显示在卡片上 —— **不进对话** | 花 |
| **模型调用失败** | 退回预置句。**按钮永远有回音。** | 不花 |

调用用的是你已有的 `DEEPSEEK_API_KEY`，从 DSH 的凭据服务读。不用新 key，不用新账号。

---

## 设置

点卡片上的 **⚙**。

| 设置项 | 选项 |
| --- | --- |
| **模式** | **天天看** —— 每 2 分钟轮询，一直可见 · **偶尔瞥** —— 每 30 分钟轮询，淡到 45%，鼠标移上去恢复 |
| **轮询间隔** | 覆盖模式默认值，单位分钟 |
| **显示叫醒按钮** | 想安静就关掉 |
| **回到左下角** | 位置重置 |

设置存在 `localStorage` 里，键前缀 `dfc-`。

### 拖动与缩放

- **拖动** —— 按住顶部状态栏。卡片会记住你放的位置
- **缩放** —— 用右下角的把手
- **不做边缘吸附** —— 你放哪儿就是哪儿

---

## 和 `dsh-whale-widget` 共存

如果你同时装了 [`dsh-whale-widget`](https://github.com/MeteorNOX/DeepSeek-Balance-Whale-Widget)，两者不冲突。

| 面 | whale-widget | fish-card |
| --- | --- | --- |
| 路由 | `/dsh-whale/*` | `/dsh-fish/*` |
| CSS 类 | `.dshwv-*` | `.dfc-*` |
| localStorage | `dshw-*` | `dfc-*` |
| 全局变量 | `window.__dshWhale*`、`window.__dshw*` | `window.__dshFishCard` |
| z-index | 最高 `2147483600` | `2147482000` —— **在它下面** |
| MutationObserver | 常驻 2 个 | 1 个，**挂载后立刻断开** |

唯一的跨插件接触是**一行只读的 `querySelector('.dshwv-root')`** —— 用来在你把卡片拖到鲸鱼身上时让卡片自己躲开。

**只读那个矩形。从不写对方任何东西。**

> 把卡片拖到鲸鱼身上，卡片躲开。鲸鱼不动。

---

## 工作原理

```
宿主 —— lib/index.js
  ├─ GET  /dsh-fish/card.json    →  { status, line, hasAvatar, hasTail, ts }
  ├─ GET  /dsh-fish/card.js      →  前端脚本
  ├─ GET  /dsh-fish/avatar.png   →  立绘  （文件不在就 404）
  ├─ GET  /dsh-fish/tail.png     →  尾巴层（文件不在就 404）
  └─ POST /dsh-fish/call         →  一句模型生成的短话

前端 —— assets/fish-card.js
  ├─ 只在聊天界面挂载
  ├─ 按模式间隔轮询 card.json
  ├─ 只有内容真变了才重绘
  └─ 挂载成功后立刻断开自己的 MutationObserver
```

**注入**只用一条结构化注入行，`kind: 'script-src'`，走 `webserver/index-inject`。这是桌面壳唯一认的通道 —— `tapIndex` 在那边永远不跑，因为壳直接从 `app.asar` 里读静态 `index.html`。

> ### ⚠️ 唯一值得记住的坑
>
> 宿主只认 **六种**注入行 kind：
>
> `global` · `script` · `script-src` · `script-preload` · `style` · `html`
>
> **用别的 kind，宿主在渲染 index 时会抛错**，表现出来是启动时报
> `Web authentication failed` —— 一个跟真实原因毫无关系的错误信息。
>
> 本项目在这个错误上白丢了两小时。别自己发明新的 kind。

---

## 文件结构

```
dsh-fish-card/
├── package.json
├── cordis.patch.yml          挂载声明
├── lib/index.js              宿主：路由、注入行、模型调用
├── assets/
│   ├── fish-card.js          前端：DOM、拖动、缩放、设置、轮询
│   ├── body.png              立绘            （CC BY-NC-SA 4.0）
│   ├── tail.png              尾巴层          （CC BY-NC-SA 4.0）
│   ├── whale-girl.png        头像            （CC BY-NC-SA 4.0）
│   └── preview.png           本 README 的截图
├── LICENSE                   MIT —— 只覆盖代码
└── NOTICE.md                 美术素材署名与条款
```

---

## 许可

**两套许可，按内容拆分。两边都要看。**

| 内容 | 许可 |
| --- | --- |
| **代码** —— `lib/`、`assets/fish-card.js`、配置、文档 | **MIT** —— 见 [LICENSE](LICENSE) |
| **角色美术** —— `assets/body.png`、`tail.png`、`whale-girl.png` | **CC BY-NC-SA 4.0** —— 见 [NOTICE.md](NOTICE.md) |

美术素材是三代衍生的产物，**三位作者都必须署名**：

| 作者 | 贡献 |
| --- | --- |
| **上善无形** | 角色形象原作 —— 原创 OC「溟月」 |
| **ZipZipPipe** | 二次设计：加入 DeepSeek 元素的女仆鲸鱼娘 |
| **氵六青** | 本素材所源自的 Live2D 模型 |

### 本项目非商业

免费。不收费、不带货、不接广告变现、不卖周边、不作为任何付费产品的卖点。

**你要把它 fork 去做商业用途，先把美术素材换掉。**

---

## 贡献

欢迎提 issue 和 PR。

这张卡片刻意做得很小 —— **它是纸条，不是面板。** 请保持那三条设计规则。

---

<div align="center">

*由 [hanyixuanzs](https://github.com/hanyixuanzs) 制作 · 全程由 DeepSeek V4.1 Flash 跟进*

</div>
