# 后端目录结构整理设计文档

## 背景与目标

`apps/desktop/src` 目前存在以下目录组织问题：

- 内部工具/utility 代码散落在 `ipc/_utils.ts`、`ipc/_errors.ts`、`db/queries/_json.ts`、`db/seed/utils.ts`、`crypto.ts`、`secure.ts` 等各处，没有统一入口。
- `agent/` 目录名过于笼统，内部既包含 Agent 构造/工厂，也包含 LLM 配置、Driver、工具、Workspace 等与「Agent 运行时」相关的内容。
- `runtime/` 与 `owlery/` 分别位于不同目录，但本质上都属于「编排层」：前者是 Worker 内会话编排，后者是主进程会话槽与传输编排。
- `eventbus/` 只被编排层使用，却独立在顶层。

本次重构的目标是**只搬文件、不改接口签名**，把后端代码按职责归入三个清晰的顶层目录：

1. `utils/` — 程序内部工具
2. `agent-runtime/` — Agent 构造与运行依赖
3. `agent-orchestrator/` — Agent 会话编排（Worker 内 + 主进程）

## 约束

- 不修改任何类/函数/类型的签名与行为。
- 仅更新 import 路径、目录名、文件名映射。
- 每阶段完成后必须执行 `pnpm lint`、`pnpm test`、`pnpm build`。
- 删除被迁移替代的旧文件，避免重复实现残留。

## 目标目录结构

```
apps/desktop/src/
├── utils/                          # 程序内部工具
│   ├── crypto/
│   │   ├── password.ts             # 原 crypto.ts：argon2 hash/verify
│   │   └── secrets.ts              # 原 secure.ts：safeStorage 加解密、secret 读写
│   ├── id.ts                       # 原 ipc/_utils.ts: uuid()
│   ├── time.ts                     # 原 ipc/_utils.ts: nowMs() + 原 db/seed/utils.ts: now()/daysAgo()
│   ├── json.ts                     # 原 db/queries/_json.ts: toJson/fromJson
│   └── errors.ts                   # 原 ipc/_errors.ts: IpcError / toErrorPayload
├── agent-runtime/                  # 原 agent/ 整体迁入
│   ├── agent.ts                    # Agent 底层构造（createPlainAgent / createPlainAgentWithConfig）
│   ├── agentNames.ts               # 多语言随机 Agent 名、会话级缓存与持久化回调
│   ├── llmConfig.ts                # 从 settings 读取默认 LLM 配置
│   ├── owleryAgentFactory.ts       # AgentFactory 组装
│   ├── owleryRuntime.ts            # IPC 回退用的 Owlery 单例
│   ├── tools.ts                    # Worker 与 Planner 工具注册
│   ├── workspacePath.ts            # Agent workspace 路径解析与越界检查
│   └── drivers/
│       └── pi/
│           ├── PiAgentDriver.ts
│           └── AsyncQueue.ts
├── agent-orchestrator/             # 原 runtime/ + owlery/ + eventbus/ 整体迁入
│   ├── SessionRuntime.ts           # Worker 内会话编排核心
│   ├── AgentExecutor.ts            # 基于 MessageBox 的 Agent 消息循环执行器
│   ├── PlannerPipeline.ts          # Planner 顺序流水线
│   ├── plannerPrompts.ts           # Planner / Elder 各阶段 prompt 模板
│   ├── SessionThreadEntry.ts       # Worker 入口
│   ├── types.ts                    # Worker 内 RuntimePort 类型
│   ├── Owlery.ts                   # 主进程 WebSocket 编排器
│   ├── SessionSlot.ts              # Worker 线程包装与会话槽
│   └── eventbus/
│       ├── EventBus.ts             # session 级别事件总线
│       ├── SlotPortAdapter.ts      # SessionSlot → SessionRuntimePort 适配
│       └── types.ts                # ControlCommand / SessionRuntimeEvent / SessionRuntimePort
├── db/...
├── ipc/...
├── websocket/...                   # 保持现状（传输层，被 Owlery 引用）
└── services/...                    # 保持现状
```

## 文件迁移映射表

