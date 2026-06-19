# 中间会话被展示为用户消息

## Phenomenon

Agent 运行过程中产生的中间消息、工具结果或未识别角色消息会在聊天窗口中以用户气泡展示，导致用户会话区域混入非用户实际输入内容。

## Root Cause

`buildThreadMessage` 将非 `user` / `assistant` 的未知角色默认映射为 `user`。历史消息恢复时也将非 `agent` 的持久化消息默认映射为 `user`，导致中间会话内容被误认为用户输入。

## Solution

- 运行时角色映射改为：只有 `role === 'user'` 才是用户消息，其余默认按 assistant 侧处理。
- 历史消息恢复只渲染 `type === 'user'` 和 `type === 'agent'`，忽略系统、工具和其他中间消息。
- 用户发送链路继续使用 `getUserDisplayText`，只展示实际用户输入内容。

Verification:

- `pnpm --filter @owl-os/web typecheck`
- `pnpm --filter @owl-os/web build`
- `pnpm lint`
