<p align="center">
  <img src="./assets/xfxmd-icon.svg" width="120" height="120" alt="xfxmd icon" />
</p>

<h1 align="center">xfxmd</h1>

<p align="center">
  <strong>新复兴 Markdown 平台 -- 多人实时协作 Markdown 编辑器</strong>
</p>

<p align="center">
  配套《义务教育信息科技教学指南》互联网应用与创新 · 七年级 · 第 19 课「多人协同效率高」的 Markdown 协作教学平台。
</p>

<p align="center">
  <a href="#课程背景">课程背景</a>
  ·
  <a href="#核心能力">核心能力</a>
  ·
  <a href="#课堂使用建议">课堂使用</a>
  ·
  <a href="#快速开始">快速开始</a>
  ·
  <a href="#docker-部署">Docker 部署</a>
  ·
  <a href="#环境变量">环境变量</a>
  ·
  <a href="#架构说明">架构说明</a>
</p>

<p align="center">
  <img alt="教学指南" src="https://img.shields.io/badge/义务教育信息科技教学指南-七年级-00838F?style=for-the-badge" />
  <img alt="课程" src="https://img.shields.io/badge/第19课-多人协同效率高-00897B?style=for-the-badge" />
  <img alt="Go" src="https://img.shields.io/badge/Go-1.22+-00ADD8?style=for-the-badge&logo=go&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img alt="License" src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" />
</p>

---

## 课程背景

xfxmd 是为《义务教育信息科技教学指南》**互联网应用与创新**模块**七年级第 19 课「多人协同效率高」** 专门开发的教学配套平台。

本课属于"互联网应用与创新"学习主题，旨在让学生通过真实体验理解互联网的协同能力——多人如何通过网络同时编辑同一份文档、实时看到彼此的修改，从而理解互联网协作的基本原理与创新应用。

xfxmd 将教材中"多人协同"的教学目标落地为一个可操作、可感知的课堂工具：

| 教材要求 | xfxmd 对应能力 |
| --- | --- |
| 理解多人协同的概念 | 多人同时打开同一文档，实时看到彼此的光标和修改 |
| 体验互联网协同应用 | 基于 WebSocket + CRDT 的真实多人编辑，非模拟演示 |
| 感受效率提升 | 编辑与预览并排、工具栏快捷操作、免登录即用 |
| 了解协同背后的技术原理 | Y.js CRDT 冲突合并、WebSocket 实时通信、在线状态同步 |

xfxmd 不是简单的内容分享工具，也不是静态站点生成器。它的设计目标是让课堂上的每一位学生都能在同一份 Markdown 文档中实时协作，直观感受"多人协同效率高"。

## 一句话介绍

| 维度 | xfxmd 提供的能力 |
| --- | --- |
| 面向对象 | 义务教育信息科技课堂、七年级「多人协同效率高」教学 |
| 产品形态 | Web 应用，支持自部署，教师可在校园服务器一键启动 |
| 协作能力 | 基于 CRDT 的多人实时编辑、彩色光标、在线列表 |
| 编辑体验 | CodeMirror 6 编辑器、Markdown 语法高亮、工具栏快捷操作 |
| 预览能力 | 实时 Markdown 预览、代码高亮、滚动同步 |
| 数据持久化 | 按房间自动保存到磁盘，重启不丢失 |

## 核心能力

### 1. 多人实时协作

- 基于 Y.js CRDT 的冲突自动合并，多人同时编辑不冲突。
- 每个用户分配随机昵称和彩色光标，远程操作实时可见。
- 无需注册登录，打开链接即可开始协作。
- 在在线列表中查看当前房间所有协作者。

### 2. 编辑与预览并排

- 左侧 CodeMirror 6 编辑器，支持 Markdown 语法高亮。
- 右侧实时预览，使用 markdown-it 渲染，代码块支持 highlight.js 高亮。
- 中间分栏线可拖拽调整比例。
- 编辑与预览滚动按比例同步。

### 3. 顶部工具栏

- 常用 Markdown 格式快捷插入：标题、粗体、斜体、链接、图片、代码块、列表、引用、分割线。
- 一键插入，降低 Markdown 语法记忆负担。

### 4. 按房间持久化

- 每个文档以房间 ID 为单位独立持久化到磁盘。
- 服务重启后自动恢复上次编辑状态。
- 支持通过环境变量自定义持久化目录。

### 5. 轻量部署

- 单个 Go 二进制包含后端服务和前端静态文件。
- Docker 一键部署。
- WebSocket 连接数和房间人数可配置。

## 课堂使用建议

以下流程对应第 19 课教学环节，教师可根据实际课时灵活调整。