| 原路径 | 新路径 | 说明 |
|---|---|---|
| `apps/desktop/src/crypto.ts` | `apps/desktop/src/utils/crypto/password.ts` | 密码哈希 |
| `apps/desktop/src/secure.ts` | `apps/desktop/src/utils/crypto/secrets.ts` | 安全存储 |
| `apps/desktop/src/ipc/_utils.ts` | 删除 | `uuid()` → `utils/id.ts`，`nowMs()` → `utils/time.ts` |
| `apps/desktop/src/db/seed/utils.ts` | 删除 | `now()` / `daysAgo()` → `utils/time.ts`；`argonHash()` → `utils/crypto/password.ts` |
| `apps/desktop/src/db/queries/_json.ts` | `apps/desktop/src/utils/json.ts` | JSON 序列化工具 |
| `apps/desktop/src/ipc/_errors.ts` | `apps/desktop/src/utils/errors.ts` | IPC 错误类型 |
| `apps/desktop/src/agent/*` | `apps/desktop/src/agent-runtime/*` | 整体目录重命名 |
| `apps/desktop/src/runtime/*` | `apps/desktop/src/agent-orchestrator/*` | 整体目录重命名 |
| `apps/desktop/src/owlery/*` | `apps/desktop/src/agent-orchestrator/*` | 并入编排层根目录 |
| `apps/desktop/src/eventbus/*` | `apps/desktop/src/agent-orchestrator/eventbus/*` | 并入编排层子目录 |

## 实施阶段

### Phase 1：utils 整理

1. 新建 `utils/crypto/`、`utils/`。
2. 迁移并改名：`crypto.ts` → `utils/crypto/password.ts`，`secure.ts` → `utils/crypto/secrets.ts`。
3. 新建 `utils/id.ts`（`uuid()`）、`utils/time.ts`（`nowMs()`、`now()`、`daysAgo()`）。
4. 迁移 `db/queries/_json.ts` → `utils/json.ts`。
5. 迁移 `ipc/_errors.ts` → `utils/errors.ts`。
6. 删除 `ipc/_utils.ts`；更新所有 `ipc/*.ts` 的 import。
7. 删除 `db/seed/utils.ts`；更新 `db/seed/*.ts` 的 import。
8. 更新所有引用 `db/queries/_json` 的文件为 `utils/json`。
9. 验证 `pnpm lint`、`pnpm test`、`pnpm build`。

### Phase 2：agent → agent-runtime

1. 将 `agent/` 整体复制/重命名为 `agent-runtime/`。
2. 更新 `agent-runtime/` 内部所有相对 import（因目录名已变，部分路径不变）。
3. 更新所有外部引用 `../agent/` 或 `./agent/` 的文件：
   - `agent-orchestrator/SessionRuntime.ts`
   - `agent-orchestrator/SessionThreadEntry.ts`
   - `agent-orchestrator/Owlery.ts`
   - `agent-orchestrator/SessionSlot.ts`
   - `agent-orchestrator/eventbus/*`
   - `ipc/owlery.ts`
   - `ipc/secrets.ts`
   - `ipc/apiKeys.ts`
   - `ipc/webhooks.ts`
   - `agent/owleryRuntime.ts` 迁移后自身路径变化
4. 验证 `pnpm lint`、`pnpm test`、`pnpm build`。

### Phase 3：runtime + owlery + eventbus → agent-orchestrator

1. 将 `runtime/` 整体复制/重命名为 `agent-orchestrator/`。
2. 将 `owlery/` 下文件并入 `agent-orchestrator/`（与 `runtime/` 迁来的文件同层）。
3. 将 `eventbus/` 整体迁入 `agent-orchestrator/eventbus/`。
4. 更新 `agent-orchestrator/` 内部相对 import：
   - `Owlery.ts` 引用 `SessionSlot` 改为同级 `./SessionSlot.js`。
   - `SessionSlot.ts` 引用 `eventbus/types.js` 改为 `./eventbus/types.js`。
   - `eventbus/SlotPortAdapter.ts` 引用 `SessionSlot` 改为 `../SessionSlot.js`。
5. 更新所有外部引用 `../runtime/`、`../owlery/`、`../eventbus/` 的文件：
   - `agent-runtime/owleryAgentFactory.ts`（若引用 runtime？一般不引用）
   - `main.ts`
   - `ipc/owlery.ts`
   - `ipc/teammateStatus.ts`
   - `agent-runtime/owleryRuntime.ts`
6. 验证 `pnpm lint`、`pnpm test`、`pnpm build`。

