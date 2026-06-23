# 工具调用状态不更新且文案重复

## Phenomenon

在“规划师团队”等 Agent 卡片展开的工具调用日志中：

1. 同一工具调用会渲染成两条记录：一条显示 **“执行中 进行中”**，另一条显示 **“执行报错 进行中”** 或 **“完成 进行中”**。
2. 工具实际已经执行完成或报错，但前一条记录的状态始终停留在“执行中”，看起来像是状态没有更新。
3. 工具调用卡片没有展示调用发生的时间点。

影响范围：所有使用 `AgentCard` 展示 Agent 工具调用日志的界面（`apps/web/src/components/chat/SingleAgentChat.tsx`）。

## Root Cause

1. **未合并 start / end 事件**：后端 `SessionRuntime.ts` 将 `tool_execution_start` 与 `tool_execution_end` 作为两个独立的 `tool_event` chunk 转发给前端。`AgentCard` 中直接把每个 chunk 转换成一个 `tool-call` part，导致同一 `toolCallId` 的事件被分开展示。
2. **文案重复**：`ToolCallCard` 同时渲染了 `getToolStatus()` 返回的状态文案（“执行中”）和 `formatToolDuration()` 在运行中返回的耗时文案（“进行中”），两者语义重叠，叠加显示为“执行中 进行中”。
3. **完成判断不够稳健**：原 `getToolStatus()` 仅以 `tool.result !== undefined` 判断完成。若 end 事件没有返回 result 但已设置 `endedAt`，状态仍会误判为“执行中”。
4. **缺少时间展示**：`ToolCallCard` 只展示耗时，没有展示调用开始时间。

## Solution

1. **合并同一工具调用的事件**：新增 `mergeToolEvents()` 函数，按 `toolCallId` 合并多个 `tool_event`，将 start 与 end 聚合成一条完整记录，并正确计算 `result`、`isError`、`endedAt`、`durationMs`。
2. **拆分工具调用辅助函数**：将工具调用相关的格式化、状态判断、事件合并逻辑抽到 `apps/web/src/components/chat/tool-call-utils.ts`，避免 `SingleAgentChat.tsx` 继续膨胀。
3. **修复状态文案**：`formatToolDuration()` 仅返回耗时，运行中返回 `null`，不再显示“进行中”；`getToolStatus()` 改为通过 `endedAt` / `result` / `isError` 综合判断完成状态。
4. **新增调用时间展示**：新增 `formatToolTime()`，在卡片头部展示工具调用的开始时间（如 `09:32:08`）。

### 验证结果

- `pnpm lint`：通过
- `pnpm typecheck`：通过
- `pnpm test`：通过（core 17 tests / desktop 12 tests）
- `pnpm build`（test build）：通过
