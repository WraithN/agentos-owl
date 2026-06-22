# 修复单聊时间线空点与“一直在思考中”

## 现象

在单 Agent 对话界面发送用户消息后，出现两个问题：

1. **时间线有一个空点**：用户消息下方的时间线上出现一个只有节点、没有头像和内容的空 AI 消息行，与下方“正在思考…”提示重复。
2. **一直在思考中**：发送消息后，AI 长时间停留在“正在思考…”状态，不结束，也不显示任何回复内容。

## 根本原因

### 1. 时间线空点

`SingleAgentChat.tsx` 同时存在两种“运行中”的 UI 表示：

- `@assistant-ui/react` 的 `useExternalStoreRuntime` 在 `isRunning === true` 且最后一条消息为用户消息时，会自动在线程末尾插入一条 `content: []` 的 optimistic assistant 消息。
- 组件内又独立渲染了一个 `<WaitingAssistantMessage />` 组件来显示“正在思考…”。

这导致屏幕上同时出现： optimistic 空消息行（时间线空点）+ 独立的“正在思考…”提示，造成视觉重复和空点。

### 2. 一直思考中

IPC 路径调用的是 `@owl-os/core` 的 `Owlery.runSession`。该方法的 `for await (... streamChat())` 循环结束后，仅在 `slot.runStatus === "running"` 时更新状态为 completed，但**没有显式发布 `{ type: "done" }` chunk**。如果底层 `AgentDriver`（如 `PiAgentDriver`）在流正常结束时没有主动产出 `done`，前端就永远不会收到完成信号，`isRunning` 状态一直保持为 `true`，从而一直显示“正在思考…”。

## 解决方案

### 前端：合并“正在思考…”到 optimistic assistant 消息

文件：`apps/web/src/components/chat/SingleAgentChat.tsx`

- 移除独立的 `<WaitingAssistantMessage />` 组件及其渲染逻辑。
- 在 `MessageContent` 中，当 assistant 消息处于 `running` 状态且没有任何文本/图片/推理/工具内容时，直接在消息气泡内渲染“正在思考…”。
- 同时补齐 assistant 消息在 `complete` 或 `error/cancelled` 且内容为空时的占位文案，避免空消息行残留。

这样，`useExternalStoreRuntime` 自动生成的 optimistic assistant 消息本身就承载了“正在思考…”UI，不再与独立提示重复，时间线空点问题随之解决。

### 后端：补发 done chunk

文件：`packages/core/src/owlery/Owlery.ts`

在 `runSession` 的 `streamChat` 循环结束后，检测是否已经收到 `done` chunk；若未收到，则由运行时统一补发 `{ type: "done" }`，确保前端在任何 Driver 行为下都能正确结束运行态。

## 验证结果

- `pnpm typecheck`：通过
- `pnpm lint`：通过
- `pnpm test`：通过（core 17 个测试 + desktop 10 个测试）
