# 消息未按智能体归类（agentOutputs 为空）

## Phenomenon

Agent 对话中，`WorkflowPanel` 无法按智能体拆分展示推理/工具/文本过程：

- 老板（Elder）卡片只显示状态标签，没有可展开的推理、工具调用或中间文本。
- 成员（Sentinel / Worker）卡片同样为空，所有运行过程都混在主 assistant 消息里，无法区分是哪个智能体产生的。
- 切换会话后，`agentOutputs` 无法从 buffer 重建，过程记录丢失。

## Root Cause

重构后的 `AgentOrchestrator` 在 `subscribeChannelEvents()` 中订阅 `SessionChannel` 的 `output` 事件时，只做了简单透传：

```ts
this.port.postEvent({ type: "chunk", chunk: content });
```

原始 `content`（`text_delta` / `reasoning_delta` / `tool_event` 等）直接进入主消息流，但没有再包装为 `agent_chunk`。前端 `useOwleryRuntime` 依赖 `agent_chunk` 的 `agentId` 字段把过程记录聚合到 `agentOutputs`，进而驱动 `WorkflowPanel` 的 `AgentCard`。缺少 `agent_chunk` 导致 `agentOutputs` 始终为空，智能体面板无法按智能体归类。

## Solution

修改 `apps/desktop/src/agent-orchestrator/session/orchestrator.ts` 的 `output` 事件处理器：

1. 继续转发原始 `content` chunk，保持主 assistant 消息流能正常显示最终文本、推理和工具结果。
2. 同时使用 `agentInfo`（`agentId` / `agentName` / `role` / `title`）把同一 chunk 包装为 `agent_chunk`，再发一次到前端。

```ts
this.port.postEvent({ type: "chunk", chunk: content });
const agentChunk: AgentDriverChunk = {
  type: "agent_chunk",
  agentId: agentInfo.agentId,
  agentName: agentInfo.agentName,
  agentTitle: agentInfo.title,
  role: agentInfo.role,
  chunk: content,
};
this.port.postEvent({ type: "chunk", chunk: agentChunk });
```

这样前端 `useOwleryRuntime` 既能用原始 chunk 更新主消息，也能用 `agent_chunk` 按 `agentId` 填充 `agentOutputs`，`WorkflowPanel` 中每个 `AgentCard` 都能正确展示对应智能体的推理、工具与文本过程。

## Verification

- `pnpm typecheck` 通过
- `pnpm lint` 通过
- `pnpm test` 通过（core 10 tests + desktop 90 tests）
- `pnpm build` 通过（@owl-os/web 与 @owl-os/desktop 均构建成功）
