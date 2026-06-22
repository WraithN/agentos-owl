# DOCX / XLSX / PPTX 文件预览功能设计

## 背景与目标

HTML 代码预览已经采用独立窗口、顶部工具栏与 iframe sandbox 展示。用户希望 DOCX、XLSX 与 PPTX 文件预览的展示层与 HTML 预览保持一致。

本次设计目标：

1. 聊天输入框选择 `.docx` / `.xlsx` / `.pptx` 文件后展示“预览”按钮。
2. 预览时文件写入 `~/.config/owl-os/tmpfiles/${sessionId}/office-preview/`。
3. 主进程把 DOCX / XLSX / PPTX 转换为安全 HTML，再打开独立最大化窗口。
4. 预览窗口沿用 HTML 预览布局：左侧关闭、右侧下载，中间 iframe sandbox 展示。
5. 下载按钮保存原始文件，而不是保存转换后的 HTML。

## 非目标

- 不实现 DOC / XLS / PPT 旧格式预览。
- 不实现 Office 复杂样式、宏、公式执行。
- 不启动 Node.js/HTTP 静态服务器。

## 后端设计

### 依赖

- `mammoth`：DOCX 转 HTML。
- `xlsx`：XLSX workbook 转 HTML table。
- `jszip`：PPTX 解包并抽取幻灯片文本。

### 配置

新增 `apps/desktop/src/config/filePreview.ts`：

| 字段 | 说明 |
|------|------|
| `maxPreviewBytes` | 单文件预览大小上限，默认 `10 * 1024 * 1024` |
| `tempFileTtlMs` | 临时文件过期时间 |
| `tempRootDirName` | 临时根目录名：`tmpfiles` |
| `featureDirName` | 功能目录名：`office-preview` |

### IPC

新增 `apps/desktop/src/ipc/filePreview.ts`：

- `file_preview_create_temp_file({ sessionId, fileName, data })`
  - 仅允许 `.docx` / `.xlsx` / `.pptx`。
  - 校验大小。
  - 写入临时原始文件。
  - 转换为 HTML 字符串并登记 `previewId -> filePath/html/fileName/mimeType`。

- `file_preview_read({ previewId })`
  - 返回转换后的 HTML 与原始文件名。

- `file_preview_save_as({ previewId })`
  - 保存原始文件到用户选择位置。

- `file_preview_open_window({ previewId })`
  - 打开独立最大化窗口，路由为 `#/file-preview/${previewId}`。

- `file_preview_close_window({ previewId })`
  - 关闭窗口并删除临时文件。

## 前端设计

### 聊天输入框

`ChatComposer` 选择文件后：

- `.docx` / `.xlsx` / `.pptx` 展示“预览”按钮。
- 点击后读取 `ArrayBuffer`，调用 `file_preview_create_temp_file` 与 `file_preview_open_window`。
- 不支持的文件保持原有展示。

### 预览页面

新增 `FilePreviewPage`：

- 路由：`#/file-preview/:previewId`。
- 顶栏与 HTML 预览一致。
- 内容区：`<iframe sandbox="" srcDoc={html} />`。
- 下载按钮调用 `file_preview_save_as` 保存原始文件。

## 安全策略

- iframe 不允许脚本执行，使用空 sandbox。
- 文件路径只在主进程维护，前端仅持有 `previewId`。
- 只处理 `.docx` / `.xlsx` / `.pptx`，不执行宏或外部资源。
- PPTX 当前只抽取文本内容，图片、动画、版式与备注不作为本期目标。
- 大小限制由主进程配置控制。

## 验证建议

1. 选择 `.docx` 后出现预览按钮并打开独立窗口。
2. 选择 `.xlsx` 后表格内容可在独立窗口查看。
3. 选择 `.pptx` 后幻灯片文本可按页查看。
4. 下载按钮保存原始文件。
5. 关闭窗口后临时文件被删除。
6. 超出大小限制时前端提示无法预览。
