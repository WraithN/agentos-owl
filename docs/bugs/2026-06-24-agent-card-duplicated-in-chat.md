# AgentCard 在会话中重复渲染

## Phenomenon

在 Agent 对话中，同一轮助手回复里出现两张相同的智能体卡片。例如用户发送 `hello` 后，界面同时显示：

- 第一张：`老板：涵华 · 工作中`，下方跟着助手文本
- 第二张：`老板：涵华 · 已完成`，无文本内容

两张卡片对应同一个 Elder Agent，导致界面冗余且状态混乱。

## Root Cause

`@assistant-ui/react` 的 `useExternalStoreRuntime` 在 `isRunning === true` 且消息列表最后一条不是 `assistant` 时，会自动在线程末尾插入一条空的 optimistic assistant 消息（`metadata: { isOptimistic: true }`）。

原来的 `handleNew` 流程是：

1. 追加用户消息
2. 设置 `isRunning = true`
3. 等待第一个 chunk 到达时才创建真实的 assistant 消息

在第 2 步时，外部消息列表以用户消息结尾，assistant-ui 于是插入了 optimistic assistant。随后真实 assistant 消息被追加到同一条用户消息下，导致用户消息有两个子节点：optimistic + 真实。两个 assistant 消息都会渲染 `MessageContent`，从而各自展示一张 `AgentCard`。

## Solution

### 1. 预创建 assistant 消息

修改 `apps/web/src/components/chat/useOwleryRuntime.ts` 的 `handleNew`：

在设置 `isRunning = true` 之前，**预创建一条空的 assistant 消息**，并使用 `flushSync` 强制该状态同步生效，保证 assistant-ui 的 `useExternalStoreRuntime` 在检查 `hasUpcomingMessage` 时，消息列表已经以 assistant 结尾，从而不插入 optimistic 消息。

```ts
const assistantId = generateId();
assistantIdRef.current = assistantId;
assistantTextRef.current = '';
assistantPartsRef.current = [];
// ... 重置 agentOutputs/tasks/rounds
flushSync(() => {
  setMessages((prev) => [
    ...prev,
    { id: userId, role: 'user', content: text, createdAt: new Date() } as ThreadMessageLike,
    { id: assistantId, role: 'assistant', content: [], createdAt: new Date(), status: buildRunningStatus() } as ThreadMessageLike,
  ]);
});
setIsRunning(true);
```

后续 chunk 到达时，`ensureAssistant()` 发现 `assistantIdRef.current` 已存在，直接更新这条预创建的消息，不会产生第二条 assistant。

### 2. 移除 MessageContent 的 memo

由于预创建的 assistant 消息初始内容为空，`MessageContent` 原本的 `memo` 包装会导致组件在内容更新时因 `message` 引用未变而不重新渲染，进而使重新生成/复制按钮和卡片状态无法及时出现。移除 `memo` 后，`MessageContent` 会随消息内容正常更新。

### 3. 启动失败处理

如果 `saveConversation` / `saveMessage` / `startOwleryChat` 启动失败，`handleNew` 的 catch 块会把预创建的 assistant 消息标记为错误状态并显示错误文本，避免空运行态消息残留。

## Verification

- `pnpm typecheck` 通过
- `pnpm lint` 通过
- `pnpm test` 通过（core 10 tests + desktop 90 tests）
- `pnpm build` 通过
