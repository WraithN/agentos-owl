# UI 细节修复：生成中复制禁用、抽屉点击外部关闭、模型卡片再次点击收缩

## 现象

1. **AI 生成过程中复制按钮仍可用**：在 AI 消息流式生成（`running` 状态）时，消息下方的复制按钮仍处于可点击状态，用户可能复制到不完整内容。
2. **抽屉无法通过点击外部关闭**：历史会话抽屉（左侧）、任务/执行日志抽屉（右侧）、会话统计/运行监控抽屉（右侧）打开后，点击抽屉外部区域不会关闭，只能通过顶部按钮关闭。
3. **LLM 模型卡片展开后再次点击不收缩**：设置 → LLM 管理中，点击模型卡片行头可展开编辑表单，但展开状态下再次点击行头没有任何反应，用户无法通过点击同一区域收起卡片。

## 根因

1. `apps/web/src/components/chat/SingleAgentChat.tsx` 中 `MessageContent` 的复制按钮没有根据 `assistantState` 判断运行状态，未设置 `disabled`。
2. `apps/web/src/components/chat/ChatContainer.tsx` 中的抽屉使用 `framer-motion` 的 `motion.div` 实现，没有添加遮罩层（backdrop/overlay），因此点击抽屉外部没有事件来关闭抽屉。
3. `apps/web/src/components/settings/ApiSettings.tsx` 中 `ModelCard` 行头的 `onClick` 为 `() => !editing && setEditing(true)`，展开后条件为假，再次点击被忽略。

## 解决方案

1. 在 `SingleAgentChat.tsx` 中给复制按钮添加 `disabled={assistantState === 'running'}`，并将 Tooltip 提示在生成中改为「生成中，暂不可复制」。
2. 在 `ChatContainer.tsx` 主区域最外层添加一个遮罩层，当任意抽屉打开时渲染，置于所有抽屉下方（`z-20`），点击时关闭全部抽屉。
3. 在 `ApiSettings.tsx` 中将 `ModelCard` 行头 `onClick` 改为 `() => setEditing(v => !v)`，实现展开/收起切换；右侧铅笔按钮通过 `stopPropagation` 保持独立，不受影响。

## 验证

- 修复后运行 `pnpm lint`、`pnpm typecheck`、`pnpm build` 均通过。
- AI 生成时复制按钮变为不可用，生成完成后恢复。
- 打开任意抽屉后点击非抽屉区域，抽屉关闭。
- LLM 模型卡片点击展开、再次点击收起。
