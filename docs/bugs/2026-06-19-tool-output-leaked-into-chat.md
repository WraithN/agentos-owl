# 工具输出混入正文且工具卡片合并

## Phenomenon

工具执行结果会以普通 assistant 文本展示在工具卡片之外，目录列表、文件内容或 `EISDIR` 错误可能混入 AI 正文。同时多个工具调用在部分情况下视觉上像共用一个卡片，无法清晰区分单个工具的输入与输出。

## Root Cause

`toolResult` 角色消息未在消息生命周期中过滤，可能被 `buildThreadMessage` 当作 assistant 文本消息渲染。工具卡片外层采用统一折叠面板，摘要信息分散在卡片内部，导致多个工具调用的边界感不足。

## Solution

在旧前端单聊运行时中过滤 `toolResult` 消息，避免工具输出进入 assistant 正文；工具输入改为 pretty JSON 记录。重构 `ToolCallCard` 为一工具一卡片，标题栏展示状态点、工具名、状态、耗时、输入摘要和输出摘要；卡片默认折叠，展开后上下展示 pretty 输入与实际输出文本。

验证通过：`pnpm test`、`pnpm typecheck`、`pnpm --filter @owl-os/web build`、`pnpm lint`。`pnpm lint` 仍仅输出 ast-grep postinstall 工具警告。
