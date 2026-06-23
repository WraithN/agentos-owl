# Planner 自驱顺序流水线、多轮评审与任务卡片展示

## 现象

1. **Planner 顺序工作流未生效**：Planner 招募 researcher 和 writer 后，两个 Worker 同时运行，且都收到原始用户消息，不符合"researcher 先研究、writer 后撰写"的顺序要求。
2. **Planner 调用奇怪工具**：Planner 在执行阶段调用 `read_file` / `list_directory` 去读用户本地目录，而不是只负责调度和校验。
3. **没有轮次概念**：Elder 无法主动发起多轮修订，用户反馈问题后只能重新开始一次完整对话。
4. **前端缺少任务/轮次展示**：WorkflowPanel 只展示 Agent 卡片，看不到"轮次 1 · Planner 思考 1"、"当前任务内容：xxx · 任务需求方：老板" 等信息。
5. **文件卡片不显示**：生成的 docx 路径在消息文本中，但文件卡片可能因文件不存在而隐藏（已在前一个 commit 中改为显示但禁用操作）。

## 根因

1. `apps/desktop/src/runtime/SessionRuntime.ts` 对所有 Sentinel 使用同一套"并行执行所有 Worker + Sentinel 收敛"流程，没有识别 planner 的流水线特性。
2. Sentinel 拥有全部执行工具（`read_file` / `list_directory` / `execute_command` / `create_docx` 等），prompt 对其职责边界约束不够强，导致它越权执行。
3. 没有用于任务派发、校验、提交的专用工具，也没有轮次状态机。
4. `AgentDriverChunk` 类型缺少 `task_card` / `round_card`，前端无法接收和展示任务元数据。

## 解决方案

### 后端：LLM 自驱 Planner 流水线

1. **新增 Planner 专用工具**（`apps/desktop/src/agent/tools.ts` + `owleryAgentFactory.ts`）：
   - `dispatch_task`：Planner 派发任务给指定 Worker。
   - `validate_output`：Planner 校验 Worker 产出。
   - `submit_to_elder`：Planner 提交最终成果给 Elder。
   工具 `execute` 为占位实现，真实流程由 `SessionRuntime` 捕获 tool_event 后驱动。

2. **拆分流水线逻辑到独立模块**：
   - `apps/desktop/src/runtime/plannerPrompts.ts`：构建各阶段 prompt。
   - `apps/desktop/src/runtime/PlannerPipeline.ts`：实现 Planner 自驱循环和 Elder 多轮评审。

3. **改造 `apps/desktop/src/runtime/SessionRuntime.ts`**：
   - 新增 `runAgentTurn`：收集 Agent 单轮输出，支持"拦截指定工具调用"给自驱循环使用。
   - 新增 `runPlannerPipeline`：当 sentinel title 为 `planner` 时，调用 `PlannerPipeline` 执行 researcher → writer 顺序流程。
   - 新增 `emitTaskCard` / `emitRoundCard` 发送任务/轮次元数据。
   - Elder 评审循环：解析 `[[评审：满足]]` / `[[评审：不满足，修改意见：...]]` 标记，不满足时进入下一轮，最多 5 轮。

### 前端：任务/轮次可视化

1. **`packages/core/src/agent/types.ts`**：扩展 `AgentDriverChunk`，新增 `task_card` / `round_card`；新增 `AgentTaskView` / `PipelineRound` 类型。
2. **`apps/web/src/components/chat/useOwleryRuntime.ts`**：
   - 新增 `tasks` / `rounds` 状态。
   - 处理 `task_card` / `round_card` chunk。
   - 持久化到 `Message.meta`，恢复时重建。
3. **`apps/web/src/components/chat/SingleAgentChat.tsx`**：
   - `WorkflowPanel` 接收 `tasks` / `rounds`。
   - 新增 `TaskCard` / `RoundPanel` 组件，按轮次展示任务内容、需求方、执行者。

### Prompt 工程

1. `prompt/sentinel_planner.md`：明确 Planner 是纯调度者，禁止调用执行工具，必须使用 `dispatch_task` / `validate_output` / `submit_to_elder`。
2. `prompt/worker.md`：明确 researcher 只输出研究成果，writer 必须生成 `.docx`。
3. `prompt/elder_boss.md`：增加最终评审章节，要求输出评审标记，最多 5 轮。

### 文件卡片兜底

- `apps/web/src/components/chat/FileResultCards.tsx`：即使文件不存在也展示卡片（禁用预览/下载按钮），避免用户看不到文件路径。

## 验证

- 运行 `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build` 均通过。
- `DynamicRecruitment.test.ts` 已更新为验证 Planner 自驱工具链（dispatch_task → worker 执行 → submit_to_elder）。
- 预期效果：
  - Planner 先招募 researcher + writer。
  - researcher 完成后，Planner 校验，再派发 writer。
  - writer 生成 `/tmp/...docx`。
  - 前端消息下方出现文件卡片，可预览/下载。
  - Elder 不满足于自动发起最多 5 轮修订。
  - WorkflowPanel 展示轮次、任务内容、需求方。