### 课前准备

1. 教师在校园服务器或本机启动 xfxmd（见下方「快速开始」）。
2. 创建一个课堂房间，例如 `http://<服务器地址>:8080/lesson19`。
3. 将链接发送给学生（班级群、教学平台或板书）。

### 课堂流程

| 阶段 | 活动 | 对应教学目标 |
| --- | --- | --- |
| 导入（5 min） | 教师演示：在 xfxmd 中打开房间，展示多人光标同时出现 | 引出「多人协同」概念 |
| 体验（10 min） | 全班进入同一房间，每人写一段自我介绍，观察他人实时输入 | 感受互联网协同的即时性 |
| 探究（10 min） | 分组在同一文档中协作完成一个主题（如「校园生活」），对比单人写作与多人协作的效率差异 | 理解协同提升效率的原理 |
| 讨论（5 min） | 观察光标颜色、在线列表，讨论：多人同时编辑会不会冲突？系统如何处理？ | 了解 CRDT / 协同编辑背后的技术原理 |
| 总结（5 min） | 各组展示协作成果，教师总结互联网协同应用的价值 | 形成知识迁移 |

### 使用提示

- 每个房间 URL 对应一份独立文档，不同班级使用不同房间名即可隔离。
- 学生无需注册，打开链接自动分配昵称和颜色。
- 工具栏提供 Markdown 快捷插入，零基础学生也能快速上手。
- 教师可通过在线列表查看当前参与人数。

## 快速开始

### 前置条件

- Go 1.22+
- Node.js 18+（仅前端开发需要）

### 本地开发

1. 启动后端（默认 `:8080`，数据目录 `./data`）：

```bash
cd backend
go run .
```

2. 另开终端启动前端（Vite 会把 `/yjs`、`/api` 代理到后端）：

```bash
cd frontend
npm install
npm run dev
```

3. 浏览器打开 Vite 提示的地址（一般为 `http://localhost:5173`）。

### 仅后端 + 已构建前端

```bash
cd backend
go run .
# 打开 http://localhost:8080
```

构建前端到 `backend/static`：

```bash
cd frontend && npm run build
```

## Docker 部署

```bash
docker compose up --build
```

访问 `http://localhost:8080`。数据保存在命名卷 `collab_data`（可在 `docker-compose.yml` 中修改）。

## 环境变量

| 变量 | 说明 | 默认 |
| --- | --- | --- |
| `PORT` | HTTP 端口 | `8080` |
| `DATA_DIR` | Y.js 文档持久化目录 | `./data` |
| `MAX_WS_CONNECTIONS` | 全站 WebSocket 连接上限 | `500` |
| `MAX_PEERS_PER_ROOM` | 单房间人数上限 | `120` |

## 架构说明

```
┌─────────────────────────────────────────────────┐
│                     Browser                      │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ CodeMirror│  │ Markdown │  │   Awareness   │  │
│  │   Editor  │  │  Preview │  │  (cursor/     │  │
│  │  + Y.js   │  │ markdown │  │   presence)   │  │
│  └────┬──────┘  └──────────┘  └───────┬───────┘  │
│       │       y-websocket             │          │
└───────┼───────────────────────────────┼──────────┘
        │                               │
   ┌────┴───────────────────────────────┴────┐
   │            Go WebSocket Server           │
   │  /yjs/:room  (y-websocket compatible)    │
   │  ┌──────────┐  ┌──────────────────────┐ │
   │  │ ygo      │  │  Persistence Layer   │ │
   │  │ (Y.js    │  │  (per-room file      │ │
   │  │  server) │  │   storage)           │ │
   │  └──────────┘  └──────────────────────┘ │
   └─────────────────────────────────────────┘
```

- **WebSocket**: `/yjs/:room`，与官方 `y-websocket` 客户端协议兼容（[reearth/ygo](https://github.com/reearth/ygo)）。
- **协作结构**: `Y.Text("markdown")` + Awareness（`user.name` / `user.color`）驱动远程光标与在线列表。
- **预览**: 前端 `markdown-it` + `highlight.js`，HTML 经 `DOMPurify` 消毒。

## 技术栈

| 层 | 技术 |
| --- | --- |
| 后端 | Go, ygo (Y.js WebSocket server) |
| 前端框架 | React 19, TypeScript, Vite |
| 编辑器 | CodeMirror 6, y-codemirror.next |
| 协作引擎 | Y.js, y-websocket |
| 样式 | Tailwind CSS 4 |
| Markdown 渲染 | markdown-it, highlight.js, DOMPurify |

## 许可证

MIT
