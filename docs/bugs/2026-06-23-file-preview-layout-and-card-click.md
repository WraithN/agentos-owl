# 文件预览窗口布局错乱 & 文件卡片点击无法预览

## Phenomenon

1. 文件预览弹窗的自定义标题栏中，关闭/最小化/最大化按钮位于左侧，下载按钮位于右侧，与常规窗口操作习惯相反。
2. 对话中生成的文件结果卡片点击无响应，无法打开预览窗口；只有通过（已不存在的）预览图标按钮才能触发预览。

## Root Cause

1. `FilePreviewPage.tsx` 标题栏采用 `justify-between` 布局，但原先将窗口控制按钮放在左侧、下载按钮放在右侧，导致视觉与交互不符合预期。
2. `FileResultCards.tsx` 中仅将 `openLocalFilePreview` 绑定在独立的预览按钮上，外层卡片没有点击事件；当移除该按钮后，点击卡片没有任何入口触发预览。

## Solution

1. 调整 `apps/web/src/components/html-preview/FilePreviewPage.tsx` 标题栏：
   - 左侧放置「下载」按钮
   - 中间显示文件名
   - 右侧依次放置最小化、最大化/还原、关闭按钮
   - 控制按钮区域保持 `WebkitAppRegion: no-drag`，标题栏其余区域可拖动
2. 改造 `apps/web/src/components/chat/FileResultCards.tsx`：
   - 将整张卡片（非禁用状态）设置为可点击，点击后调用 `openLocalFilePreview`
   - 仅保留「下载」操作按钮，并阻止点击下载时冒泡触发卡片预览
   - 支持 `Enter` / `Space` 键盘触发预览，保持可访问性

## Verification

- `pnpm --filter @owl-os/web typecheck` 通过
- `pnpm --filter @owl-os/web lint` 通过（Biome、ast-grep、Tailwind、testBuild）
- `pnpm build` 通过（@owl-os/web 与 @owl-os/desktop 均构建成功）
- `pnpm test` 通过（core 17 tests + desktop 47 tests）
