<!-- AGENTS.md — OwlOS v1.0 -->

> 本文件面向 AI 编码代理。开始修改代码前，请先完整阅读本文件，再阅读 `AGENTS.user.md`。
> 若两条文件存在冲突，以 `AGENTS.user.md` 中的用户自定义规则为准，但不得违反本文件中明确标注不可覆盖的安全与合规要求。
> **注意**：`AGENTS.user.md` 的 Rule 1–Rule 6 为不可覆盖的硬约束，修改代理指南时禁止删除、覆盖或修改这六条规则。

## 0. 前置要求

- 每次开始工作前，必须先完整阅读本文件（`AGENTS.md`）。
- **随后必须读取 `AGENTS.user.md`**，将其规则作为本文件的补充与强化约束一并遵守。
- 修改代理指南时，禁止覆盖、删除或修改 `AGENTS.user.md` 中的 Rule 1–Rule 6。

## 1. 项目概述

- **项目名称**：根 `package.json` 中名为 `owl-os-monorepo`，业务产品名为 **OwlOS v1.0**。
- **项目定位**：一个“意图驱动的 Agent 运行时系统”的桌面端前端应用。用户通过单一对话入口与系统交互，系统内置 Orchestrator 根据任务复杂度在三种模式间切换：
  - `single`：单聊模式
  - `squad`：群聊 / 多 Agent 协作模式
  - `auto`：自动化工作流模式
- **核心功能模块**（对应 `apps/web/src/components/` 下目录）：
  - 对话模块（`chat`）
  - 群聊协作（`squad`）
  - 自动化执行日志（`automation`）
  - 知识库（`knowledge`）
  - 工具市场（`tools`）
  - 设置中心（`settings`）
  - 全局浮层/命令面板/通知中心（`global`）
- **当前状态**：
  - 已完成 **Tauri → Electron + Turborepo** 架构迁移：
    - 前端代码位于 `apps/web/`
    - Electron 主进程/预加载脚本/构建配置位于 `apps/desktop/`
    - 原 Tauri Rust 代码已删除
  - 认证与数据持久化通过 Electron IPC（`apps/web/src/services/electron.ts` ↔ `apps/desktop/src/api/ipc/`）接入本地 SQLite（`better-sqlite3`）。
  - 业务数据仍在逐步从 `apps/web/src/data/mockData.ts` 迁移到真实后端；部分模块仍使用 mock 作为 fallback。
  - LLM 调用、文档解析、Shell 执行等能力已通过 IPC 暴露接口，但真实模型/服务接入仍在进行中。

## 2. 技术栈与运行时架构

| 层级 | 技术 |
|------|------|
| 框架 | React 18（函数组件 + Hooks） |
| 语言 | TypeScript 5.9+，严格模式开启 |
| 构建工具 | Vite（实际使用 `rolldown-vite` 别名） |
| 包管理器 | pnpm 11.0.9（存在 `pnpm-lock.yaml`，`packageManager` 字段固定版本） |
| Monorepo | Turborepo 2 + pnpm workspaces |
| 样式 | Tailwind CSS 3.4 + PostCSS + Autoprefixer |
| UI 组件库 | shadcn/ui（`apps/web/components.json`，风格 `new-york`，图标库 `lucide`） |
| 动画 | Framer Motion / motion |
| 图表 | Recharts |
| 路由 | react-router / react-router-dom v7 |
| 状态管理 | React Context（`AppContext`、`AuthContext`） |
| 错误监控 | Sentry React（DSN 通过 `VITE_SENTRY_DSN` 环境变量注入） |
| 通知 Toast | sonner |
| 表单校验 | react-hook-form + zod + @hookform/resolvers |
| HTTP 客户端 | axios / ky（已声明依赖，当前代码中未实际接入后端 HTTP） |
| 后端 SDK | @supabase/supabase-js（`2.103.1`），后续将移除 |
| 桌面运行时 | Electron 34.5.8 |
| 本地数据库 | better-sqlite3 12.10.1 |
| Agent 运行时 | `@earendil-works/pi-agent-core` / `@earendil-works/pi-ai`（Electron 主进程） |
| 密码哈希 | argon2 |