## 风险与回退

- 风险：大量 import 路径更新可能遗漏，导致构建或运行失败。  
  缓解：每阶段单独验证，利用 TypeScript / Biome / 构建脚本快速发现未更新路径。
- 风险：目录移动后 git 历史断裂（显示为删除+新增）。  
  缓解：本次重构本就预期为目录整理，保留提交信息即可；不追求 `git mv` 连续历史。
- 风险：外部文件（如 `@owl-os/core`）引用 desktop 内部模块？  
  缓解：`@owl-os/core` 不依赖 desktop，无影响。

## 验证标准

每阶段必须满足：

1. `pnpm --filter @owl-os/desktop typecheck` 通过。
2. `pnpm test`（core 17 + desktop 47）全部通过。
3. `pnpm lint` 通过。
4. `pnpm build` 通过。

## 后续可选（不在本次范围）

- 在 `agent-orchestrator/` 内进一步拆分 `SessionRuntime.ts`（>600 行）。
- 将 `Owlery.ts` 中的传输、会话管理、发布者等职责抽出独立模块。
- 统一 `@owl-os/core` 与 desktop 的 Owlery 实现。
- 下沉通用 `uuid()` / `now()` / `toJson()` 到 `@owl-os/core`。

本次设计只处理**目录结构整理**。

## Stage 2：按用户要求继续细化

### 新增目标

1. Agent 名字词表独立为 JSON，便于后续扩展更多语言。
2. `agent-runtime/tools.ts` 拆分为 `agent-runtime/tools/` 子目录，招募工具独立。
3. `ipc/` 与 `websocket/` 统一迁入 `api/` 包。
4. `agent-orchestrator/` 下新建 `session/` 子目录，去掉 `Session` 文件名前缀。
5. Message Channel 单独抽出被用户明确忽略，不在本次处理。

### 目标目录结构（Stage 2 之后）

```
apps/desktop/src/
├── utils/                          # 程序内部工具
├── agent-runtime/                  # Agent 构造与运行依赖
│   ├── agent.ts
│   ├── agentNames.ts               # 读取 data/agent-names.json
│   ├── data/
│   │   └── agent-names.json        # 中/英/日/韩名字词表
│   ├── llmConfig.ts
│   ├── owleryAgentFactory.ts       # 从 tools/ 导入招募工具
│   ├── owleryRuntime.ts
│   ├── tools/                      # 工具目录化
│   │   ├── index.ts                # 对外暴露 buildTools / buildPlannerTools / 招募工具
│   │   ├── file.ts                 # read_file / list_directory / create_x_file
│   │   ├── shell.ts                # execute_command
│   │   ├── planner.ts              # dispatch_task / validate_output / submit_to_elder
│   │   ├── recruitment.ts          # recruit_sentinel / recruit_workers
│   │   └── utils.ts                # textResult 共享 helper
│   ├── workspacePath.ts
│   └── drivers/
│       └── pi/
│           ├── PiAgentDriver.ts
│           └── AsyncQueue.ts
├── agent-orchestrator/             # 编排层
│   ├── AgentExecutor.ts
│   ├── PlannerPipeline.ts
│   ├── plannerPrompts.ts
│   ├── types.ts
│   ├── Owlery.ts
│   ├── session/                    # 会话运行时子目录
│   │   ├── runtime.ts              # 原 SessionRuntime.ts
│   │   ├── slot.ts                 # 原 SessionSlot.ts
│   │   └── thread-entry.ts         # 原 SessionThreadEntry.ts
│   └── eventbus/
│       ├── EventBus.ts
│       ├── SlotPortAdapter.ts
│       └── types.ts
├── api/                            # IPC + WebSocket 统一入口
│   ├── ipc/
│   │   ├── index.ts
│   │   ├── auth.ts
│   │   ├── conversations.ts
│   │   ├── messages.ts
│   │   ├── owlery.ts
│   │   ├── settings.ts
│   │   ├── shell.ts
│   │   ├── tasks.ts
│   │   ├── teammateStatus.ts
│   │   ├── teams.ts
│   │   ├── workflows.ts
│   │   └── ...
│   └── websocket/
│       ├── WebSocketServer.ts
│       ├── sessionStream.ts
│       └── statusStream.ts
├── db/...
├── services/...
└── main.ts
```

