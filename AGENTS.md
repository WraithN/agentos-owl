# AGENTS.md — OwlOS v1.0

> 本文件面向 AI 编码代理。阅读前请先通读本文件，再修改代码。

## 0. 前置要求

**本文件与 `AGENTS.user.md` 共同构成 AI 编码代理的完整行为准则。**

- 每次开始工作前，必须先完整阅读本文件（`AGENTS.md`）。
- **随后必须读取 `AGENTS.user.md`**，将其中的规则作为本文件的补充与强化约束一并遵守。
- 若两条文件存在冲突，以 `AGENTS.user.md` 中的用户自定义规则为准，但不得违反本文件中明确标注不可覆盖的安全与合规要求。
- 修改代理指南时，禁止覆盖、删除或修改 `AGENTS.user.md` 中的 Rule 1–Rule 6。

## 1. 项目概述

- **项目名称**：在 `package.json` 中名为 `owl-os`，业务产品名为 **OwlOS v1.0**。
- **项目定位**：一个“意图驱动的 Agent 运行时系统”的前端应用。用户通过单一对话入口与系统交互，系统内置 Orchestrator 根据任务复杂度在三种模式间切换：
  - `single`：单聊模式
  - `squad`：群聊/多 Agent 协作模式
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
  - 当前为**纯前端 Mock 驱动**实现，业务数据主要来自 `apps/web/src/data/mockData.ts`。
  - 项目正在进行 **Tauri → Electron + Turborepo** 架构迁移：
    - 前端代码已迁入 `apps/web/`
    - Electron 主进程/预加载脚本在 `apps/desktop/src/`
    - Tauri Rust 后端代码暂存在 `apps/web/src-tauri/`，迁移完成后删除
  - 认证当前走 Tauri 本地服务（`apps/web/src/services/tauri.ts`），后续将迁移到 Electron IPC。

## 2. 技术栈与运行时架构

| 层级 | 技术 |
|------|------|
| 框架 | React 18（函数组件 + Hooks） |
| 语言 | TypeScript 5.9+，严格模式开启 |
| 构建工具 | Vite（实际使用 `rolldown-vite` 别名） |
| 包管理器 | pnpm（存在 `pnpm-lock.yaml`） |
| 样式 | Tailwind CSS 3.4 + PostCSS + Autoprefixer |
| UI 组件库 | shadcn/ui（`components.json` 配置，风格 `new-york`，图标库 `lucide`） |
| 动画 | Framer Motion / motion |
| 图表 | Recharts |
| 路由 | react-router / react-router-dom v7 |
| 状态管理 | React Context（`AppContext`、`AuthContext`） |
| 错误监控 | Sentry React（DSN 通过 `VITE_SENTRY_DSN` 环境变量注入） |
| 通知 Toast | sonner |
| 表单校验 | react-hook-form + zod + @hookform/resolvers |
| HTTP 客户端 | axios / ky（已声明依赖，当前代码中未实际接入） |
| 后端 SDK | @supabase/supabase-js（`2.103.1`），后续将移除 |
| 桌面运行时 | Electron 34 |
| 数据库 | better-sqlite3（迁移中） |
| Monorepo | Turborepo 2 + pnpm workspaces |

### 2.1 入口与路由

- **HTML 入口**：`apps/web/index.html` → `/apps/web/src/main.tsx`
- **应用根组件**：`apps/web/src/App.tsx`
  - 使用 `BrowserRouter`，仅配置一条根路由 `/`，其余路径重定向到 `/`。
  - 全局挂载 `Toaster`（来自 `sonner`）。
- **实际布局渲染**：`apps/web/src/components/layouts/AppLayout.tsx`
  - 内部提供 `AppProvider`，并通过 `moduleMap` 根据 `activeModule` 切换四大模块：`chat`、`knowledge`、`tools`、`settings`。
  - 所有模块 JSX 在组件内部定义，避免 HMR 时模块级 JSX 绕过 Provider 导致 Context 丢失。

### 2.2 设计系统（Aurora）

- 主题采用 **Aurora 设计系统**，以深空背景 + 极光渐变（`#00f2c3 → #38bdf8 → #7c3aed`）+ 玻璃拟态为视觉核心。
- 深色/浅色切换通过 `html.dark` class 实现（`apps/web/tailwind.config.js` 中 `darkMode: ['class']`）。
- 主要变量与工具类定义在 `apps/web/src/index.css`：
  - `glass-l1` ~ `glass-l4`：分层玻璃拟态
  - `aurora-text` / `aurora-border` / `btn-aurora`：极光渐变文字、边框、按钮
  - `badge-*` / `table-*`：状态徽章、表格高亮
  - `deep-space`：自动跟随主题的背景