### 2.1 入口与路由

- **HTML 入口**：`apps/web/index.html` → `/apps/web/src/main.tsx`
- **应用根组件**：`apps/web/src/App.tsx`
  - 使用 `HashRouter`，仅配置一条根路由 `/`，其余路径重定向到 `/`。
  - 全局挂载 `Toaster`（来自 `sonner`）与 Sentry 错误边界。
- **实际布局渲染**：`apps/web/src/components/layouts/AppLayout.tsx`
  - 内部提供 `AppProvider`，并通过 `moduleMap` 根据 `activeModule` 切换模块：`chat`、`knowledge`、`tools`、`settings`、`more`。
  - 所有模块 JSX 在组件内部定义，避免 HMR 时模块级 JSX 绕过 Provider 导致 Context 丢失。

### 2.2 Electron 主进程

- **主进程入口**：`apps/desktop/src/main.ts`
  - 启动时调用 `initDatabase()` 初始化 SQLite。
  - 调用 `registerIpcHandlers()` 注册所有 IPC 通道。
  - 开发环境加载 `http://localhost:5173`，生产环境加载 `dist/renderer/index.html`。
  - 针对 WSL2 / 容器环境禁用 GPU 加速，避免 X11/WSLg 图像传输错误。
- **预加载脚本**：`apps/desktop/src/preload.ts`
  - 通过 `contextBridge.exposeInMainWorld("electron", { invoke, on })` 暴露安全的 IPC API。
- **IPC 注册入口**：`apps/desktop/src/api/ipc/index.ts`
  - 按领域分文件注册：`auth`、`settings`、`agents`、`conversations`、`messages`、`tasks`、`workflows`、`knowledge`、`marketTools`、`extensions`、`teams`、`billing`、`notifications`、`apiKeys`、`webhooks`、`auditLogs`、`files`、`shell`、`llm`、`parseDocument`、`owlery`、`window` 等。

### 2.3 数据库与持久化

- **数据库文件**：`~/.config/owl-os/db/owl_os.db`
  - 应用数据根目录固定为 `~/.config/owl-os/`，与 Electron 默认 `userData` 解耦，避免不同 dev/打包名下产生多个数据库。
  - 启动时会自动把老的 `~/.config/Electron/owl_os.db*` 迁移到新位置。
- **Schema**：`apps/desktop/src/db/schema.sql`
  - 表包括：`users`、`settings`、`api_keys`、`webhooks`、`agents`、`conversations`、`messages`、`kanban_tasks`、`workflow_templates`、`knowledge_docs`、`doc_chunks`、`market_tools` 等。
- **增量迁移**：`apps/desktop/src/db/migrations.ts`
- **种子数据**：`apps/desktop/src/db/seed/index.ts`，仅在空库时填充。
- **WAL 模式**：数据库启用 `journal_mode = WAL` 与 `foreign_keys = ON`。

### 2.4 共享包

`packages/` 下为 workspace 共享包，被 `apps/web` 与 `apps/desktop` 引用：

| 包名 | 路径 | 说明 |
|------|------|------|
| `@owl-os/core` | `packages/core/` | 工具函数（`cn`、`formatDate`）、Agent 运行时抽象、Owlery 多 Agent 会话管理 |
| `@owl-os/chat` | `packages/chat/` | 聊天相关共享逻辑 |
| `@owl-os/knowledge` | `packages/knowledge/` | 知识库共享逻辑 |
| `@owl-os/tools` | `packages/tools/` | 工具市场共享逻辑 |
| `@owl-os/workflow` | `packages/workflow/` | 工作流画布组件、布局算法、`WorkflowStore` 注入接口 |

### 2.5 设计系统（Aurora）

