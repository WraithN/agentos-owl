# 会话日志缺失 & Squad 团队仅显示 Boss Agent

## 现象

1. **会话日志没有记录**：在「安全与审计 → 会话日志」中，完成多轮对话后列表仍显示「暂无会话日志」，无法追踪用户消息、Agent 调用和工具调用。
2. **Squad 模式返回「专业团队」，但 Teammate 面板只有 boss 一个 Agent**：用户触发群聊/专业团队模式后，UI 提示已转交专业团队，但 Teammate 状态面板里只显示「组长：boss」，没有 sentinel/worker 成员，也没有工具调用痕迹。
3. 用户希望通过会话日志看到 **Elder Agent 正在 recruiting（组建团队）** 的证据，包括 `recruit` 工具调用。

## 根因

### 会话日志

- `AuditLogger` 提供了 `logMessageSent`、`logAgentInvokeStart`、`logToolCall`、`logAgentInvokeComplete` 等会话日志方法，但此前只在 `save_conversation` 时记录了 `conversation.create`。
- 主线程 WebSocket Owlery（实际运行路径）没有调用任何会话日志方法，导致用户消息、Agent 调用、工具调用全部丢失。
- Worker 内的 `SessionRuntime` 也没有向主线程暴露可被审计的事件。

### Squad 团队仅 boss

- 桌面端真实运行时走的是 `apps/desktop/src/owlery/Owlery.ts` + Worker `SessionRuntime`，而非 `packages/core` 中的 `Owlery`。
- `SessionRuntime.startChat` 之前 **完全忽略** `teammateMode`，只创建并运行 `elder` Agent。
- `AgentExecutor.handleChunk` 也只透传 `elder` 的 chunk，sentinel/worker 即使存在也不会被用户感知。
- 因此无论前端选择什么模式，后端都只有 boss 在运行，Teammate 面板自然只有 boss。

### 缺少 recruit 证据

- 组建团队的过程在 Worker 内部静默完成，没有产生 `tool_event` chunk，也不会被 `AuditLogger.logToolCall` 记录。

## 解决方案

### 1. Worker 运行时支持 Squad 模式（`apps/desktop/src/runtime/SessionRuntime.ts`）

- `runChat` 接收 `teammateMode`；当传入群聊模式时：
  1. 创建主 Sentinel（`supervisor`）并注册到 `AgentExecutor`/CrystalBall。
  2. 按固定组合创建 Worker（`planner` / `operator` / `cto`）并注册。
  3. 在老板 Agent 与主 Sentinel 之间建立 MessageBox 频道，为后续多轮协作预留通道。
  4. 先让 Elder 输出委派提示，再让主 Sentinel 实际执行任务（可调用文件/Shell 等工具）。
  5. 在组队完成后，主动向前端发送一次 `tool_event`，事件类型为 `tool_execution_end`，工具名 `recruit`，结果包含成员列表。
- 新增 `streamAgent` 统一处理单 Agent 的流式输出、CrystalBall 状态更新和错误处理。
- `forwardChunk` 现在同时透传 `elder` 与 `sentinel` 的输出，让前端能看到团队执行过程。
- `stop()` 改为中止当前正在运行的 Agent，并保留 `AgentExecutor.stopAllAgents()`。

### 2. 主线程会话日志（`apps/desktop/src/owlery/Owlery.ts`）

- `startChat` 中通过 `getAuditLogger()` 记录：
  - `logMessageSent`（用户发送消息）
  - `logAgentInvokeStart`（Boss Agent 开始调用）
- `bindSlot` 监听 `chunk`：
  - 对 `tool_event` 调用 `logToolCall`，提取 `toolName`、`startedAt`/`endedAt`/`durationMs`、`isError`。
- `bindSlot` 监听 `done`/`error`：
  - 分别调用 `logAgentInvokeComplete` / `logAgentInvokeFailed`，耗时按 `startTime` 计算。
- 增加 `SessionLogContext` 缓存，避免每次 chunk 都查库。
- 当数据库未初始化（测试环境）时，使用空实现 `AuditLogger` 兜底，不阻塞会话流程。

### 3. 验证结果

- `pnpm typecheck`：通过
- `pnpm test`：core 17 / desktop 11 全部通过
- `pnpm lint`：通过
- `pnpm build`：通过

## 影响文件

- `apps/desktop/src/runtime/SessionRuntime.ts`
- `apps/desktop/src/owlery/Owlery.ts`