### 文件迁移映射表（Stage 2）

| 原路径 | 新路径 | 说明 |
|---|---|---|
| `agent-runtime/tools.ts` | 删除 | 拆分为 `agent-runtime/tools/` 下多个文件 |
| `agent-runtime/owleryAgentFactory.ts` 中 `buildRecruitSentinelTool` / `buildRecruitWorkersTool` | `agent-runtime/tools/recruitment.ts` | 招募工具独立 |
| `agent-runtime/agentNames.ts` 中硬编码名字表 | `agent-runtime/data/agent-names.json` | JSON 化词表 |
| `apps/desktop/src/ipc/*` | `apps/desktop/src/api/ipc/*` | IPC 迁入 api 包 |
| `apps/desktop/src/websocket/*` | `apps/desktop/src/api/websocket/*` | WebSocket 迁入 api 包 |
| `agent-orchestrator/SessionRuntime.ts` | `agent-orchestrator/session/runtime.ts` | 类名保留 `SessionRuntime` |
| `agent-orchestrator/SessionSlot.ts` | `agent-orchestrator/session/slot.ts` | 类名保留 `SessionSlot` |
| `agent-orchestrator/SessionThreadEntry.ts` | `agent-orchestrator/session/thread-entry.ts` | 类名保留 `SessionThreadEntry` |

### 实施阶段（Stage 2）

1. 创建 `agent-runtime/data/agent-names.json`，迁移中/英/日/韩名字表。
2. 修改 `agent-runtime/agentNames.ts`，通过 JSON import 读取词表；保持对外接口不变。
3. 创建 `agent-runtime/tools/` 目录与相关文件；更新 `agent-runtime/agent.ts`、`agent-runtime/owleryAgentFactory.ts` 的 import。
4. 删除 `agent-runtime/tools.ts`。
5. 创建 `api/` 目录，将 `ipc/` 与 `websocket/` 移入；修正 `api/ipc/*.ts` 中指向 `../db`、`../utils`、`../agent-runtime`、`../services`、`../config` 的相对路径。
6. 更新 `main.ts`、`agent-orchestrator/Owlery.ts` 对 ipc/websocket 的引用。
7. 在 `agent-orchestrator/` 下新建 `session/`，迁移并重命名三个 Session 文件；更新内部 import 与所有外部引用。
8. 更新 `vite.main.config.ts` 的 worker entry 路径与 `Owlery.ts` 的默认线程入口路径。
9. 验证 `pnpm lint`、`pnpm test`、`pnpm build`。

### 验证结果

- `pnpm lint`：通过。
- `pnpm test`：core 17 + desktop 47 全部通过。
- `pnpm build`：通过，worker 产物输出到 `dist/main/agent-orchestrator/session/thread-entry.cjs`。

## Stage 3：系统提示词目录迁入 apps/desktop

### 目标

`prompt/` 下的系统提示词文件只被 `apps/desktop/src/agent-runtime/agent.ts` 使用，属于桌面端运行时资源，因此从仓库根目录迁入 `apps/desktop/prompt/`。

### 变更

| 原路径 | 新路径 | 说明 |
|---|---|---|
| `prompt/*.md` | `apps/desktop/prompt/*.md` | 系统提示词整体迁移 |
| `apps/desktop/src/agent-runtime/agent.ts` 中 `resolvePromptPath` | 更新候选路径 | 开发/源码态指向 `apps/desktop/prompt/`，打包态指向 `dist/prompt/` |
| `apps/desktop/vite.main.config.ts` | 新增 static copy | 构建时将 `apps/desktop/prompt/` 复制到 `dist/prompt/` |
| `docs/` 中相关路径引用 | 统一改为 `apps/desktop/prompt/...` | 保持历史文档路径准确 |

### 验证结果

- `pnpm lint`：通过。
- `pnpm test`：core 17 + desktop 47 全部通过。
- `pnpm build`：通过，产物 `dist/prompt/` 下包含所有 `.md` 提示词文件。

## Stage 4：统一 `apps/desktop/src` 文件命名为 kebab-case

### 目标

消除 `apps/desktop/src` 下 CamelCase / PascalCase / 小写混用的文件命名，统一为**小写 + 短横线（kebab-case）**。类名与类型名仍保持 PascalCase，但文件名与导出内容解耦。

