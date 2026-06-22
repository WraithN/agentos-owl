# 修复界面缩放、代码块格式与 AI 重复用户消息

## 现象

1. 界面整体偏小，字体模糊/看不清楚。
2. 对话中代码块格式化效果差：字体过小、``` 围栏识别不稳定。
3. AI 回复开头会重复一遍用户刚说的话。

## 根本原因

### 1. 界面与字体过小

- Electron 主进程未根据显示器 DPI 设置 `zoomFactor`，在高分辨率屏幕上内容显得很小。
- 应用默认字号为 `md = 15px`，聊天组件大量使用 `text-sm` / `text-xs`，导致可读性差。

### 2. 代码块格式差

- `MarkdownText.tsx` 中代码块字体为 `text-xs`，语言标签为 `text-[10px]`，整体过小。
- 模型有时不输出标准 markdown 代码围栏，或围栏解析受上下文干扰。

### 3. AI 重复用户消息

- `DefaultPromptCompiler` 仅把用户消息文本简单拼接到 prompt 中，没有明确的 `User:` / `Assistant:` 角色分隔。
- 模型容易把用户输入当作需要继续的文本，从而在 Assistant 回复开头重复用户的话。

## 解决方案

### 界面与字体

文件：`apps/desktop/src/main.ts`
- 在 `createWindow()` 中获取主显示器 `scaleFactor`，并设置 `webContents.setZoomFactor()`：
  - `scaleFactor >= 1.5` 时使用 `scaleFactor`
  - 否则使用 `scaleFactor * 1.1`（保证低 DPI 也有一定放大）

文件：`apps/web/src/contexts/AppContext.tsx`
- 默认字号从 `md` 改为 `lg`。
- 字号映射从 `{ sm: '13px', md: '15px', lg: '17px' }` 增大为 `{ sm: '14px', md: '16px', lg: '18px' }`。

文件：`apps/web/src/components/chat/SingleAgentChat.tsx`
- 消息气泡字体从 `text-sm` 改为 `text-base`。

### 代码块格式

文件：`apps/web/src/components/chat/MarkdownText.tsx`
- 代码块 `<pre>` 字体从 `text-xs` 改为 `text-sm`。
- 语言标签字体从 `text-[10px]` 改为 `text-xs`。

### AI 重复用户消息

文件：`apps/desktop/src/agent/drivers/PiAgentDriver.ts`
- `DefaultPromptCompiler.compile()` 生成带角色标记的 prompt：
  ```
  User:
  {user message}

  Assistant:
  ```
- 保留 `Context:` 标记用于额外上下文。

## 验证结果

- `pnpm typecheck` ✅ 通过
- `pnpm lint` ✅ 通过
- `pnpm test` ✅ 通过（core 17 个测试 + desktop 10 个测试）
- `pnpm build` ✅ 通过
