# 主会话黄色跑马灯、团队黄色极光边框与 docx 预览

## Phenomenon

1. 用户希望主会话窗口进行中的消息不使用背景闪烁/缩放，而是改用**黄色跑马灯边框**。
2. 智能体团队弹窗中，进行中成员应使用**黄色极光渐变循环呼吸发光边框**；弹窗分组样式需与参考设计对齐（左侧色条标题、老板单独分组）。
3. LLM 生成的 docx 交付物只展示文件名，不展示完整路径；用户无法知道文件保存位置，也无法直接预览。

## Root Cause

1. 之前为 running 的 assistant 消息添加了绿色 `animate-message-glow`（box-shadow 呼吸），不符合用户要求的黄色跑马灯效果。
2. 团队弹窗中进行中成员使用的是普通绿色流光，没有实现黄色极光渐变呼吸边框；分组标题也没有左侧色条样式。
3. 消息文本中的 `.docx` 文件名/路径只是纯文本，没有识别为可点击链接；项目已有 `file_preview` 系统支持 docx 转 HTML 预览，但缺少从本地文件路径直接打开预览的 IPC 入口。

## Solution

1. **黄色跑马灯边框**：
   - 在 `src/index.css` 新增 `.border-marquee-yellow` 工具类，使用 `conic-gradient` + mask 实现真正的边框颜色旋转跑马灯效果，无背景缩放。
   - 在 `SingleAgentChat.tsx` 中，running 的 assistant 消息气泡改用 `border-marquee-yellow`。
2. **黄色极光渐变呼吸边框与弹窗样式**：
   - 在 `src/index.css` 新增 `.aurora-border-yellow`，使用黄色系渐变（`#facc15 → #f59e0b → #fbbf24`）并添加 `background-position` 呼吸流动动画。
   - 在 `ChatHeader.tsx` 中，进行中成员卡片使用 `.aurora-border-yellow` + 浅黄色背景；分组标题增加左侧青色竖条。
3. **docx 路径识别与预览**：
   - 在 `MarkdownText.tsx` 的 `parseInline` 中识别 `.docx` 文件名/路径，自动渲染为可点击链接。
   - 后端 `ipc/filePreview.ts` 新增 `file_preview_open_local_file` handler：读取本地 docx 文件，复用现有 `createTempFile` + `FilePreviewPage` 流程生成 HTML 预览并打开独立窗口。
   - 前端 `services/electron.ts` 封装 `openLocalFilePreview(sessionId, filePath)`。
   - `MarkdownText` 将 `sessionId` 透传至 `renderInline`，点击 docx 链接时调用 `openLocalFilePreview` 打开预览；若路径不完整则 toast 提示用户查看工具调用输出中的完整路径。
4. **设计文档同步**：更新 `DESIGN.md` 第 8 章，记录新的动画与工具类。

### 验证结果

- `pnpm lint` ✅
- `pnpm typecheck` ✅
- `pnpm test` ✅（core 17 tests / desktop 12 tests）