- 主题采用 **Aurora 设计系统**，以深空背景 + 极光渐变（`#00f2c3 → #38bdf8 → #7c3aed`）+ 玻璃拟态为视觉核心。
- 深色/浅色切换通过 `html.dark` class 实现（`apps/web/tailwind.config.js` 中 `darkMode: ['class']`）。
- 主要变量与工具类定义在 `apps/web/src/index.css`：
  - `glass-l1` ~ `glass-l4`：分层玻璃拟态
  - `aurora-text` / `aurora-border` / `btn-aurora`：极光渐变文字、边框、按钮
  - `badge-*` / `table-*`：状态徽章、表格高亮
  - `deep-space`：自动跟随主题的背景
- 主题色、强调色、字体大小、动画等级、语言可在 `AppearanceSettings` 中调整，最终通过 `AppContext` 修改 CSS 变量与 `html` class。
- 新增 UI 必须阅读并遵循 `DESIGN.md`，样式变更后需同步更新 `DESIGN.md`。

## 3. 目录结构

```
.
├── .rules/                # ast-grep 自定义规则（见“代码规范”）
├── apps/
│   ├── desktop/           # Electron 桌面应用
│   │   ├── src/
│   │   │   ├── main.ts              # 主进程入口
│   │   │   ├── preload.ts           # 预加载脚本（暴露 electron API）
│   │   │   ├── renderer/            # 生产环境 renderer 入口 HTML
│   │   │   ├── agent-runtime/       # Agent 构造与运行依赖
│   │   │   ├── agent-orchestrator/  # Agent 会话编排（Worker 内 + 主进程）
│   │   │   ├── api/                 # IPC + WebSocket 统一入口
│   │   │   ├── config/              # 预览等运行时配置
│   │   │   ├── db/                  # SQLite schema、迁移、查询、种子
│   │   │   ├── services/            # 主进程服务（审计日志、会话详情存储）
│   │   │   ├── utils/               # 程序内部工具
│   │   │   └── __tests__/           # Vitest 测试
│   │   ├── scripts/                 # 开发/构建辅助脚本
│   │   ├── vite.*.config.ts         # 主进程/预加载/renderer 构建配置
│   │   └── package.json
│   └── web/               # 前端 React 应用
│       ├── index.html
│       ├── src/           # React 源码、组件、样式、服务
│       │   ├── components/          # 业务组件与 shadcn/ui 组件
│       │   ├── contexts/            # React Context（AppContext、AuthContext）
│       │   ├── data/                # Mock 数据
│       │   ├── hooks/               # 通用 Hooks
│       │   ├── lib/                 # 工具函数 / i18n
│       │   ├── pages/               # 页面级组件
│       │   ├── services/            # Electron IPC 服务封装
│       │   └── types/               # TypeScript 类型定义
│       ├── public/        # 静态资源
│       ├── components.json # shadcn/ui 组件库配置
│       ├── tailwind.config.js
│       ├── postcss.config.js
│       ├── vite.config.ts
│       ├── tsconfig*.json
│       └── package.json
├── packages/              # 共享包目录（core / chat / knowledge / tools / workflow）
├── docs/
│   ├── bugs/              # 缺陷记录（见 AGENTS.user.md Rule 4）
│   ├── superpowers/       # 技能相关文档
│   └── prd.md             # 产品需求文档
├── scripts/
│   └── start-desktop.sh   # 桌面端启动脚本
├── .rules/                # ast-grep 自定义规则
├── turbo.json             # Turborepo 流水线配置
├── pnpm-workspace.yaml    # pnpm workspace 配置
├── biome.json             # Biome 静态检查配置（根目录共享）
├── package.json           # monorepo 根依赖与脚本
├── pnpm-lock.yaml         # pnpm 锁文件
├── TODO.md                # 基于 PRD 的当前缺陷/待办清单
├── DESIGN.md              # Aurora 设计系统规范
├── AGENTS.md              # 本文件
├── AGENTS.user.md         # 用户自定义代理规则
└── README.md              # 面向用户的说明文档
```

### 3.1 路径别名

- Vite 与 TypeScript 均配置 `@/` 指向 `./apps/web/src/`（在 `apps/web` 包内）。
- shadcn/ui 组件统一使用 `@/components/ui/*`、`@/lib/utils` 等别名导入。

## 4. 构建、验证与运行命令

