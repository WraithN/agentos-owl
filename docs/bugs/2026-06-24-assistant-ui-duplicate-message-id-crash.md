# assistant-ui 因重复消息 id 崩溃

## Phenomenon

Agent 对话过程中，浏览器控制台抛出错误：

```
Uncaught Error: MessageRepository(performOp/link): A message with the same id already exists in the parent tree.
This error occurs if the same message id is found multiple times.
This is likely an internal bug in assistant-ui.
```

错误导致 `AgentChat` 组件渲染崩溃，聊天界面白屏或卡死。

## Root Cause

这是 `@assistant-ui/react` 使用 `useExternalStoreRuntime` 时的已知问题（参见 [assistant-ui#2380](https://github.com/assistant-ui/assistant-ui/issues/2380)）。当外部消息列表里出现重复 `id` 时，`MessageRepository` 在增量同步（incremental sync）过程中会抛出该错误。

在本项目场景中，重复 id 最可能来自以下情况之一：

1. **`useExternalStoreRuntime` 自动插入 optimistic assistant 消息后，运行时又追加了同一条 assistant 消息的“回声”**。虽然 optimistic 消息的 id 由 assistant-ui 内部生成，但在高频 chunk 流（如刚补发的 `agent_chunk`）与 React 批量更新交错时，增量同步路径可能把同一 id 导入两次。
2. **WebSocket 与 IPC 双通道同时投递同一 chunk**，导致 `ensureAssistant()` 在同一事件循环外被触发两次，生成两条相同 id 的 assistant 消息。当前代码依赖 `assistantIdRef.current` 做单线程保护，但跨 transport 的时序无法完全避免。
3. **会话切换或流式重连时，buffer 中的消息与新生成的消息 id 冲突**。

`MessageRepository` 本身不接受重复 id，因此需要在外部 store 进入 runtime 前兜底去重。

## Solution

在 `apps/web/src/components/chat/useOwleryRuntime.ts` 中，对传给 `useExternalStoreRuntime` 的 `messages` 做去重：

```ts
function deduplicateMessages(messages: ThreadMessageLike[]): ThreadMessageLike[] {
  const seen = new Set<string>();
  const result: ThreadMessageLike[] = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    const id = message.id;
    if (!id) {
      result.unshift(message);
      continue;
    }
    if (seen.has(id)) {
      console.warn('[useOwleryRuntime] 发现重复消息 id，已丢弃旧副本:', id);
      continue;
    }
    seen.add(id);
    result.unshift(message);
  }
  return result;
}
```

- 逆序遍历，保留同一 `id` 最新出现的那一条（最可能是完整/最新状态）。
- 无 `id` 的消息直接保留，不参与去重。
- 去重后的消息列表同时用于 `useExternalStoreRuntime` 和组件返回，保证运行时与 UI 看到的消息一致。

该兜底不会修复产生重复 id 的根因，但能阻止 assistant-ui 因此崩溃，并保留最近一条消息内容。

## Verification

- `pnpm typecheck` 通过
- `pnpm lint` 通过
- `pnpm test` 通过（core 10 tests + desktop 90 tests）
- `pnpm build` 通过
