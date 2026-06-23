# 主会话闪烁、团队弹窗、命令执行与中间过程持久化问题

## Phenomenon

1. **主会话窗口闪烁**：进行中的 Assistant 消息/卡片在生成过程中出现缩放/闪烁感（`animate-agent-glow` 带 scale 变换）。
2. **智能体团队弹窗展示错误**：弹窗内把老板（leader）和团队成员混在同一列表，没有按“老板 / 团队名称”分组；进行中的成员缺少醒目的绿色流光标识。
3. **`execute_command` 复杂命令执行失败**：调用 `cat << 'PYEOF' | python3 ...` 这类包含 heredoc、管道、引号的命令时报错，导致 python-docx 脚本没有真正写入文件。
4. **切换对话后工具调用/思考过程丢失**：
   - 会话运行中切换窗口再切回，无法恢复 running 状态的中间内容；
   - 会话因 error 中断时，已产生的工具调用与思考过程未被持久化。

## Root Cause

1. **闪烁**：`tailwind.config.js` 中的 `agent-glow` keyframe 包含 `scale(1.01) → scale(1.05)`，导致整卡片在呼吸发光时产生缩放跳动。
2. **弹窗结构**：`ChatHeader.tsx` 原实现只是简单地把 `leader` 和 `members` 顺序列出，没有分组标题；也没有针对 `in_progress` 状态做高亮样式。
3. **命令解析**：`apps/desktop/src/agent/tools.ts` 中的 `execute_command` 使用 `command.split(" ")` 把命令拆成 cmd + args，再传给 `execFileAsync(..., { shell: true })`。这样会把 heredoc 的 `<<`、管道符 `|`、引号等作为独立参数转义，破坏 shell 语法。
4. **中间过程丢失**：
   - `Owlery` 类缺少 `getBufferedOutput(sessionId)` 方法，但前端 IPC `owlery:get_buffered_output` 会调用它，导致 running 会话切换回来时恢复失败；
   - `useOwleryRuntime.ts` 只在 `chunk.type === 'done'` 时保存 assistant 消息，error 中断时直接清空引用，未保存已生成的 `contentParts`。

## Solution

1. **去闪烁加边框流光**：
   - 在 `tailwind.config.js` 新增无 scale 的 `agent-border-glow` 与 `message-glow` keyframes；
   - `SingleAgentChat.tsx` 中 running 的 assistant 消息气泡使用 `animate-message-glow` + 绿色边框；
   - `ChatHeader.tsx` 弹窗中 `in_progress` 成员卡片使用 `animate-agent-border-glow`。
2. **重构团队弹窗**：
   - 新增 `StatusGroup` 组件；
   - 将 `leader` 单独放在“老板”分组；
   - 将 `members` 放在以 `teammateName` 为标题的分组；
   - `in_progress` 状态的文字变为绿色加粗，卡片带绿色流光边框。
3. **修复命令执行**：改为 `execFileAsync("sh", ["-c", command], { cwd, timeout })`，完整保留 shell 语法。
4. **持久化中间过程**：
   - 在 `Owlery.ts` 补全 `getBufferedOutput(sessionId): AgentDriverChunk[]`；
   - 在 `useOwleryRuntime.ts` 的 error 处理分支中也调用 `saveMessage`，状态标记为 `'error'`，`meta.contentParts` 保留工具调用与思考过程。

### 验证结果

- `pnpm lint` ✅
- `pnpm typecheck` ✅
- `pnpm test` ✅（core 17 tests / desktop 12 tests）
