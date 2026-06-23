# AI 未真正生成 docx 与黄色跑马灯边框动效

## 现象

1. **AI 没有真正撰写 docx**：用户要求写文档/报告时，AI 只在回复文本里输出内容，不会生成可下载的 `.docx` 文件；即使回复里出现类似 `/tmp/xxx.docx` 的路径，也往往只是 LLM 编造的路径，文件实际不存在。
2. **黄色跑马灯边框**：AI 消息在运行中状态时，气泡外框出现旋转的黄色锥形渐变边框（`border-marquee-yellow`），视觉上像"黄线乱飞"，干扰阅读。

## 根因

### docx 未生成

1. **缺少 docx 专用工具`：**`apps/desktop/src/agent/tools.ts` 中 Worker 只有 `read_file` / `write_file` / `list_directory` / `execute_command`。
   - `write_file` 写 `.docx` 只能得到纯文本伪 docx，文件损坏无法打开。
   - `execute_command` 虽然能跑 Python，但 LLM 不一定知道环境已装 `python-docx`，也容易写出错误脚本。
2. **Prompt 未明确要求**：`elder_boss.md`、`sentinel_planner.md`、`worker.md` 都提到"文档撰写"，但没有任何一处要求把交付物输出为 `.docx` 文件。
3. **LLM 倾向于文本回复**：没有工具和明确约束时，模型自然选择在聊天窗口里直接输出文字，而不是调用工具生成文件。

### 黄色边框动效

- `apps/web/src/index.css` 定义了 `.border-marquee-yellow` 和 `.aurora-yellow-flow`，使用 `conic-gradient` + 旋转动画实现黄色跑马灯边框。
- `apps/web/src/components/chat/SingleAgentChat.tsx` 在 `isAssistantRunning` 时给消息气泡添加 `border-marquee-yellow` 类，导致运行中消息出现该动效。

## 解决方案

### 增加 docx 生成工具

1. 在 `apps/desktop/src/agent/tools.ts` 中新增 `create_docx` 工具：
   - 参数：`output_path`、`title`、`sections`（包含 `heading`/`level`/`paragraphs`/`code_blocks`）。
   - 内部通过 `python3 -c` 调用 `python-docx` 生成真实 `.docx`。
   - 相对路径默认解析到 `/tmp`，与现有文件预览/下载路径一致。

2. 更新 Prompt：
   - `prompt/sentinel_planner.md`：文档/报告类任务必须使用 `create_docx` 生成 `.docx`，禁止只用纯文本冒充。
   - `prompt/worker.md`：撰写文档/报告类子任务必须使用 `create_docx`，并标注生成路径。

### 移除黄色跑马灯动效

1. `apps/web/src/components/chat/SingleAgentChat.tsx`：移除消息气泡上的 `border-marquee-yellow` 类。
2. `apps/web/src/index.css`：删除 `.aurora-border-yellow`、`.border-marquee-yellow` 及对应 `@keyframes`。

## 验证

- 运行 `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build` 均通过。
- 黄色边框动效已移除，运行中消息不再出现"黄线乱飞"。
- 新增 `create_docx` 工具后，文档类任务可由 LLM 调用该工具在 `/tmp` 下生成真实 `.docx`，前端 FileResultCards 可识别并展示预览/下载卡片。
