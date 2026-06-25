# 会话中出现两条相同的 assistant 消息

## Phenomenon

用户发送简单请求（如 `hello`）后，界面出现两条完全相同的助手回复消息，而不是一条。消息内容一致，造成重复展示。

## Root Cause

即使 `handleNew` 中已经用 `flushSync` 预创建了一条 assistant 消息，`@assistant-ui/react` 的 `useExternalStoreRuntime` 仍可能在某些时序下插入一条空的 optimistic assistant 消息。原因包括：

1. 预创建消息使用 `content: []`，assistant-ui 可能将其视为无效消息而忽略，继续插入 optimistic。
2. `flushSync` 与 `setIsRunning(true)` 之间的渲染时序不能保证 assistant-ui 内部已识别到预创建消息。
3. 乐观消息与预创建消息拥有不同 id，因此之前的 `deduplicateMessages` 按 id 去重无法消除它。

## Solution

在 `apps/web/src/components/chat/useOwleryRuntime.ts` 中增加两层防护：

1. **预创建消息带上空文本占位**，避免被 assistant-ui 视为空消息：

```ts
{ id: assistantId, role: 'assistant', content: [{ type: 'text', text: '' }], ... }
```

2. **`deduplicateMessages` 过滤 optimistic assistant 占位消息**：

```ts
function isEmptyRunningAssistant(message: ThreadMessageLike): boolean {
  // role=assistant, status=running, 内容为空（无 text/reasoning/tool）
}

function deduplicateMessages(messages, activeAssistantId) {
  // 只保留 id === activeAssistantId 的空 running assistant，其余视为 optimistic 丢弃
}
```

这样无论 assistant-ui 是否插入 optimistic 消息，最终进入 runtime 的消息列表只保留我们预创建的真实 assistant。

## Verification

- `pnpm typecheck` 通过
- `pnpm lint` 通过
- `pnpm test` 通过（core 10 tests + desktop 90 tests）
- `pnpm build` 通过