- 主题色、强调色、字体大小等可在 `AppearanceSettings` 中调整，最终通过 `AppContext` 修改 CSS 变量与 `html` class。

## 3. 目录结构

```
.
├── .rules/                # ast-grep 自定义规则（见“代码规范”）
├── apps/
│   ├── desktop/           # Electron 桌面应用
│   │   ├── src/
│   │   │   ├── main.ts    # 主进程入口
│   │   │   ├── preload.ts # 预加载脚本（暴露 electron API）
│   │   │   └── renderer/  # 生产环境 renderer 入口 HTML
│   │   ├── scripts/       # 开发/构建辅助脚本
│   │   ├── vite.*.config.ts # 主进程/预加载/renderer 构建配置
│   │   └── package.json
│   └── web/               # 前端 React 应用（原根目录内容）
│       ├── index.html
│       ├── src/           # React 源码、组件、样式、服务
│       ├── public/        # 静态资源
│       ├── src-tauri/     # Tauri Rust 后端（迁移中，完成后删除）
│       ├── components.json
│       ├── tailwind.config.js
│       ├── postcss.config.js
│       ├── vite.config.ts
│       ├── tsconfig*.json
│       └── package.json
├── docs/
│   └── prd.md             # 产品需求文档（PRD）
├── packages/              # 预留共享包目录（当前为空）
├── turbo.json             # Turborepo 流水线配置
├── pnpm-workspace.yaml    # pnpm workspace 配置
├── biome.json             # Biome 静态检查配置（根目录共享）
├── package.json           # monorepo 根依赖与脚本
├── pnpm-lock.yaml         # pnpm 锁文件
├── TODO.md                # 基于 PRD 的当前缺陷/待办清单
└── README.md              # 面向用户的说明文档
```

### 3.1 路径别名

- Vite 与 TypeScript 均配置 `@/` 指向 `./apps/web/src/`（在 `apps/web` 包内）。
- shadcn/ui 组件统一使用 `@/components/ui/*`、`@/lib/utils` 等别名导入。

## 4. 构建、验证与运行命令

> **重要**：根 `package.json` 的 `dev`/`build`/`lint` 通过 Turborepo 调用各 app 脚本。`apps/web` 仍保留原有 `lint` 脚本作为统一验证入口。

### 4.1 推荐验证命令

```bash
# 安装依赖
pnpm install

# 启动 Electron 桌面开发环境（同时启动 web dev server 与 Electron）
pnpm --filter @owl-os/desktop dev

# 仅启动前端 web dev server
pnpm --filter @owl-os/web dev

# 统一检查入口（Turborepo 会调用 apps/web 的 lint）
pnpm lint
```

`apps/web` 的 `lint` 脚本实际执行的内容：

```bash
tsgo -p tsconfig.check.json;
(cd ../.. && pnpm --filter @owl-os/web exec biome lint);
../../.rules/check.sh;
npx tailwindcss -i ./apps/web/src/index.css -o /dev/null 2>&1 | grep -E '^(CssSyntaxError|Error):.*' || true;
../../.rules/testBuild.sh
```

### 4.2 环境要求

- `README.md` 中声明：Node.js ≥ 20，pnpm ≥ 9。
- 当前环境实际检测到 Node.js `v26.1.0`、pnpm `11.0.9`。
- **注意**：`ast-grep` 未全局安装；执行 lint 前请确保 `pnpm install` 已成功。

### 4.3 开发服务器

- `pnpm --filter @owl-os/web dev`：启动 Vite dev server（端口 5173）。
- `pnpm --filter @owl-os/desktop dev`：启动完整桌面开发环境（web dev server + Electron）。

## 5. 代码规范与约束

### 5.1 语言与注释

- 项目主要使用**中文注释**与中文文案，变量/类型命名使用英文。
- 新添加的注释、错误提示、Toast 文案建议保持中文，以与现有代码风格一致。

### 5.2 Biome 规则（`biome.json`）

- Linter 启用，Formatter 禁用。
- 必须遵守的规则：
  - `correctness/noUndeclaredDependencies`：不能引用未在 `package.json` 中声明的依赖。
  - `suspicious/noRedeclare`：禁止重复声明。
  - `style/noCommonJs`：禁止 CommonJS（`apps/web/tailwind.config.js` 已单独豁免）。
- 扫描范围：`apps/web/src/**/*.{js,jsx,ts,tsx,css,scss}`、`apps/web/tailwind.config.js`。

### 5.3 ast-grep 自定义规则（`.rules/`）

项目通过 `sgconfig.yml` 加载 `.rules/` 目录，`.rules/check.sh` 会逐个执行以下规则。新增代码应主动避免触发这些规则：

