# AI 生成文件结果卡片

## 现象

AI 在回复中生成 Word 文档（如 `.docx`）后，只会在 Markdown 文本里以可点击链接的形式出现。用户不容易发现文件已经生成，也没有办法一键预览或下载到本地。

## 根因

前端没有针对 AI 消息中的生成文件做二次展示。虽然 `MarkdownText` 已经能把 docx 路径渲染为链接，但：

1. 文本中可能混有“已生成 go_basics.docx”这类描述，链接不够醒目。
2. 缺少独立卡片展示文件名、创建时间，以及显眼的「预览」「下载」操作入口。
3. 后端已能通过 `file_preview_open_local_file` 打开本地文件预览，但没有暴露查询文件信息、直接下载原始文件的 IPC。

## 解决方案

### 后端 IPC

在 `apps/desktop/src/ipc/filePreview.ts` 中新增：

- `file_preview_get_local_file_info`：查询本地文件是否存在、文件大小、创建/修改时间。
- `file_preview_download_local_file`：弹出保存对话框，把本地文件复制到用户指定位置。

### 前端工具

新增 `apps/web/src/components/chat/file-result-utils.ts`：

- 正则匹配消息文本和 `tool-call` 结果中的 `.docx` 路径。
- 支持绝对路径（`/tmp/...`、`file://...`、`~/...`、Windows 盘符）以及裸文件名，裸文件名默认解析为 `/tmp/{filename}`。
- 对中文动词/标点前缀做清洗，去重并保持顺序。

### 前端卡片组件

新增 `apps/web/src/components/chat/FileResultCards.tsx`：

- 根据传入的文件路径列表调用 `getLocalFileInfo` 批量读取信息。
- 为每个存在的文件渲染一张卡片，展示文件图标、文件名、创建时间。
- 提供「预览」按钮调用 `openLocalFilePreview`，「下载」按钮调用 `downloadLocalFile`。
- 文件不存在时给出 Toast 提示。

### 接入消息渲染

在 `apps/web/src/components/chat/SingleAgentChat.tsx` 的 `MessageContent` 中，当 AI 消息完成（`assistantState === 'complete'`）后，调用 `extractGeneratedDocxPaths(message)` 并把路径传给 `FileResultCards`，在消息末尾统一展示。

## 验证

- 运行 `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build` 均通过。
- AI 生成 docx 后，消息下方出现文件卡片，显示文件名与创建时间。
- 点击「预览」按钮可打开安全预览窗口；点击「下载」按钮可保存原始文件。
- 文件不存在时按钮给出错误提示，不会白屏。
