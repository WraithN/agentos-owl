# 老板（Elder）思考过程未在前端展示

## Phenomenon

前端“任务流水线与轮次”面板中，老板（`老板：雯熙彤`）卡片仅显示状态标签“已完成”，没有可展开的推理/工具内容。用户无法查看老板是如何进行任务分配、招募 Sentinel/Worker 以及最终评审的。

## Root Cause

`apps/desktop/src/runtime/SessionRuntime.ts` 中的 `streamAgent` 与 `runAgentTurn` 对 `role === "elder"` 的 chunk 做了主动过滤：

- `reasoning_delta` 只有非 Elder 时才作为 `agent_chunk` 转发到前端。
- `tool_event` 只有非 Elder 时才转发；`recruit_sentinel` 与 `recruit_workers` 事件在处理后直接被 `continue` 丢弃。
- `text_delta` 在 Elder 非 `forwardText` 模式下既不进入主消息，也不进入老板卡片。

前端 `SingleAgentChat.tsx` 的 `AgentCard` 已具备渲染 `reasoning_delta` 和 `tool_event` 的可折叠面板能力，但运行时没有把这些数据送过来，导致老板卡片没有内容可展开。

## Solution

修改 `apps/desktop/src/runtime/SessionRuntime.ts`：

1. `streamAgent` 中：
   - 移除 `agent.role !== "elder"` 限制，`reasoning_delta` 与 `tool_event` 全部以 `agent_chunk` 形式发给前端。
   - `recruit_sentinel` / `recruit_workers` 事件解析完所需字段后不再 `continue`，而是继续向下转发到前端，使老板/ Sentinel 卡片里能看到招募决策与理由。
   - `text_delta` 在保持 Elder 最终答案透传（`forwardChunk`）的同时，也作为 `agent_chunk` 进入对应 Agent 卡片。

2. `runAgentTurn` 中：
   - 同样移除 Elder 过滤，把 `reasoning_delta` 和未收集的 `tool_event` 作为 `agent_chunk` 发出。
   - 被 `PlannerPipeline` 显式收集的 `dispatch_task` / `validate_output` / `submit_to_elder` 等工具事件仍只进入 `toolEvents`，不重复转发，避免与任务卡片重复。

3. 同步更新 `apps/desktop/prompt/elder_boss.md` 的会话展示规范，明确允许思考过程（reasoning）和工具调用（如 `recruit_sentinel`）在前端「思考过程」面板中展示，同时保持最终回复不对用户暴露内部调度。

这样，老板卡片会显示“AI思考推理”折叠面板以及 `recruit_sentinel` 等工具调用，用户即可看到任务下达的具体决策过程。

## Verification

- `pnpm --filter @owl-os/desktop typecheck` 通过
- `pnpm test` 通过（core 17 tests + desktop 47 tests）
- `pnpm build` 通过（@owl-os/web 与 @owl-os/desktop 均构建成功）