> **重要**：根 `package.json` 的 `dev`/`build`/`lint`/`typecheck`/`test` 通过 Turborepo 调用各 app 脚本。`apps/web` 仍保留原有 `lint` 脚本作为统一验证入口。

### 4.1 推荐命令

```bash
# 安装依赖
pnpm install

# 启动 Electron 桌面开发环境（同时启动 web dev server 与 Electron）
pnpm --filter @owl-os/desktop dev

# 仅启动前端 web dev server
pnpm --filter @owl-os/web dev

# 统一检查（Turborepo 会调用 apps/web 的 lint）
pnpm lint

# 统一类型检查
pnpm typecheck

# 统一构建
pnpm build

# 运行测试（目前仅 desktop 与 core 有 vitest 测试）
pnpm test
```

### 4.2 `apps/web` 的 `lint` 脚本实际执行内容

```bash
tsgo -p tsconfig.check.json;
(cd ../.. && pnpm --filter @owl-os/web exec biome lint);
../../.rules/check.sh;
npx tailwindcss -i ./apps/web/src/index.css -o /dev/null 2>&1 | grep -E '^(CssSyntaxError|Error):.*' || true;
../../.rules/testBuild.sh
```

即依次执行：
1. TypeScript 类型检查（`tsgo`，使用 `tsconfig.check.json`）。
2. Biome 静态检查。
3. ast-grep 自定义规则检查。
4. Tailwind CSS 编译检查。
5. Vite 构建验证（输出到 `.dist-test`）。

### 4.3 环境要求

- `README.md` 中声明：Node.js ≥ 20，pnpm ≥ 9。
- 当前环境实际检测到 Node.js `v26.1.0`、pnpm `11.0.9`。
- **注意**：`ast-grep` 未全局安装；执行 lint 前请确保 `pnpm install` 已成功，否则 `.rules/check.sh` 会失败。

### 4.4 开发服务器

- `pnpm --filter @owl-os/web dev`：启动 Vite dev server（端口 5173）。
- `pnpm --filter @owl-os/desktop dev`：启动完整桌面开发环境（web dev server + Electron）。
  - 该脚本会先检查 `http://127.0.0.1:5173` 是否已启动；若未启动则启动 web dev server。
  - 然后构建主进程与预加载脚本，最后启动 Electron。
  - 会自动剔除 `ELECTRON_RUN_AS_NODE=1` 环境变量，避免 Electron 以 Node 模式启动。
- WSL2 用户需开启 WSLg，或安装 VcXsrv / GWSL 等 X Server；若遇到 GPU 相关问题，主进程已强制使用软件渲染。

## 5. 代码规范与约束

### 5.1 语言与注释

- 项目主要使用**中文注释**与中文文案，变量/类型命名使用英文。
- 新添加的注释、错误提示、Toast 文案建议保持中文，以与现有代码风格一致。
- 复杂逻辑必须添加注释，说明关键变量、条件分支、边界处理、已知限制或 TODO（参见 `AGENTS.user.md` Rule 3）。

### 5.2 结构与可维护性（AGENTS.user.md Rule 2）

- 单文件有效代码行数 ≤ 600 行（不含注释与空行），超出需按功能域或抽象层级拆分。
- 嵌套深度 ≤ 3 层，超出时使用提前返回（Guard Clauses）或抽取小函数。
- 重复逻辑出现 ≥ 2 次必须抽取为有意义的命名函数。
- 字面量需抽取为命名常量（UPPER_SNAKE_CASE）， obvious 的 `0`/`1`/`-1` 索引、`true`/`false` 简单判断、纯 UI 临时字符串除外。
- **`apps/desktop/src` 下文件与目录统一使用小写 + 短横线（kebab-case）命名**：例如 `agent-executor.ts`、`api-keys.ts`、`session-stream.ts`、`web-socket-server.ts`。类名/类型名仍使用 PascalCase，但文件名必须统一为 kebab-case，避免 `AgentExecutor.ts`、`apiKeys.ts` 等混合格式。

### 5.3 Biome 规则（`biome.json`）

