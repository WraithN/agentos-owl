# ElderAgent 单独工作时隐藏 AgentCard

## Phenomenon

对于简单请求（如 `hello`），ElderAgent 判断不需要招募 Sentinel/Worker 团队，直接返回结果。但前端仍然展示了 `老板：xxx` 的 AgentCard，与多 Agent 协作场景混在一起，视觉上冗余。

期望行为：

- **仅 ElderAgent 工作、未招募任何成员**：不展示 AgentCard，直接显示助手文本回复。
- **ElderAgent 招募了 Sentinel/Worker 或有任务/轮次**：正常展示老板卡、成员卡、任务流水线等。

## Root Cause

`WorkflowPanel` 的展示条件只判断 `agentOutputs` / `tasks` / `rounds` 是否非空。只要 ElderAgent 产生任意 `status_card` 或 `agent_chunk`，`agentOutputs` 里就会有一条 boss 记录，`WorkflowPanel` 就会渲染老板卡片。

## Solution

修改 `apps/web/src/components/chat/AgentChat.tsx` 的 `WorkflowPanel`：

```ts
const onlyBossNoTeam = entries.length === 1 && boss && members.length === 0 && tasks.length === 0 && rounds.length === 0;
if (onlyBossNoTeam) return null;
```

当合并后的 `agentOutputs` 只有老板一条、没有成员、没有任务、没有轮次时，直接返回 `null`，不渲染整个 `WorkflowPanel`。助手文本仍正常显示在主消息气泡中。

## Verification

- `pnpm typecheck` 通过
- `pnpm lint` 通过
- `pnpm test` 通过（core 10 tests + desktop 90 tests）
- `pnpm build` 通过