| 规则文件 | 约束说明 |
|----------|----------|
| `SelectItem.yml` | `SelectItem` 的 `value` 不能是空字符串 `''`；如需“全选”请用 `'all'`。 |
| `contrast.yml` | 检查 Button 的前景/背景对比度：outline 按钮不要配 `text-foreground`；default 按钮不要配 `text-primary`；outline 按钮不要配 `text-white/gray-*`。 |
| `require-button-interaction.yml` | `<Button>` 必须可交互：必须提供 `onClick`、`type="submit"`、`type="reset"`、`asChild`，或位于 `*Trigger` / `<Link>` / `<a>` 内部。 |
| `slot-nesting.yml` | 禁止 Radix UI 的 `*Trigger asChild` 内直接包裹 `FormControl`（双层 Slot 会导致 ref 与点击事件丢失）。 |
| `toast-hook.yml` | 禁止使用 `@/hooks/use-toast`，统一使用 `import { toast } from "sonner"`。 |
| `supabase-edge-function-get-body.yml` | `supabase.functions.invoke` 使用 `method: 'GET'` 时不能带 `body`，参数应拼接到 URL 中。 |

### 5.4 类型检查

- 使用 `apps/web/tsconfig.check.json` 进行生产类型检查，注意：
  - **排除 `apps/web/src/components/ui/`**：该目录下的 shadcn/ui 组件不参与此检查。
  - **排除 `*.test.ts` / `*.spec.ts`**：项目当前没有测试文件。
  - `strictNullChecks` 开启，`noEmit: true`。

### 5.5 Tailwind / CSS 约定

- 颜色优先使用 CSS 变量（`hsl(var(--primary))` 等），不要写死深色值。
- 玻璃拟态使用 `glass-l1` ~ `glass-l4` 工具类。
- 极光渐变按钮使用 `btn-aurora`。
- 浅色模式覆盖了大量 Tailwind 工具类（见 `apps/web/src/index.css` 底部 `html:not(.dark) ...`），新增自定义颜色时需同步检查浅色表现。

### 5.6 HMR 与 Context 安全

- 为避免热更新时 Provider 短暂缺失导致白屏，`AppContext` 的 `useApp` 在 `import.meta.env.DEV` 下会返回一个 Proxy stub。
- 模块级 JSX 不要直接引用 Context，建议像 `routes.tsx` / `AppLayout.tsx` 一样用函数组件包装。

## 6. 测试策略

- **当前项目没有安装任何测试框架**，也没有单元测试、集成测试或 E2E 测试文件。
- `TODO.md` 的 P3 阶段提到计划引入 Playwright/Cypress 关键路径测试，但目前未实施。
- 现阶段的质量保障完全依赖：
  - TypeScript 类型检查（`tsgo`）
  - Biome 静态检查
  - ast-grep 自定义规则
  - Vite 构建验证（`.rules/testBuild.sh`）
  - Tailwind CSS 编译检查

## 7. 安全与敏感信息

- 项目根目录存在 `.env` 文件，用于存放敏感环境变量（如 `VITE_SENTRY_DSN` 等）。
- `.env` 已加入敏感文件保护，AI 代理无法直接读取。
- **不要**在代码中硬编码 API 密钥、数据库 URL、Sentry DSN 等敏感信息；应通过 `import.meta.env['VITE_*']` 读取。
- `AuthContext.tsx` 当前使用 Tauri 本地认证服务，未采用邮箱拼接约定。

## 8. 当前已知问题（来自 `TODO.md`）

开始新功能前，建议先阅读 `TODO.md` 与 `docs/prd.md`。当前较关键的 P0 问题包括：

1. `AppContext` 默认进入 `squad` 模式并选中第一条会话，与 PRD 要求的“默认展示对话模块空状态”不符。
2. 模式自动切换链路不完整，缺少单聊 → 自动化的升级路径。
3. 所有业务数据为 Mock，真实后端/API 层待接入。

## 9. 给其他 AI 代理的工作建议

- 修改前优先查看 `docs/prd.md` 与 `TODO.md`，确认功能是否属于“本期不实现”。
- 保持中文注释风格；新增 UI 文案优先走 `apps/web/src/lib/i18n.ts` 的 `useT`，但当前大量组件仍为硬编码中文，短期可保持现状。
- 新增依赖必须在 `package.json` 中声明，否则 Biome `noUndeclaredDependencies` 会报错。
- 新增 Button 必须满足可交互约束；新增 SelectItem 避免空字符串 value。
- 需要网络请求时，优先在 `apps/web/src/services/` 下新建模块，再逐步替换 `apps/web/src/data/mockData.ts` 的调用点。
- 提交前必须运行 `npm run lint`（或等价的分步命令）并确保通过。