- Linter 启用，Formatter 禁用。
- 必须遵守的规则：
  - `correctness/noUndeclaredDependencies`：不能引用未在 `package.json` 中声明的依赖。
  - `suspicious/noRedeclare`：禁止重复声明。
  - `style/noCommonJs`：禁止 CommonJS（`apps/web/tailwind.config.js` 已单独豁免）。
- 扫描范围：`apps/web/src/**/*.{js,jsx,ts,tsx,css,scss}`、`apps/web/tailwind.config.js`、`apps/desktop/src/**/*.ts`、`packages/**/*.{ts,tsx}`。

### 5.4 ast-grep 自定义规则（`.rules/`）

项目通过 `sgconfig.yml` 加载 `.rules/` 目录，`.rules/check.sh` 会逐个执行以下规则。新增代码应主动避免触发这些规则：

| 规则文件 | 约束说明 |
|----------|----------|
| `SelectItem.yml` | `SelectItem` 的 `value` 不能是空字符串 `''`；如需“全选”请用 `'all'`。 |
| `contrast.yml` | 检查 Button 的前景/背景对比度：outline 按钮不要配 `text-foreground`；default 按钮不要配 `text-primary`；outline 按钮不要配 `text-white/gray-*`。 |
| `require-button-interaction.yml` | `<Button>` 必须可交互：必须提供 `onClick`、`type="submit"`、`type="reset"`、`asChild`，或位于 `*Trigger` / `<Link>` / `<a>` 内部。 |
| `slot-nesting.yml` | 禁止 Radix UI 的 `*Trigger asChild` 内直接包裹 `FormControl`（双层 Slot 会导致 ref 与点击事件丢失）。 |
| `toast-hook.yml` | 禁止使用 `@/hooks/use-toast`，统一使用 `import { toast } from "sonner"`。 |
| `supabase-edge-function-get-body.yml` | `supabase.functions.invoke` 使用 `method: 'GET'` 时不能带 `body`，参数应拼接到 URL 中。 |
| `useAuth.yml` / `authProvider.yml` | 若代码使用 `useAuth` Hook，必须确保相应组件被 `AuthProvider` 包裹（开发中规则，`.rules/check.sh` 中做兼容性判断）。 |

### 5.5 类型检查

- 使用 `apps/web/tsconfig.check.json` 进行生产类型检查，注意：
  - **排除 `apps/web/src/components/ui/`**：该目录下的 shadcn/ui 组件不参与此检查。
  - **排除 `*.test.ts` / `*.spec.ts`**。
  - `strictNullChecks` 开启，`noEmit: true`。
- 桌面端与共享包各自使用 `tsc --noEmit` 进行类型检查。

### 5.6 Tailwind / CSS 约定

- 颜色优先使用 CSS 变量（`hsl(var(--primary))` 等），不要写死深色值。
- 玻璃拟态使用 `glass-l1` ~ `glass-l4` 工具类。
- 极光渐变按钮使用 `btn-aurora`。
- 浅色模式覆盖了大量 Tailwind 工具类（见 `apps/web/src/index.css` 底部 `html:not(.dark) ...`），新增自定义颜色时需同步检查浅色表现。
- 新增组件请对照 `DESIGN.md` 第 12 节“新增组件 checklist”。

### 5.7 HMR 与 Context 安全

- 为避免热更新时 Provider 短暂缺失导致白屏，`AppContext` 的 `useApp` 在 `import.meta.env.DEV` 下会返回一个 Proxy stub。
- 模块级 JSX 不要直接引用 Context，建议像 `routes.tsx` / `AppLayout.tsx` 一样用函数组件包装。

### 5.8 前后端数据约定

- 前端 `apps/web/src/services/electron.ts` 负责：
  - 封装所有 IPC 调用；
  - 将后端返回的时间戳（number）统一转换为 `Date`；
  - 将前端待发送的 `Date` 统一转换为时间戳（number）。
- 新增持久化数据流时，应优先在 `apps/web/src/services/electron.ts` 增加封装函数，在 `apps/desktop/src/api/ipc/` 增加 handler，在 `apps/desktop/src/db/queries/` 增加查询，必要时更新 `apps/desktop/src/db/schema.sql` 与 `migrations.ts`。

