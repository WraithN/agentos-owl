# 智能体团队成员在会话卡片中缺失

## 现象

右上角「智能体团队」弹窗中显示了完整角色列表（老板、规划师、研究员、撰写者等），但会话区域的 Agent 卡片只展示了部分产生过输出的角色，未产生 chunk/status_card 的成员（如截图中的「研究员」）没有出现在会话中。

## 根因

`apps/web/src/components/chat/SingleAgentChat.tsx` 的 `WorkflowPanel` 只渲染 `agentOutputs` 中已有的 Agent。`agentOutputs` 来自消息 `meta` 或运行时的 `agent_chunk`/`status_card`，只有实际产生过输出的 Agent 才会被记录。而 `teamStatus`（来自后端的 `CrystalBall` 快照）包含所有已注册 Agent，因此出现弹窗里有、会话里缺的不一致。

## 解决方案

在 `WorkflowPanel` 中合并 `agentOutputs` 与 `teamStatus` 的成员列表：对于 `teamStatus` 中已存在但 `agentOutputs` 中缺失的 Agent，补充一个空的 `AgentOutput` 条目（`chunks: []`、`statusText: ''`），使其同样渲染为 Agent 卡片。状态显示会回退到 `teamStatus` 中的成员状态，因此仍能保持正确的完成/进行中/等待中标识。

## 验证

- 修复后运行 `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build` 均通过。
- 团队中的所有成员（包括未产生可见输出的研究员）现在都会在会话区域显示。
