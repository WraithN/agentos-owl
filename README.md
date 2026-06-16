# OwlOS v1.0

意图驱动的 Agent 运行时系统前端应用。

## 简介

OwlOS 提供单一对话入口，内置 Orchestrator 根据任务复杂度在三种模式间切换：

- `single`：单聊模式
- `squad`：群聊 / 多 Agent 协作模式
- `auto`：自动化工作流模式

## 目录结构

```
├── README.md              # 说明文档
├── apps/
│   ├── desktop/           # Electron 桌面端（主进程 + 预加载脚本 + 构建配置）
│   └── web/               # React 前端应用
│       ├── index.html     # HTML 入口
│       ├── package.json   # 包管理
│       ├── public/        # 静态资源
│       ├── src/           # 源码目录
│       │   ├── App.tsx    # 应用根组件
│       │   ├── main.tsx   # React 渲染入口
│       │   ├── routes.tsx # 路由配置
│       │   ├── index.css  # 全局样式 / Aurora 设计系统
│       │   ├── components/# 组件目录
│       │   ├── contexts/  # React Context
│       │   ├── data/      # Mock 数据
│       │   ├── hooks/     # 通用 Hooks
│       │   ├── lib/       # 工具函数 / i18n
│       │   ├── pages/     # 页面级组件
│       │   ├── services/  # Electron IPC 服务层
│       │   └── types/     # TypeScript 类型定义
│       ├── components.json # shadcn/ui 组件库配置
│       ├── postcss.config.js
│       └── tailwind.config.js
├── docs/prd.md            # 产品需求文档
├── TODO.md                # 当前缺陷 / 待办清单
└── AGENTS.md              # AI 编码代理指南
```

## 技术栈

- React 18 + TypeScript 5.9+
- Vite（rolldown-vite）
- Tailwind CSS 3.4 + shadcn/ui
- Framer Motion / motion
- Recharts
- react-router v7
- Electron 34（桌面端）
- better-sqlite3（本地 SQLite 持久化）
- Turborepo 2 + pnpm workspaces

## 环境要求

- Node.js ≥ 20
- pnpm ≥ 9
- WSL2（Windows）用户需开启 WSLg，或安装 VcXsrv / GWSL 等 X Server

## 本地开发

```bash
# 安装依赖
pnpm install

# 启动 Electron 桌面开发环境（同时启动 web dev server 与 Electron）
pnpm --filter @owl-os/desktop dev

# 仅启动前端 web dev server
pnpm --filter @owl-os/web dev

# 统一检查
pnpm lint
```

### WSL2 说明

WSL2 中运行 Electron 需要图形界面支持。当前已验证可在开启 WSLg 的 WSL2 环境中直接运行 `pnpm --filter @owl-os/desktop dev`。如果遇到 `ELECTRON_RUN_AS_NODE=1` 环境变量导致 Electron 以 Node 模式启动，开发脚本已自动剔除该变量；若手动运行，请执行：

```bash
unset ELECTRON_RUN_AS_NODE
pnpm --filter @owl-os/desktop dev
```

## 了解更多

- 开发前请先阅读 `AGENTS.md` 与 `docs/prd.md`。
- 业务数据已通过 Electron IPC 接入本地 SQLite，部分模块仍保留 Mock 作为 fallback。
