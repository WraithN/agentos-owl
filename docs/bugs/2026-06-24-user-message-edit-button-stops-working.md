# 用户消息编辑按钮点击一次后失效

## Phenomenon

点击用户消息的「编辑」按钮后，输入框会回填该消息文本。但再次点击同一条或另一条用户消息的编辑按钮时，输入框不再更新，编辑功能 seemingly 失效。

## Root Cause

`AgentChat.tsx` 中 `editText` 状态用于向 `ChatComposer` 传递待编辑文本。`ChatComposer` 通过 `useEffect` 监听 `initialText` 变化来设置输入框内容：

```ts
useEffect(() => {
  if (initialText) {
    setInputText(initialText);
  }
}, [initialText, setInputText]);
```

当用户发送编辑后的消息后，`editText` 没有被重置。再次点击同一条消息时，`setEditText(text)` 设置的是同一个字符串，React 可能跳过 re-render，`useEffect` 不会触发，输入框保持之前的空状态或旧内容，表现为编辑按钮失效。

## Solution

在 `AgentChat.tsx` 中增加一个 effect：当 `isRunning` 从 `false` 变为 `true`（即用户成功发送了一条新消息）时，重置 `editText` 为空字符串。

```ts
const wasRunningRef = useRef(isRunning);
useEffect(() => {
  if (isRunning && !wasRunningRef.current) {
    setEditText('');
  }
  wasRunningRef.current = isRunning;
}, [isRunning]);
```

这样每次发送后 `editText` 都会被清空，下一次点击编辑按钮时 `setEditText(text)` 一定会触发状态变化，输入框正常回填。

## Verification

- `pnpm typecheck` 通过
- `pnpm lint` 通过
- `pnpm test` 通过（core 10 tests + desktop 90 tests）
- `pnpm build` 通过
