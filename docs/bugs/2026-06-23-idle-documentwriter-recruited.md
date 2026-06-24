# 出现未开始工作的 documentwriter 角色

## Phenomenon

在某些文档生成任务中，规划师团队里会出现一个 `documentwriter: 敏瑞磊 • 未开始` 的卡片，同时其他角色（如 `writer`）已完成工作。该角色被招募但没有收到任何任务，处于闲置状态。

## Root Cause

LLM 在调用 `recruit_workers` 时没有严格遵循提示词中的标准角色名 `writer`，而是根据用户要求（"write a docx file"）生成了非标准角色名 `documentwriter`。`PlannerPipeline` 只向标准角色 `writer` 派发任务，导致 `documentwriter` 被创建但从未被调度。

## Solution

在运行时增加 Worker 角色名归一化：

1. `PlannerPipeline.ts` 新增 `normalizeWorkerTitle()`，把 `documentwriter` / `docwriter` 等别名映射到标准 `writer`。
2. `dispatch_task` 处理时使用归一化后的 `workerTitle` 查找 Worker。
3. `SessionRuntime.ts` 的 `extractWorkerTitles()` 在招募 Worker 前也对标题进行归一化，确保招募和调度使用同一套标准名。

这样即使 LLM 再次生成 `documentwriter`，系统也会把它当作 `writer` 处理，不会再出现闲置角色。

## Verification

- `pnpm --filter @owl-os/desktop typecheck` 通过
- `pnpm lint` 通过
- `pnpm build` 通过
- `pnpm test` 通过
