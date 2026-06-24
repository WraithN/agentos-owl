# 生成过程中上滑查看旧消息时界面闪烁

## Phenomenon

在 AI 生成内容的过程中，用户向上滚动查看非最新消息时，整个消息列表会不停闪烁/抖动。即使用户没有展开任何卡片，旧消息区域也会随着新 chunk 的到来反复重绘。

## Root Cause

`apps/web/src/components/chat/SingleAgentChat.tsx` 存在两处导致列表整体重绘的问题：

1. `WorkflowContext.Provider` 的 `value` 每次渲染都新建对象，`MessageContent` 通过 `useWorkflowContext()` 消费该上下文，导致每条消息组件在每次 chunk 更新时都被迫重渲染。
2. `MessageContent`、`AgentCard`、`TaskCard`、`RoundPanel` 等组件未做 `React.memo` 或 `useMemo` 优化；旧消息对象引用虽然没有变化，但函数组件默认会在父组件重渲染时重新执行，内部复杂的 `MarkdownText` 解析和 DOM 计算引起布局抖动。

此外，`ThreadPrimitive.Viewport` 启用了 assistant-ui 内置的自动滚动，与自定义的滚动逻辑并存，增加了滚动事件冲突和重排的概率。

## Solution

1. 使用 `useMemo` 稳定 `WorkflowContext.Provider` 的 `value`，只有当 `agentOutputs` / `tasks` / `rounds` / `isRunning` / `teamStatus` 真正变化时才更新上下文。
2. 对消息列表中的关键组件加 `React.memo` / `useMemo`：
   - `MessageContent`：阻止旧消息在每次 chunk 更新时重新渲染。
   - `AgentCard`：memo 化并缓存 `text` / `reasoning` / `tools` 的派生计算。
   - `TaskCard`、`RoundPanel`：memo 化，减少任务流水线的重复渲染。
3. 关闭 `ThreadPrimitive.Viewport` 内置的自动滚动（`autoScroll={false}` 等），完全由自定义滚动逻辑接管，避免两套滚动逻辑冲突。

## Verification

- `pnpm --filter @owl-os/web typecheck` 通过
- `pnpm --filter @owl-os/web lint` 通过（Biome、ast-grep、Tailwind、testBuild）
- `pnpm build` 通过（@owl-os/web 与 @owl-os/desktop 均构建成功）
- `pnpm test` 通过（core 17 tests + desktop 47 tests）
