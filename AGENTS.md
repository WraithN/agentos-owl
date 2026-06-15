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
- **核心功能模块**（对应 `src/components/` 下目录）：
  - 对话模块（`chat`）
  - 群聊协作（`squad`）
  - 自动化执行日志（`automation`）
  - 知识库（`knowledge`）
  - 工具市场（`tools`）
  - 设置中心（`settings`）
  - 全局浮层/命令面板/通知中心（`global`）
- **当前状态**：
  - 当前为**纯前端 Mock 驱动**实现，业务数据主要来自 `src/data/mockData.ts`。
  - 后端/API 层尚未接入，`src/services/` 目录下留有 Tauri 本地认证相关服务。
  - 认证当前走 Tauri 本地服务（`src/services/tauri`），未接入 Supabase。

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
| 后端 SDK | @supabase/supabase-js（`2.103.1`） |

### 2.1 入口与路由

- **HTML 入口**：`index.html` → `/src/main.tsx`
- **应用根组件**：`src/App.tsx`
  - 使用 `BrowserRouter`，仅配置一条根路由 `/`，其余路径重定向到 `/`。
  - 全局挂载 `Toaster`（来自 `sonner`）。
- **实际布局渲染**：`src/components/layouts/AppLayout.tsx`
  - 内部提供 `AppProvider`，并通过 `moduleMap` 根据 `activeModule` 切换四大模块：`chat`、`knowledge`、`tools`、`settings`。
  - 所有模块 JSX 在组件内部定义，避免 HMR 时模块级 JSX 绕过 Provider 导致 Context 丢失。

### 2.2 设计系统（Aurora）

- 主题采用 **Aurora 设计系统**，以深空背景 + 极光渐变（`#00f2c3 → #38bdf8 → #7c3aed`）+ 玻璃拟态为视觉核心。
- 深色/浅色切换通过 `html.dark` class 实现（`tailwind.config.js` 中 `darkMode: ['class']`）。
- 主要变量与工具类定义在 `src/index.css`：
  - `glass-l1` ~ `glass-l4`：分层玻璃拟态
  - `aurora-text` / `aurora-border` / `btn-aurora`：极光渐变文字、边框、按钮
  - `badge-*` / `table-*`：状态徽章、表格高亮
  - `deep-space`：自动跟随主题的背景
- 主题色、强调色、字体大小等可在 `AppearanceSettings` 中调整，最终通过 `AppContext` 修改 CSS 变量与 `html` class。

## 3. 目录结构

```
.
├── .rules/                # ast-grep 自定义规则（见“代码规范”）
├── docs/
│   └── prd.md             # 产品需求文档（PRD）
├── public/                # 静态资源（favicon、图片）
├── src/
│   ├── App.tsx            # 路由与全局 Toast
│   ├── main.tsx           # React 根渲染 + Sentry 初始化
│   ├── routes.tsx         # 路由配置（当前仅根路由）
│   ├── index.css          # 全局样式、Aurora 设计系统
│   ├── components/
│   │   ├── agent/         # Agent 相关展示组件
│   │   ├── automation/    # 自动化执行日志
│   │   ├── chat/          # 对话模块：消息流、会话列表、输入区、升级提示
│   │   ├── common/        # 通用包装：PageMeta、RouteGuard、IntersectObserver
│   │   ├── global/        # 命令面板、通知中心
│   │   ├── knowledge/     # 知识库：列表、编辑、检索、上传、切片规则
│   │   ├── layouts/       # 侧边栏、顶部栏、AppLayout
│   │   ├── monitor/       # 运行监控面板
│   │   ├── settings/      # 设置中心各子页面
│   │   ├── squad/         # 群聊：团队面板、任务看板
│   │   ├── tools/         # 工具市场
│   │   └── ui/            # shadcn/ui 基础组件（Button、Dialog、Select 等）
│   ├── contexts/
│   │   ├── AppContext.tsx # 全局应用状态（主题、模块、会话、通知等）
│   │   └── AuthContext.tsx# 认证状态（当前未接入真实 Supabase 客户端）
│   ├── data/
│   │   └── mockData.ts    # 全部 Mock 数据
│   ├── hooks/             # 通用 Hooks
│   ├── lib/               # 工具函数、i18n、全局 UI 样式常量
│   ├── pages/             # 页面级组件（当前使用较少）
│   ├── services/          # 预留服务目录（当前为空）
│   └── types/
│       └── index.ts       # TypeScript 类型定义
├── components.json        # shadcn/ui 配置
├── package.json           # 依赖与脚本
├── pnpm-lock.yaml         # pnpm 锁文件
├── tailwind.config.js     # Tailwind 配置（含 Aurora 扩展）
├── postcss.config.js      # PostCSS 配置
├── tsconfig*.json         # TypeScript 工程引用配置
├── vite.config.ts         # Vite 配置（含 @ 别名、SVGR）
├── biome.json             # Biome 静态检查配置
├── sgconfig.yml           # ast-grep 配置
├── TODO.md                # 基于 PRD 的当前缺陷/待办清单
└── README.md              # 面向用户的说明文档
```

