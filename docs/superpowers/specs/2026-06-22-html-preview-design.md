# HTML 代码预览功能设计

## 背景与目标

当前聊天消息中的代码块已经支持复制、下载与内嵌 HTML 预览，但内嵌预览无法满足用户对独立窗口、目录选择下载、临时文件隔离与安全沙箱的要求。

本次设计目标：

1. 前端识别 HTML 代码块后，在代码块顶部展示“复制 / 下载 / 执行”三个操作。
2. “复制”复制当前 HTML 原文。
3. “下载”通过 Electron 保存对话框，把 HTML 保存到用户选择的位置。
4. “执行”把 HTML 写入 `~/.config/owl-os/tmpfiles/${sessionId}/html-preview/` 后打开独立最大化预览窗口。
5. 预览窗口左侧提供关闭按钮，右侧提供下载按钮，内容区通过 `iframe sandbox` 渲染 HTML。

## 非目标

- 不启动 Node.js/HTTP 静态服务器。
- 不支持 Service Worker、真实 origin、相对路径资源重写。
- 不授予 HTML 本地文件读取或 Electron/Node 能力。

## 后端设计

### 配置

新增 `apps/desktop/src/config/htmlPreview.ts`：

| 字段 | 说明 |
|------|------|
| `maxPreviewBytes` | 单个 HTML 允许预览的最大字节数，默认 `5 * 1024 * 1024` |
| `tempFileTtlMs` | 临时文件过期时间 |
| `tempRootDirName` | 临时根目录名：`tmpfiles` |
| `featureDirName` | 功能目录名：`html-preview` |

### 临时文件路径

文件写入：

```text
~/.config/owl-os/tmpfiles/${sessionId}/html-preview/preview-${timestamp}-${random}.html
```

`sessionId` 需路径安全清洗，只允许字母、数字、下划线、短横线与点号；其余字符替换为 `_`。

### IPC

新增 `apps/desktop/src/ipc/htmlPreview.ts`：

- `html_preview_create_temp_file({ sessionId, html, title? })`
  - 校验 HTML 字节大小不超过配置。
  - 创建临时文件并记录 `previewId -> filePath/sessionId/title/createdAt` 映射。
  - 返回 `{ previewId, fileName, sizeBytes, expiresAt, maxPreviewBytes }`。

- `html_preview_read({ previewId })`
  - 仅允许读取主进程映射中的临时文件。
  - 文件不存在或过期时返回 `null`。

- `html_preview_save_as({ html, defaultName? })`
  - 打开系统保存对话框。
  - 用户取消时返回 `{ canceled: true }`。

- `html_preview_open_window({ previewId })`
  - 打开独立 BrowserWindow。
  - 默认最大化。
  - URL 使用 `#/html-preview/${previewId}`，不暴露本地路径。

- `html_preview_close_window({ previewId })`
  - 关闭预览窗口并删除临时文件。

### 清理策略

- 预览窗口关闭时删除对应临时文件。
- 应用启动后清理 `tmpfiles/*/html-preview/` 中超过 TTL 的 `.html` 文件。
- `before-quit` 关闭所有预览窗口并尽量删除活跃临时文件。

## 前端设计

### 服务层

在 `apps/web/src/services/electron.ts` 封装：

- `createHtmlPreviewTempFile`
- `readHtmlPreview`
- `saveHtmlPreviewAs`
- `openHtmlPreviewWindow`
- `closeHtmlPreviewWindow`

### HTML 检测

新增 `apps/web/src/components/html-preview/htmlPreviewUtils.ts`：

- 语言为 `html` / `htm` 时判定为 HTML。
- 未标注语言但代码包含 `<!doctype html>`、`<html`、`<body`、`<head`、`<script`、`<style` 等结构时，也判定为 HTML。
- 从 `<title>` 提取下载默认文件名。

### 消息代码块

`MarkdownText` 改造：

- 接收 `sessionId`。
- HTML 代码块顶部显示：复制、下载、执行。
- “执行”调用创建临时文件 + 打开预览窗口。
- 不再使用原有内嵌 modal 预览。

### 预览窗口页面

新增 `apps/web/src/components/html-preview/HtmlPreviewPage.tsx`：

- 路由：`#/html-preview/:previewId`。
- 页面顶栏：左侧“关闭”，右侧“下载”。
- 内容区：`<iframe sandbox="allow-scripts" srcDoc={html} />`。
- 读取失败/过期时显示“预览已过期，请重新执行”。

## 安全策略

- iframe 只允许 `allow-scripts`，不添加 `allow-same-origin`、`allow-popups`、`allow-forms`。
- 前端永不持有或传递本地文件路径。
- 主进程只允许按 `previewId` 读取已登记临时文件。
- HTML 大小限制由主进程配置统一控制，前端只展示错误。

## 错误处理

- 超过大小限制：提示“HTML 超过预览大小限制”。
- 下载取消：不提示错误。
- 复制失败：提示“复制失败，请手动复制”。
- 临时文件过期或不存在：预览页显示过期提示。

## 验证建议

1. 普通代码块不显示执行按钮。
2. HTML 代码块显示复制、下载、执行。
3. 执行后打开最大化独立窗口，iframe 正常渲染。
4. 预览窗口关闭后临时文件被删除。
5. 超出 `maxPreviewBytes` 的 HTML 无法预览。
