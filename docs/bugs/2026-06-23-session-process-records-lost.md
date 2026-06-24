# 新提问后上一次对话的过程记录丢失

## Phenomenon

在一个问题生成完成后，用户向上滚动仍能看到上一条助手消息。但当用户发送新问题时，上一条助手消息里的「任务流水线与轮次」「执行团队」等 Agent 过程记录全部消失，只剩下纯文本回复。

## Root Cause

1. `useOwleryRuntime.ts` 只在持久化时把 `agentOutputs` / `tasks` / `rounds` 写入 `saveMessage` 的 `meta`，没有同步写回内存中的 `messages` 状态。
2. `AgentChat.tsx` 的 `MessageContent` 只给 `lastAssistantId` 渲染 `WorkflowPanel`，旧消息完全不渲染过程面板。
3. assistant-ui 的 `ThreadMessageLike` 使用 `metadata.custom` 透传自定义数据，而不是 `meta`；之前把过程记录放到 `meta` 字段会被运行时忽略，导致刷新页面后旧消息看不到过程记录。

因此新提问后：
- 上一条消息在内存/运行时没有有效的过程数据；
- 又因为「只给最后一条助手消息渲染面板」，它自然无法显示。

## Solution

1. `useOwleryRuntime.ts`
   - `persistedMessageToThread` 恢复消息时使用 `metadata: { custom: message.meta }`，让 assistant-ui 把 `meta` 透传到运行时的消息对象。
   - `done` / `error` 处理时，把 `finalMeta` 同步写入当前内存消息的 `metadata.custom`，确保新提问前上一条消息已经自带过程记录。
2. `AgentChat.tsx`
   - 移除 `showWorkflow={message.id === lastAssistantId}` 的限制。
   - `MessageContent` 优先读取 `message.metadata.custom` 里的过程数据，并兼容 `message.meta` 兜底；流式生成中没有自定义数据时回退到当前 `WorkflowContext`。
   - 这样每条助手消息都能展示自己的 Agent 过程，互不干扰。

## Verification

- `pnpm --filter @owl-os/web typecheck` 通过
- `pnpm --filter @owl-os/web lint` 通过
- `pnpm build` 通过
- `pnpm test` 通过
