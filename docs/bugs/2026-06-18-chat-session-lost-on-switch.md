# 侧边栏切换后会话内容丢失

## Phenomenon

切换侧边栏模块或切换会话窗口后，当前聊天消息只保留在前端运行时内存中，组件卸载后会话内容无法恢复；安全与审计里的会话日志只能看到事件摘要，不能定位完整会话详情。

## Root Cause

单聊运行时只使用 React state 保存 assistant-ui 消息，没有在发送用户消息、接收助手最终消息时写入 SQLite messages，也没有在 conversationId 变化时从 SQLite 重新加载历史消息。会话日志缺少指向完整会话明细的定位字段，且日志列表未按七天有效期过滤。

## Solution

- 用户消息和助手最终消息写入 SQLite messages，并同步追加到 conversation-details JSONL 文件。
- 会话日志增加 detailPath 字段，指向对应 conversationId 的 JSONL 明细文件。
- 旧前端单聊运行时在 conversationId 变化时从 SQLite messages 恢复消息。
- 新建会话时先创建真实 SQLite conversation，避免使用固定 fallback 会话。
- 会话日志页支持查看 JSONL 详情并在详情面板内滚动。
- session_logs 查询和启动迁移均清理七天前日志。

Verification:

- `pnpm --filter @owl-os/web typecheck`
- `pnpm --filter @owl-os/desktop typecheck`
