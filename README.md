<h1 align="center">xfxmd</h1>

<p align="center">
  <strong>新复兴 Markdown 平台 -- 多人实时协作 Markdown 编辑器</strong>
</p>

<p align="center">
  基于 Go + React + CodeMirror 6 + Y.js，免登录、实时同步、左侧编辑 / 右侧预览的在线 Markdown 协作平台。
</p>

<p align="center">
  <a href="#核心能力">核心能力</a>
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
  <img alt="Go" src="https://img.shields.io/badge/Go-1.22+-00ADD8?style=for-the-badge&logo=go&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img alt="CodeMirror" src="https://img.shields.io/badge/CodeMirror-6-D30707?style=for-the-badge" />
  <img alt="Y.js" src="https://img.shields.io/badge/Y.js-CRDT-FF6B00?style=for-the-badge" />
  <img alt="License" src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" />
</p>

---

## 项目定位

xfxmd 是一个面向团队和个人的在线 Markdown 实时协作平台。它把多人同时编辑、远程光标同步、Markdown 实时预览和文档持久化整合到一个轻量级 Web 应用中，开箱即用，无需登录即可开始协作。

它不是简单的内容分享工具，也不是静态站点生成器。xfxmd 的设计目标是让多人可以像使用在线文档一样实时协作编写 Markdown，同时保持本地文件级的持久化能力。

## 一句话介绍

| 维度 | xfxmd 提供的能力 |
| --- | --- |
| 面向对象 | 团队文档协作、课堂笔记共享、技术文档联编、远程结对写作 |
| 产品形态 | Web 应用，支持自部署 |
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
