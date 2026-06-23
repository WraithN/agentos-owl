# 切换对话后 Agent 卡片与工具调用丢失

## Phenomenon

切换对话窗口后，原本正在生成或已生成的 Agent 团队卡片、工具调用过程全部消失，只能看到最终文本消息。

## Root Cause

`useOwleryRuntime.ts` 仅恢复了 `messages`（消息列表），没有恢复 `agentOutputs`：

1. **已完成的会话**：`agentOutputs` 从未被持久化到数据库，切换回来后状态为空。
2. **运行中的会话**：虽然通过 `getOwleryBufferedOutput` 恢复了 running 的 assistant 消息内容，但没有从 buffer 中的 `agent_chunk` / `status_card` 重建 `agentOutputs`。

`WorkflowPanel` 组件依赖 `agentOutputs` 渲染老板/成员卡片，因此切换后卡片丢失。

## Solution

1. **持久化 agentOutputs**：在 `done` 和 `error` 分支保存 assistant 消息时，把 `agentOutputsRef.current` 一并写入 `meta.agentOutputs`。
2. **新增 ref 跟踪**：新增 `agentOutputsRef`，在每次 `setAgentOutputs` 的 updater 中同步更新，确保保存时拿到最新值。
3. **已完成会话恢复**：初始化时从最后一条 `type === 'agent'` 的消息的 `meta.agentOutputs` 恢复状态。
4. **运行中会话恢复**：新增 `buildAgentOutputsFromChunks()`，从 `getOwleryBufferedOutput` 返回的 `agent_chunk` / `status_card` chunk 重建 `agentOutputs`。
5. **类型扩展**：`apps/web/src/types/index.ts` 的 `Message.meta` 增加 `agentOutputs?: unknown` 与索引签名，允许写入自定义持久化字段。

### 验证结果

- `pnpm lint` ✅
- `pnpm typecheck` ✅
- `pnpm test` ✅（core 17 tests / desktop 12 tests）
