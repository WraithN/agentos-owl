# TeamPanel 因 statusConfig 访问崩溃

## Phenomenon

切换到智能体/群聊模块时，应用崩溃并显示“应用发生错误，请刷新页面重试”，source map 定位到 `TeamPanel.tsx` 的 `statusConfig`。

## Root Cause

`TeamPanel.tsx` 中直接通过 `statusConfig[agent.status]` 获取状态样式，当 `agent.status` 不在 `statusConfig` 的 key 集合中（或类型推断导致运行时值为 undefined）时，`sc.dotClass` / `sc.label` 访问会抛出 `Cannot read properties of undefined` 错误。

## Solution

1. 为 `statusConfig[agent.status]` 增加 fallback：`statusConfig[agent.status as keyof typeof statusConfig] ?? statusConfig.idle`
2. 为 `KANBAN_TASKS.length === 0` 的边界情况添加防护，避免 `progress` 计算为 `NaN`

### 验证结果

- `pnpm lint` ✅
- `pnpm typecheck` ✅
- `pnpm test` ✅（core 17 tests / desktop 12 tests）
