# recruit_sentinel / recruit_workers 工具结果显示 [object Object]

## Phenomenon

对话中的 `recruit_sentinel` 与 `recruit_workers` 工具卡片输出显示为 `[object Object]`，用户无法直观看到招募的 Sentinel title 与 Worker 列表。

## Root Cause

工具事件的 `result` 字段是结构化对象（如 `{ title: "planner", reason: "..." }` 或 `{ workers: ["developer", "tester"] }`）。前端 `SingleAgentChat.tsx` 的 `formatToolOutput` 只对 `text`/`content`/`output` 等常见字段做递归提取，遇到普通对象时 fallback 到 `String(value)`，导致显示 `[object Object]`。

## Solution

更新 `apps/web/src/components/chat/SingleAgentChat.tsx` 中的 `formatToolOutput`：当对象不包含已知的可展示字段时，使用 `JSON.stringify(value, null, 2)` 序列化，保证结构化结果可读。

## Files Changed

- `apps/web/src/components/chat/SingleAgentChat.tsx`

## Verification

- `pnpm typecheck` ✅
- `pnpm lint` ✅
- `pnpm test` ✅
- `pnpm build` ✅
