# Squad 模式老板状态未更新与 docx 路径不可点击

## 现象

1. **老板工作状态未更新**：在 Squad（多 Agent 协作）模式下，当程序异常关闭后重新打开，老板（Elder/Boss）的工作状态仍显示为“正在对工作进行评审”，即使实际已经完成最终答案的输出，执行团队成员均已显示“已完成”。
2. **生成的文件路径不可点击**：LLM 在主消息文本中输出类似 `/tmp/Go语言入门基础.docx` 的本地文件路径时，该路径没有渲染为可点击链接，用户无法触发预览窗口。

## 根因

### 1. 老板状态未更新

- `apps/desktop/src/runtime/SessionRuntime.ts` 在 Elder 开始最终评审时发送了 `status_card`（“正在对工作进行评审”），但 Elder 的 `streamAgent` 正常结束后没有发送对应的“已完成”状态卡片。
- `apps/web/src/components/chat/useOwleryRuntime.ts` 的 `done` 处理逻辑使用 `agent.statusText || '已完成'` 来设置完成状态文本，导致旧的“正在对工作进行评审”被保留并持久化到消息 `meta`。
- 异常关闭时，`done` chunk 可能未到达或未保存，重新加载后 `agentOutputs` 中老板的 `statusText` 仍是“正在对工作进行评审”，且缺少 `done` chunk，前端因此继续显示评审中。
- `TeammateStatus` 仅存于内存/IPC，异常关闭后丢失，恢复时无法依赖后端状态覆盖前端持久化的旧状态。

### 2. docx 路径不可点击

- `apps/web/src/components/chat/MarkdownText.tsx` 的 `renderInline` 在渲染 `link` token 时，对链接文本递归调用 `renderInline(token.content, sessionId)`。
- 对于 `docx` 路径这类裸链接，`token.content` 与 `token.href` 相同，都是 `/tmp/...docx`，递归调用会再次匹配到 link token，形成无限递归，最终导致栈溢出或 React 渲染异常，路径未能正常渲染为可点击按钮。

## 解决方案

### 老板状态

1. 在 `apps/desktop/src/runtime/SessionRuntime.ts` 中，Elder 两次 `streamAgent` 调用结束后都追加 `this.emitAgentStatusCard(elder, "已完成")`。
2. 在 `apps/web/src/components/chat/useOwleryRuntime.ts` 中：
   - 新增常量 `STATUS_COMPLETED_TEXT = '已完成'`。
   - `status_card` 处理逻辑中，当收到“已完成”卡片时，同步给对应 Agent 的 `chunks` 追加 `{ type: 'done' }`，确保异常关闭后仅通过状态卡片也能推断完成态。
   - `buildAgentOutputsFromChunks` 同样对 buffer 中的“已完成”状态卡片追加 `done` chunk。
   - `done` 处理逻辑中，将状态文本强制设为 `STATUS_COMPLETED_TEXT`，不再保留旧文本。
3. 在 `apps/web/src/components/chat/SingleAgentChat.tsx` 的 `getAgentWorkStatus` 中增加兜底判断：当 `agent.statusText === '已完成'` 时直接返回 `completed`。

### docx 路径

1. 在 `apps/web/src/components/chat/MarkdownText.tsx` 的 `renderInline` 中，将 link token 的 children 由递归 `renderInline(token.content, sessionId)` 改为直接渲染 `{token.content}`，避免裸链接二次解析导致的无限递归。

## 验证

- 修复后本地运行 `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build` 均通过。
- 正常流程下，老板完成最终评审后状态卡片会更新为“已完成”。
- 异常关闭后重新打开应用，老板的 `statusText` 与 `chunks` 中均包含完成标记，`AgentCard` 正确渲染为“已完成”。
- 主消息中的 `/tmp/xxx.docx` 路径被正确渲染为青色下划线按钮，点击后调用 `openLocalFilePreview` 打开安全预览窗口。
