# 简单消息暴露思考过程 / 文件范围过宽

## Phenomenon

1. **简单消息也展示 reasoning/tool**：用户发送 `hello` 等简单请求时，主会话框中仍出现 `AI思考推理` 面板或工具调用卡片，把本可隐藏的中间过程直接暴露给用户。
2. **主消息文件混入工具结果**：`FileResultCards` 从消息所有部分（文本 + tool-call 结果）提取文件路径，导致某些工具读取/引用的历史文件也被当作「生成文件」展示在主消息下方。

## Root Cause

1. `MessageContent` 只要检测到 `reasoningText` 或 `toolParts` 就无条件展示 `ReasoningPanel` / `ToolLogPanel`，没有区分简单请求与多 Agent 复杂任务。
2. `extractGeneratedFilePaths` 遍历 `text` 和 `tool-call` 两种 part，把工具结果里的路径也视为生成文件。

## Solution

1. **区分简单/复杂任务的 reasoning 展示**：
   - 若消息本身带有 workflow 元数据（`agentOutputs/tasks/rounds`）或当前运行中已有团队协作数据，则判定为复杂任务，主消息中不展示 reasoning/tool，全部集中到右侧「执行过程」面板。
   - 否则为简单请求，reasoning/tool 折叠在 `AI思考推理` 面板内（默认折叠）。

2. **主消息只从文本部分提取文件**：新增 `extractGeneratedFilePathsFromText`，仅扫描 `type === 'text'` 的 part；工具结果中的文件路径只在右侧团队面板展示。

## Verification

- `pnpm typecheck` 通过
- `pnpm lint` 通过
- `pnpm test` 通过（core 10 tests + desktop 90 tests）
- `pnpm build` 通过
