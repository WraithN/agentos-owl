# 点击用户消息“编辑”后发送按钮禁用

## 现象

在单 Agent 对话界面点击用户消息右侧的“编辑”按钮，用户原文会被填入会话底部的输入框，但发送按钮仍然处于 `disabled` 状态，无法点击发送。

## 根本原因

`apps/web/src/components/chat/SingleAgentChat.tsx` 中的 `ChatComposer` 通过 `inputRef.current.value = initialText` 直接修改底层 `<textarea>` 的 DOM 值。但输入框是 `@assistant-ui/react` 的 `ComposerPrimitive.Input`，其受控值和 `canSend` 状态都来自于 assistant-ui 的 ComposerRuntime 内部状态，而不是 DOM value。直接修改 DOM 不会触发 `onChange`，也不会更新 ComposerRuntime 的 `text`，因此发送按钮保持禁用。

这个问题不仅影响“编辑”功能：所有通过 DOM 直接改值的地方（技能、命令、团队下拉菜单的快捷前缀）都存在同样的状态不一致风险。

## 解决方案

在 `ChatComposer` 中通过 `useComposerRuntime()` 获取 ComposerRuntime，统一使用 `composer.setText(text)` 来设置输入框内容。这样 assistant-ui 内部状态会同步更新，`canSend` 变为 `true`，发送按钮自然启用。

具体修改：

1. 引入 `useComposerRuntime`。
2. 新增 `setInputText(text)` 辅助函数：调用 `composer.setText(text)` 并聚焦输入框。
3. `useEffect` 监听到 `initialText` 变化时，使用 `setInputText` 写入。
4. 命令/技能/团队下拉菜单的前缀拼接逻辑，也改为读取 `composer.getState().text` 并通过 `setInputText` 设置。

## 验证结果

- `pnpm typecheck` ✅ 通过
- `pnpm lint` ✅ 通过
- `pnpm build` ✅ 通过
- 桌面端实际验证：点击用户消息编辑按钮后，输入框出现原文，发送按钮可点击并正常发送。
