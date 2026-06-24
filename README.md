# OwlOS v1.0

意图驱动的 Agent 运行时系统桌面应用。

## 简介

OwlOS 提供单一对话入口，内置 **Elder Agent** 判断任务复杂度，决定直接自治回复或招募 **Sentinel + Worker** 团队协作完成。应用层面只保留两种模式：

- `chat`：对话模块，支持 Agent 智能选择与用户指定团队。
- `auto`：自动化/工作流模块，用于执行与管理工作流。

协作策略不再通过 `single/squad` 区分，而由 `teammateMode`（如 `pipeline`、`brainstorm`、`supervisor`、`hierarchy`）或 `teamTemplateId` 表达。未指定时由 Elder Agent 自行判断是否需要团队。

## 目录结构

```
├── README.md              # 说明文档
├── ARCHITECT.md           # 分层架构、类图与流程图
├── AGENTS.md              # AI 编码代理指南
├── TODO.md                # 当前缺陷 / 待办清单
├── docs/prd.md            # 产品需求文档
├── apps/
│   ├── desktop/           # Electron 桌面端（主进程 + 预加载脚本 + 构建配置）
│   │   ├── src/
│   │   │   ├── agent-runtime/      # 单 Agent 运行时（AgentFactory、Drivers、Tools、Prompts）
│   │   │   ├── agent-orchestrator/ # 多 Agent 编排（Runner、Strategy、TaskBoard、SessionSlot）
│   │   │   ├── api/                # IPC handlers + WebSocket server
│   │   │   ├── db/                 # SQLite schema、queries、migrations、seed
│   │   │   ├── services/           # 主进程服务
│   │   │   ├── main.ts             # 主进程入口
│   │   │   └── preload.ts          # 预加载脚本
│   │   └── package.json
│   └── web/               # React 前端应用
│       ├── src/
│       │   ├── components/# 组件目录
│       │   ├── contexts/  # React Context
│       │   ├── data/      # Mock 数据（fallback/开发模式）
│       │   ├── hooks/     # 通用 Hooks
│       │   ├── lib/       # 工具函数 / i18n
│       │   ├── services/  # Electron IPC / WebSocket 封装
│       │   ├── types/     # TypeScript 类型定义
│       │   ├── App.tsx    # 应用根组件
│       │   └── main.tsx   # React 渲染入口
│       ├── components.json # shadcn/ui 组件库配置
│       ├── tailwind.config.js
│       └── vite.config.ts
├── packages/              # 共享包
│   ├── core/              # Agent 运行时抽象、类型、MessageBox
│   ├── chat/              # 聊天共享逻辑
│   ├── knowledge/         # 知识库共享逻辑
│   ├── tools/             # 工具市场共享逻辑
│   └── workflow/          # 工作流画布组件与 WorkflowStore
└── turbo.json             # Turborepo 流水线配置
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
- Biome（静态检查）+ Vitest（测试）
- `@earendil-works/pi-ai` / Vercel AI SDK（LLM Driver，可切换）

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

# 统一检查（TypeScript + Biome + ast-grep + Tailwind + Vite 构建）
pnpm lint

# 统一类型检查
pnpm typecheck

# 运行测试（desktop / core 的 Vitest）
pnpm test

# 统一构建
pnpm build
```

### WSL2 说明

WSL2 中运行 Electron 需要图形界面支持。当前已验证可在开启 WSLg 的 WSL2 环境中直接运行 `pnpm --filter @owl-os/desktop dev`。如果遇到 `ELECTRON_RUN_AS_NODE=1` 环境变量导致 Electron 以 Node 模式启动，开发脚本已自动剔除该变量；若手动运行，请执行：

```bash
unset ELECTRON_RUN_AS_NODE
pnpm --filter @owl-os/desktop dev
```

## 模式说明

- **Agent 智能选择**：用户未指定团队时，由 Elder Agent 自行判断是否需要团队。
- **用户指定团队**：在输入框选择 `teammateMode` 或 `teamTemplateId`，Elder 会直接招募对应的 Sentinel。
- **自动化模式 (`auto`)**：切换到右侧抽屉的 `ExecutionLog`，用于查看和管理工作流执行。

## LLM Driver

默认使用 `@earendil-works/pi-ai`（`PiAgentDriver`）作为 Agent 运行时，模型供应商配置由 `@owl-os/core` 的共享 provider 注册表统一管理。支持的供应商包括 OpenAI、Anthropic、Google、DeepSeek、Mistral、Groq、xAI、OpenRouter、Together、Moonshot 以及 OpenAI-Compatible 兜底。

pi-ai 本身对不在其已知列表中的 provider 会回退到 `openai-completions` 通用模板，因此任何 OpenAI-compatible 端点都可接入。如需使用 Vercel AI SDK 作为替代 Driver：

```bash
USE_VERCEL_AI=1 pnpm --filter @owl-os/desktop dev
```

模型与供应商配置在「设置 → LLM 配置」中管理，也可在 `packages/core/src/llm-providers.ts` 与 `apps/desktop/src/agent-runtime/drivers/provider-config.ts` 中扩展更多供应商。

## 架构与状态约定

- 完整架构说明、分层图、类图、流程图见 `ARCHITECT.md`。
- 状态枚举（`AgentWorkStatus`、`SessionVisibility`、`SessionRunStatus`）定义在 `@owl-os/core`。
- 前后端时间约定：IPC 边界由 `apps/web/src/services/electron.ts` 统一转换为 `Date`。
- 业务数据已通过 Electron IPC 接入本地 SQLite，部分模块仍保留 Mock 作为 fallback。

## 了解更多

- 开发前请先阅读 `AGENTS.md` 与 `docs/prd.md`。
- 当前缺陷与排期见 `TODO.md`。