### 3.1 路径别名

- Vite 与 TypeScript 均配置 `@/` 指向 `./src/`。
- shadcn/ui 组件统一使用 `@/components/ui/*`、`@/lib/utils` 等别名导入。

## 4. 构建、验证与运行命令

> **重要**：`package.json` 中的 `dev` 与 `build` 脚本被显式替换为提示信息，**不要直接运行 `npm run dev` 或 `npm run build`**。项目采用 `lint` 脚本作为统一验证入口。

### 4.1 推荐验证命令

```bash
# 安装依赖（当前环境可能因 registry 问题失败，需留意）
pnpm install

# 统一检查入口
npm run lint
# 或
pnpm lint
```

`lint` 脚本实际执行的内容（来自 `package.json`）：

```bash
tsgo -p tsconfig.check.json;
npx biome lint;
.rules/check.sh;
npx tailwindcss -i ./src/index.css -o /dev/null 2>&1 | grep -E '^(CssSyntaxError|Error):.*' || true;
.rules/testBuild.sh
```

即依次执行：

1. `tsgo -p tsconfig.check.json`：基于 `tsconfig.check.json` 的类型检查（排除 `src/components/ui` 与测试文件）。
2. `npx biome lint`：使用 Biome 做 JS/TS/CSS 静态检查。
3. `.rules/check.sh`：调用 ast-grep 执行 `.rules/` 下的自定义规则扫描。
4. `npx tailwindcss ...`：编译 Tailwind CSS 到 `/dev/null`，仅捕获 `CssSyntaxError` / `Error`。
5. `.rules/testBuild.sh`：执行一次 Vite 生产构建验证（输出到 `/workspace/.dist`，`--minify false`）。

### 4.2 环境要求

- `README.md` 中声明：Node.js ≥ 20，pnpm ≥ 9。
- 当前环境实际检测到 Node.js `v26.1.0`、pnpm `11.0.9`。
- **注意**：`ast-grep` 未全局安装；执行 lint 前请确保 `pnpm install` 已成功。

### 4.3 开发服务器

> 目前没有可用的本地开发服务器脚本。若需启动，理论上应运行：
>
> ```bash
> npx vite --host 127.0.0.1
> ```
>
> 但请先确保依赖安装成功。

## 5. 代码规范与约束

### 5.1 语言与注释

- 项目主要使用**中文注释**与中文文案，变量/类型命名使用英文。
- 新添加的注释、错误提示、Toast 文案建议保持中文，以与现有代码风格一致。

### 5.2 Biome 规则（`biome.json`）

- Linter 启用，Formatter 禁用。
- 必须遵守的规则：
  - `correctness/noUndeclaredDependencies`：不能引用未在 `package.json` 中声明的依赖。
  - `suspicious/noRedeclare`：禁止重复声明。
  - `style/noCommonJs`：禁止 CommonJS（`tailwind.config.js` 已单独豁免）。
- 扫描范围：`src/**/*.{js,jsx,ts,tsx,css,scss}`、`tailwind.config.js`。

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

- 使用 `tsconfig.check.json` 进行生产类型检查，注意：
  - **排除 `src/components/ui/`**：该目录下的 shadcn/ui 组件不参与此检查。
  - **排除 `*.test.ts` / `*.spec.ts`**：项目当前没有测试文件。
  - `strictNullChecks` 开启，`noEmit: true`。

### 5.5 Tailwind / CSS 约定

- 颜色优先使用 CSS 变量（`hsl(var(--primary))` 等），不要写死深色值。
- 玻璃拟态使用 `glass-l1` ~ `glass-l4` 工具类。
- 极光渐变按钮使用 `btn-aurora`。
- 浅色模式覆盖了大量 Tailwind 工具类（见 `src/index.css` 底部 `html:not(.dark) ...`），新增自定义颜色时需同步检查浅色表现。

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
- 保持中文注释风格；新增 UI 文案优先走 `src/lib/i18n.ts` 的 `useT`，但当前大量组件仍为硬编码中文，短期可保持现状。
- 新增依赖必须在 `package.json` 中声明，否则 Biome `noUndeclaredDependencies` 会报错。
- 新增 Button 必须满足可交互约束；新增 SelectItem 避免空字符串 value。
- 需要网络请求时，优先在 `src/services/` 下新建模块，再逐步替换 `src/data/mockData.ts` 的调用点。
- 提交前必须运行 `npm run lint`（或等价的分步命令）并确保通过。
