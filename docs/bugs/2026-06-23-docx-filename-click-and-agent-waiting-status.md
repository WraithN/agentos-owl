# docx 纯文件名可点击预览与 Agent 等待状态

## 现象

1. **生成的 Word 文档仍无法点击预览**：LLM 在回复中输出 `go_basics.docx 已生成` 这类纯文件名（没有 `/tmp/` 或 `file://` 前缀）时，Markdown 没有将其渲染为可点击链接，用户无法预览。
2. **Elder/Sentinel 招募完成后显示「已完成」**：在 `elder -> sentinel -> worker` 的协作流程中，Elder 招募完 Sentinel 后状态变成「已完成」，Sentinel 招募完 Worker 后也变成「已完成」。实际上它们都在等待下层 Agent 返回结果，应该显示「等待中」。

## 根因

1. `apps/web/src/components/chat/MarkdownText.tsx` 的 docx 链接正则要求路径以 `/`、`file://`、`~/` 或 Windows 盘符开头，不识别裸文件名；`handleLinkClick` 对裸文件名也直接拒绝。
2. `apps/desktop/src/agent/tools.ts` 的 `execute_command` 默认 `cwd` 是 `process.cwd()`（即 `apps/desktop`），LLM 生成的文件落到工程目录，与回复中可能提到的 `/tmp/...` 不一致。
3. `packages/core/src/agent/types.ts` 中的 `AgentWorkStatus` 没有 `waiting` 状态；`SessionRuntime.ts` 在 `streamAgent` 结束后把 Elder/Sentinel 的状态设为 `completed`，但此时它们还在等待子 Agent 结果。

## 解决方案

### docx 预览

1. `apps/desktop/src/agent/tools.ts`：将 `execute_command` 的默认工作目录改为 `/tmp`，使 LLM 通过命令生成的文件默认落到 `/tmp`，与预览查找路径一致。
2. `apps/web/src/components/chat/MarkdownText.tsx`：
   - 扩展 `parseInline` 正则，支持匹配纯文件名形式的 `.docx`。
   - 匹配后对值做清洗，去掉前面可能的中文动词/标点，保留真正的文件名。
   - `handleLinkClick` 对无路径前缀的 docx 文件名自动补全为 `/tmp/{filename}` 再调用预览。

### Agent 等待状态

1. `packages/core/src/agent/types.ts`：在 `AgentWorkStatus` 中添加 `"waiting"`。
2. `apps/web/src/components/chat/SingleAgentChat.tsx` 与 `apps/web/src/components/chat/ChatHeader.tsx`：补充 `waiting` 对应的中文标签「等待中」和样式。
3. `apps/desktop/src/runtime/SessionRuntime.ts`：
   - Elder 招募 Sentinel 完成后，将 Elder 状态更新为 `waiting`，并发送「等待团队返回」状态卡片。
   - Sentinel 招募 Worker 完成后，将 Sentinel 状态更新为 `waiting`，并发送「等待Worker返回」状态卡片。

## 验证

- 修复后运行 `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build` 均通过。
- `go_basics.docx` 这类裸文件名在 Markdown 中被渲染为可点击链接，点击后尝试打开 `/tmp/go_basics.docx`。
- Elder 招募 Sentinel 后显示「等待中」，Sentinel 招募 Worker 后也显示「等待中」，Worker 完成后继续后续收敛/评审流程。
