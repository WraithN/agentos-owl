# AI 回复生成后未展示且复述用户输入

## 现象

在单 Agent 对话界面发送消息后：

1. AI 回复生成完毕后，消息气泡显示“已生成完成（无内容）”，实际生成的文本/代码没有展示出来。
2. 部分情况下 AI 会在回复开头重复一遍用户刚刚输入的内容。

## 根本原因

### 1. `PiAgentDriver` 把用户 prompt 事件误当成助手输出

`@earendil-works/pi-agent-core` 的 `Agent.prompt()` 在运行时会先为输入的 user prompt 发出 `message_start` / `message_end` 事件，随后才是助手真正的流式 `message_update` 事件。

`apps/desktop/src/agent/drivers/PiAgentDriver.ts` 的 `mapPiEventToDriverChunk` 对 `message_end` 不做角色过滤，直接把 prompt 的 `message.content` 当成助手累积文本的一部分：

- 第一次 `message_end`（user prompt）会让 `lastText` 变成 prompt 长度。
- 后续助手 `message_update` 必须等累积文本长度超过 prompt 长度才会产出 `text_delta`。
- 若助手回复短于 prompt 长度，或者模型只是把 prompt 复述了一遍，最终切片得到的 `text_delta` 为空字符串，前端就显示“已生成完成（无内容）”。
- 即使回复较长，开头的 prompt 长度部分也会被截断，造成内容缺失或奇怪拼接。

### 2. React 批量执行时闭包引用被后续 chunk 覆盖

`apps/web/src/components/chat/useOwleryRuntime.ts` 的 `text_delta` / `reasoning_delta` / `tool_event` 分支在调用 `setMessages` 的 functional updater 时，直接读取 `assistantPartsRef.current` 等 mutable ref。当多个 chunk（例如最后的 `text_delta` 和 `done`）在同一个事件循环被批量处理时，updater 实际执行时 ref 可能已经被 `done` 分支重置为空数组，导致最终消息内容被覆盖成空。

同理，`done` 分支中先调度了异步 `saveConversation(...).then(() => saveMessage(...))`，随后立即把 `assistantTextRef.current` 和 `assistantPartsRef.current` 重置为空。由于 `.then()` 回调在同步重置之后才执行，持久化时保存到数据库的也是空内容，重新进入会话后同样看到空消息。

### 3. Prompt 中的显式角色标记加剧复述

`DefaultPromptCompiler` 在 user turn 里显式拼接了 `User:` / `Assistant:` 标记。该标记与驱动 bug 叠加后，模型更容易在助手输出里复述用户输入。

## 解决方案

### 后端：`apps/desktop/src/agent/drivers/PiAgentDriver.ts`

1. 在 `mapPiEventToDriverChunk` 中：
   - `message_update` 只处理带有 `assistantMessageEvent` 的助手更新事件。
   - `message_end` 只处理 `message.role === "assistant"` 的事件。
   - 用户/系统消息的事件直接忽略，避免污染助手文本累积状态。
2. 简化 `DefaultPromptCompiler.compile`：
   - 去掉显式的 `User:` / `Assistant:` 角色标记，把用户消息文本直接交给 `Agent.prompt()`。
   - pi-agent-core 会自行把该文本作为 user turn；显式标记反而容易诱导模型复述。

### 前端：`apps/web/src/components/chat/useOwleryRuntime.ts`

1. 在 `text_delta` / `reasoning_delta` / `tool_event` / `error` 分支中，先把新内容捕获到局部常量（`nextParts` / `nextText`），再在 `setMessages` 的 updater 中使用这些局部变量，避免 React 批量执行时读取到已被重置的 ref。
2. 在 `done` 分支中，先把 `assistantTextRef.current` / `assistantPartsRef.current` 捕获到局部常量，再发起异步保存，最后重置引用。
3. 在 `error` 分支中也同步清空文本/片段引用，避免错误后继续影响下一条消息。

### 系统提示：`prompt/boss_agent.md`

在“强约束红线”中新增：

> **禁止复述用户输入**：回复时直接给出答案，不要在开头重复、复述或照搬用户刚刚说的话。

## 验证结果

- `pnpm typecheck`：通过
- `pnpm lint`：通过
- `pnpm test`：通过（desktop PiAgentDriver 测试 + core 测试）
- 实际桌面端验证：发送问题后，AI 正常展示生成内容，不再复述用户输入，历史记录重新加载后内容完整保留。
