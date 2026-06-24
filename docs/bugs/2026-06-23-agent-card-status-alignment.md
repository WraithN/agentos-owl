# AgentCard 状态标签在无折叠按钮时未右对齐

## Phenomenon

在聊天界面的 `AgentCard` 中，当 Agent 有内容可折叠时，状态标签与折叠箭头一起显示在右侧；但当 Agent 没有内容、不显示折叠箭头时，状态标签没有与右侧对齐，导致同一列表中不同卡片的状态标签参差不齐。

## Root Cause

`AgentChat.tsx` 中状态标签与折叠箭头放在同一个 flex 容器内，且折叠箭头位于状态标签之后。当箭头不存在时，容器宽度收缩为状态标签自身宽度，虽然整体靠右，但与有箭头时状态标签的横向位置不一致，视觉上出现未对齐。

## Solution

调整 `AgentCard` 标题行布局：

- 标题文本使用 `flex-1` 占据剩余空间，将状态区域推到右侧。
- 状态标签放在折叠箭头之前，并添加 `shrink-0 whitespace-nowrap` 防止被压缩或换行。
- 当没有折叠箭头时，渲染一个与箭头同宽的透明占位元素，保持状态标签的横向位置不变。

这样无论是否存在折叠箭头，状态标签始终在同一列对齐。

## Verification

- `pnpm --filter @owl-os/web typecheck` 通过。
- `pnpm lint` 通过。
- `pnpm build` 通过。
