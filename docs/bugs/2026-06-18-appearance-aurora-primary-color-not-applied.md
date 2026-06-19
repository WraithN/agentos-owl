# 外观极光主色设置不生效

## Phenomenon

在外观设置中选择“极光主色”后，设置面板中的预览色会变化，但侧边栏 Logo、极光文字、极光按钮和主色相关 UI 仍保持默认青绿色，用户选择的主色没有全局生效。

## Root Cause

`AppContext.applyPrimaryColor` 只写入了 `--aurora-primary-hsl` 和 `--aurora-from`，但实际 Aurora 样式仍使用硬编码颜色或 `--aurora-cyan`、`--primary`、`--ring` 等变量。由于变量写入与 CSS 消费端不一致，导致主色设置只更新状态和局部预览，不影响真实主题样式。

## Solution

- 在应用主色时同步写入 `--primary`、`--ring`、`--sidebar-ring`、`--sidebar-primary`、`--aurora-cyan`、`--aurora-primary-rgb`、`--aurora-glow` 和相关阴影变量。
- 将 `.aurora-text`、`.aurora-border`、`.btn-aurora` 及浅色按钮阴影从硬编码颜色改为 CSS 变量。
- 验证命令：`pnpm --filter @owl-os/web typecheck`、`pnpm --filter @owl-os/web build`、`pnpm lint`。
