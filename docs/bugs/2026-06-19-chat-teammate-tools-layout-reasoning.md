# 会话 Teammate 状态、工具卡片恢复与消息展示问题

## Phenomenon

1. 右上角 Bot 面板仍可能不展示 Teammate 状态。
2. 切换出对话再回到对话后，工具调用卡片消失，只剩 assistant 正文。
3. 工具调用卡片之间的空隙不一致，部分工具卡片造成会话流断裂。
4. 用户可见文字块宽度不统一。
5. AI 输出的第一句如“这个任务涉及...”看起来像任务评估/思考过程，但它以普通 text 结构返回，前端无法可靠判断。

## Root Cause

1. Teammate 状态依赖运行时已成功创建状态快照；无默认模型或旧会话没有快照时，IPC 读取可能返回空。
2. 消息持久化只保存 assistant 纯文本，未保存 assistant-ui 的 content parts，工具调用 parts 无法恢复。
3. 工具日志外层容器和卡片间距叠加，导致视觉间隔不一致。
4. user/assistant 使用不同最大宽度，造成文本块宽度不统一。
5. 切换到 Owlery runtime 后，前端只处理 `text_delta/error/done`，没有把 `reasoning_delta` 和 `tool_event` 映射成 assistant-ui content parts，导致流式思考与工具过程无法卡片化展示。

## Solution

1. `owlery:get_teammate_status` 增加默认 Teammate 兜底，即使运行时未创建也能展示“默认团队 / Boss Agent”。
2. assistant 消息保存时把 content parts 写入 `meta.contentParts`，会话恢复时优先还原 parts，保留工具调用卡片。
3. 移除工具日志外层大间距和分隔线，工具卡片使用连续紧凑间距。
4. 用户和 assistant 消息统一使用同一宽度类。
5. 移除前端文本猜测规则；前端只渲染结构化 reasoning/thinking part。`useOwleryRuntime` 已将 `reasoning_delta` 流式追加到 reasoning part，将 `tool_event` 映射到 tool-call part，切换会话后通过 `meta.contentParts` 恢复卡片。

验证通过：`pnpm test`、`pnpm typecheck`、`pnpm --filter @owl-os/web build`、`pnpm lint`。`pnpm lint` 仍仅输出 ast-grep postinstall 工具警告。