### 命名规则（已写入 `AGENTS.md`）

- `apps/desktop/src` 下所有 `.ts` 源文件、测试文件及子目录统一使用 kebab-case。
- 例如：`agent-executor.ts`、`api-keys.ts`、`session-stream.ts`、`web-socket-server.ts`、`owlery-integration.test.ts`。
- 特例：`agent-orchestrator/session/thread-entry.ts` 重命名为 `thread-worker.ts`，更准确地表达其 Worker 线程入口职责。

### 主要重命名

| 原文件名 | 新文件名 |
|---|---|
| `AgentExecutor.ts` | `agent-executor.ts` |
| `PlannerPipeline.ts` | `planner-pipeline.ts` |
| `Owlery.ts` | `owlery.ts` |
| `plannerPrompts.ts` | `planner-prompts.ts` |
| `eventbus/EventBus.ts` | `eventbus/event-bus.ts` |
| `eventbus/SlotPortAdapter.ts` | `eventbus/slot-port-adapter.ts` |
| `agent-runtime/agentNames.ts` | `agent-runtime/agent-names.ts` |
| `agent-runtime/llmConfig.ts` | `agent-runtime/llm-config.ts` |
| `agent-runtime/owleryAgentFactory.ts` | `agent-runtime/owlery-agent-factory.ts` |
| `agent-runtime/owleryRuntime.ts` | `agent-runtime/owlery-runtime.ts` |
| `agent-runtime/workspacePath.ts` | `agent-runtime/workspace-path.ts` |
| `agent-runtime/drivers/PiAgentDriver.ts` | `agent-runtime/drivers/pi-agent-driver.ts` |
| `agent-runtime/drivers/AsyncQueue.ts` | `agent-runtime/drivers/async-queue.ts` |
| `api/ipc/apiKeys.ts` | `api/ipc/api-keys.ts` |
| `api/ipc/auditLogs.ts` | `api/ipc/audit-logs.ts` |
| `api/ipc/filePreview.ts` | `api/ipc/file-preview.ts` |
| `api/ipc/htmlPreview.ts` | `api/ipc/html-preview.ts` |
| `api/ipc/marketTools.ts` | `api/ipc/market-tools.ts` |
| `api/ipc/teammateStatus.ts` | `api/ipc/teammate-status.ts` |
| `api/ipc/parseDocument.ts` | `api/ipc/parse-document.ts` |
| `api/websocket/WebSocketServer.ts` | `api/websocket/web-socket-server.ts` |
| `api/websocket/sessionStream.ts` | `api/websocket/session-stream.ts` |
| `api/websocket/statusStream.ts` | `api/websocket/status-stream.ts` |
| `config/filePreview.ts` | `config/file-preview.ts` |
| `config/htmlPreview.ts` | `config/html-preview.ts` |
| `db/queries/apiKeys.ts` | `db/queries/api-keys.ts` |
| `db/queries/auditLogs.ts` | `db/queries/audit-logs.ts` |
| `db/queries/marketTools.ts` | `db/queries/market-tools.ts` |
| `db/queries/toolCategories.ts` | `db/queries/tool-categories.ts` |
| `db/seed/auditLogs.ts` | `db/seed/audit-logs.ts` |
| `db/seed/marketTools.ts` | `db/seed/market-tools.ts` |
| `services/AuditLogger.ts` | `services/audit-logger.ts` |
| `services/ConversationDetailStore.ts` | `services/conversation-detail-store.ts` |
| `agent-orchestrator/session/thread-entry.ts` | `agent-orchestrator/session/thread-worker.ts` |

### 同步更新

- 所有相对 import 路径统一更新为新文件名。
- `vite.main.config.ts` 的 worker entry key 与路径更新为 `agent-orchestrator/session/thread-worker`。
- `agent-orchestrator/owlery.ts` 默认线程入口路径更新为 `agent-orchestrator/session/thread-worker.cjs`。
- `AGENTS.md` 第 5.2 节新增 kebab-case 命名规则，目录树与 IPC 路径引用同步修正为 `api/ipc/`。

### 验证结果

- `pnpm lint`：通过。
- `pnpm test`：core 17 + desktop 47 全部通过。
- `pnpm build`：通过，worker 产物输出到 `dist/main/agent-orchestrator/session/thread-worker.cjs`。