## 6. 测试策略

- **前端当前没有安装任何测试框架**，也没有单元测试、集成测试或 E2E 测试文件。
- **桌面端与共享包使用 Vitest**：
  - `apps/desktop/src/__tests__/pi-agent-driver.test.ts`
  - `packages/core/` 的 `test` 脚本为 `vitest run`
- 根 `package.json` 的 `test` 脚本：`pnpm --filter @owl-os/core --filter @owl-os/desktop test`
- `TODO.md` 的 P3 阶段提到计划引入 Playwright/Cypress 关键路径测试，但目前未实施。
- 现阶段的质量保障完全依赖：
  - TypeScript 类型检查（`tsgo` / `tsc --noEmit`）
  - Biome 静态检查
  - ast-grep 自定义规则
  - Vite 构建验证（`.rules/testBuild.sh`）
  - Tailwind CSS 编译检查
  - Vitest 单元测试（desktop / core）

## 7. 安全与敏感信息

- 项目根目录存在 `.env` 文件，用于存放敏感环境变量（如 `VITE_SENTRY_DSN` 等）。
- `.env` 已加入敏感文件保护，AI 代理无法直接读取。
- **不要**在代码中硬编码 API 密钥、数据库 URL、Sentry DSN 等敏感信息；应通过 `import.meta.env['VITE_*']` 读取。
- `AuthContext.tsx` 已改用 Electron IPC 本地认证服务（`apps/web/src/services/electron.ts`），未采用邮箱拼接约定。
- 用户密码在桌面端使用 `argon2` 哈希存储；API 密钥等敏感信息建议走 `apps/desktop/src/api/ipc/secrets.ts` 的 `get_secret` / `set_secret`。
- 桌面端文件系统操作（打开文件、Shell 执行）均已通过 IPC 暴露，前端不直接访问 Node.js API。

## 8. 当前已知问题（来自 `TODO.md`）

开始新功能前，建议先阅读 `TODO.md` 与 `docs/prd.md`。当前较关键的 P0 问题包括：

1. `AppContext` 默认进入 `squad` 模式并选中第一条会话，与 PRD 要求的“默认展示对话模块空状态”不符。
2. 模式自动切换链路不完整，缺少单聊 → 自动化的升级路径。
3. 业务数据已通过 Electron IPC 接入本地 SQLite，但部分模块仍读 mock；LLM 调用、文档解析、Shell 执行等能力仍需接入真实服务/模型。
4. Electron 二进制在某些容器环境可能异常（`require('electron')` 解析为 npm 包），需确保 `node_modules/electron/dist/electron` 为正确 Electron 二进制。
5. 工作流画布已接入持久化，但自动保存、JSON 导入/导出、历史版本、保存前静态校验等功能仍在 TODO 中。

完整清单与优先级排期请见 `TODO.md`。

## 9. 给其他 AI 代理的工作建议

- 修改前优先查看 `docs/prd.md` 与 `TODO.md`，确认功能是否属于“本期不实现”。
- 保持中文注释风格；新增 UI 文案优先走 `apps/web/src/lib/i18n.ts` 的 `useT`，但当前大量组件仍为硬编码中文，短期可保持现状。
- 新增依赖必须在 `package.json` 中声明，否则 Biome `noUndeclaredDependencies` 会报错。
- 新增 Button 必须满足可交互约束；新增 SelectItem 避免空字符串 value。
- 需要网络请求或持久化时，优先在 `apps/web/src/services/electron.ts` 下新建封装，在 `apps/desktop/src/api/ipc/` 下新建 handler，再逐步替换 `apps/web/src/data/mockData.ts` 的调用点。
- 所有缺陷修复必须按 `AGENTS.user.md` Rule 4 记录到 `docs/bugs/YYYY-MM-DD-<brief-description>.md`。
- 所有待办/遗留项必须按 `AGENTS.user.md` Rule 5 记录到 `TODO.md`。
- 提交前必须运行 `pnpm lint`（或等价的分步命令）并确保通过；同时应通过 `pnpm test` 与 `pnpm build`。
