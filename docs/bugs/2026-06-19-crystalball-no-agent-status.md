# CrystalBall 当前会话无 Agent 状态

## Phenomenon

点击聊天右上角 Bot 按钮时，CrystalBall 面板显示“暂无 Agent 状态”。状态只能通过前端轮询读取，无法在 Agent 运行状态变化时即时推送到前端。

## Root Cause

默认聊天仍使用 Pi Agent runtime，而 CrystalBall 面板主要读取 Owlery snapshot。Pi Agent 会话没有独立的状态推送通道，且仅在部分 IPC 调用中写入内存状态；旧会话或状态变化过程中前端可能读不到 snapshot。

## Solution

新增统一 `agent:status` 状态事件通道，Pi Agent 在创建、运行、完成、失败、取消时推送状态；Owlery 在激活、开始运行和 chunk 推送时同步发布 snapshot。前端 ChatHeader 保留初始拉取，并订阅 `agent:status` 只更新当前会话的 CrystalBall 面板。

验证通过：`pnpm test`、`pnpm typecheck`、`pnpm --filter @owl-os/web build`、`pnpm lint`。`pnpm lint` 仍仅输出 ast-grep postinstall 工具警告。
