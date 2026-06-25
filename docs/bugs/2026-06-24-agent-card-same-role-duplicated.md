# 同一角色出现多个 AgentCard

## Phenomenon

复杂任务执行过程中，团队面板里同一个角色（如「研究员」）可能出现多张 AgentCard；或者某角色被多次招募时，每一实例都单独成卡，导致卡片堆叠、状态分散。

## Root Cause

`WorkflowPanel` 原先按 `agentId` 聚合 `agentOutputs`。当同一个角色被多次实例化（不同 `agentId`）或 `teamStatus` 补充未产出 chunk 的成员时，同一角色会生成多个 `AgentOutput` 条目，每个条目渲染一张卡片。

`AgentRole` 类型本身只有 `elder | sentinel | worker` 三种粗粒度角色，无法区分「规划师 / 研究员 / 撰写者」等语义角色；真正区分角色的是 `title` 字段。

## Solution

1. 新建 `apps/web/src/components/chat/AgentWorkflowPanel.tsx`，将 `agentOutputs` 按 `title` 分组聚合。
2. 同一 `title` 下的多个 `agentId` 合并为一张卡片：
   - `chunks` 合并；
   - 状态按优先级合并：`FAILED > IN_PROGRESS > WAITING > COMPLETED > NOT_STARTED`；
   - 名称显示为「name」或「name 等 n 人」。
3. `teamStatus` 仅补充当前分组中不存在的 `title`，避免重复。

这样复杂任务中「每个角色一个 AgentCard」，状态集中展示且默认折叠。

## Verification

- `pnpm typecheck` 通过
- `pnpm lint` 通过
- `pnpm test` 通过（core 10 tests + desktop 90 tests）
- `pnpm build` 通过
