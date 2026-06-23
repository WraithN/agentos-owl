# Agent 卡片仍使用绿色背景闪烁而非黄色跑马灯边框

## Phenomenon

主会话窗口中的 Agent 卡片（如“研究员：熙娟 · 进行中”）仍然显示绿色背景闪烁，而不是用户要求的黄色边框跑马灯。

## Root Cause

之前只把主 assistant 消息气泡改成了黄色跑马灯边框，但 `AgentCard` 组件（`SingleAgentChat.tsx`）的进行中状态仍然保留了：

1. 外层 `animate-agent-glow` 伪元素（带 scale 缩放，造成闪烁）
2. 内层绿色背景 `bg-green-500/5` + 绿色边框 `border-green-400/30`

## Solution

在 `SingleAgentChat.tsx` 的 `AgentCard` 中：

1. 移除外层 `animate-agent-glow` 伪元素，彻底消除 scale 闪烁
2. 内层卡片进行中状态改用 `border-marquee-yellow`（黄色 conic-gradient 旋转跑马灯边框）+ `bg-yellow-400/5`（浅黄背景）

### 验证结果

- `pnpm lint` ✅
- `pnpm typecheck` ✅
- `pnpm test` ✅（core 17 tests / desktop 12 tests）
