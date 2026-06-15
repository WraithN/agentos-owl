# OwlOS 设计系统 — Aurora

> 面向 AI 编码代理与前端开发者的设计规范文档。

## 1. 设计概述

OwlOS 采用 **Aurora（极光）设计系统**，视觉核心为：

- **深空背景**：深色模式下使用 `#020617` 为核心的径向渐变，模拟深空感。
- **极光强调色**：`#00f2c3`（青）→ `#38bdf8`（蓝）→ `#7c3aed`（紫）的渐变。
- **玻璃拟态（Glassmorphism）**：多层磨砂玻璃面板，营造层次与沉浸感。
- **明暗双主题**：通过 `html.dark` class 切换，浅色模式为干净的 slate 系亮色调。

整体风格趋向于现代 AI 工具界面：低饱和背景、高亮强调色、清晰的信息层级、细腻的动效反馈。

## 2. 设计原则

1. **意图驱动，聚焦内容**：界面元素不过度装饰，让对话、工作流、知识库内容成为视觉中心。
2. **层次清晰，玻璃分层**：通过 `glass-l1` ~ `glass-l4` 四层玻璃建立空间层级。
3. **极光点缀，克制使用**：渐变与发光效果仅用于品牌标识、主按钮、关键状态，避免滥用。
4. **动效服务于反馈**：悬浮、点击、消息进入等动效短暂（0.15s ~ 0.3s），增强交互感知。
5. **双主题一致**：同一组件在深浅主题下保持相同的语义与层级，仅色相与明暗变化。

## 3. 色彩系统

### 3.1 主色

| 名称 | 浅色模式 | 深色模式 | 用途 |
|------|---------|---------|------|
| `--primary` | `hsl(168 92% 38%)` | `hsl(168 100% 47%)` | 主按钮、链接、激活态、焦点环 |
| `--secondary` | `hsl(210 40% 92%)` | `hsl(217 33% 15%)` | 次要按钮、标签背景 |
| `--accent` | `hsl(210 40% 90%)` | `hsl(222 39% 9%)` | 强调面板、选中背景 |
| `--destructive` | `hsl(345 83% 50%)` | `hsl(345 83% 59%)` | 删除、危险操作 |
| `--background` | `hsl(210 40% 97%)` | `hsl(222 47% 3%)` | 页面背景 |
| `--foreground` | `hsl(222 47% 11%)` | `hsl(210 40% 98%)` | 主要文字 |
| `--muted` | `hsl(210 40% 93%)` | `hsl(217 33% 13%)` | 静音背景 |
| `--border` | `hsl(214 32% 87%)` | `hsl(217 33% 13%)` | 边框、分割线 |

### 3.2 Aurora 品牌色

```
--aurora-cyan:   #00f2c3  /  #00b89a（浅色）
--aurora-blue:   #38bdf8  /  #0ea5e9（浅色）
--aurora-purple: #7c3aed
--aurora-glow:   rgba(0, 242, 195, 0.15)
```

渐变方向统一为 `135deg`：

```css
linear-gradient(135deg, #00f2c3 0%, #38bdf8 50%, #7c3aed 100%);
```

### 3.3 状态色

| 状态 | 颜色 | 工具类 |
|------|------|--------|
| success | `#10b981` | `badge-success`、`.text-emerald-500` |
| warning | `#f59e0b` | `badge-warning`、`.text-amber-500` |
| error | `#f43f5e` | `badge-error`、`.text-rose-500` |
| info | `#38bdf8` | `badge-info`、`.text-sky-400` |
| neutral | `#94a3b8` | `badge-neutral` |

### 3.4 图表色

`--chart-1` ~ `--chart-5` 分别对应：极光青、天蓝、电光紫、琥珀、玫瑰红。

## 4. 字体排版

### 4.1 字体栈

```css
/* 正文/UI */
font-family: 'Inter', 'SF Pro Display', system-ui, sans-serif;

/* 代码/等宽 */
font-family: 'JetBrains Mono', 'Fira Code', monospace;
```

### 4.2 字号层级

项目使用 Tailwind 默认字号工具类，推荐层级：

| 层级 | Tailwind | 用途 |
|------|----------|------|
| 页面标题 | `text-2xl` ~ `text-3xl` | 模块标题、空状态 |
| 卡片标题 | `text-lg` ~ `text-xl` | 面板标题、对话标题 |
| 正文 | `text-sm` ~ `text-base` | 主要内容、描述 |
| 辅助文字 | `text-xs` | 标签、时间戳、徽章 |

### 4.3 文字透明度层级

通过自定义变量控制：

```css
--text-primary:   rgba(241,245,249,0.96);  /* 标题 */
--text-secondary: rgba(203,213,225,0.80);  /* 正文 */
--text-tertiary:  rgba(148,163,184,0.65);  /* 辅助说明 */
--text-disabled:  rgba(100,116,139,0.45);  /* 禁用 */
```

浅色模式下对应深色系透明度。

## 5. 间距与圆角

### 5.1 圆角规范

```css
--radius-xs:  6px;
--radius-sm:  8px;
--radius-md:  12px;
--radius-lg:  16px;
--radius-xl:  20px;
--radius-2xl: 24px;
--radius-full: 9999px;
```

默认组件圆角 `--radius: 0.625rem`（10px）。

### 5.2 间距

沿用 Tailwind 间距刻度（4px 基准）。推荐：

- 紧凑元素：`gap-1` ~ `gap-2`、`p-2` ~ `p-3`
- 卡片内边距：`p-4` ~ `p-6`
- 模块间距：`gap-4` ~ `gap-6`、`p-6` ~ `p-8`
- 页面边距：`px-4` ~ `px-6`

## 6. 玻璃拟态分层

Aurora 设计系统使用 4 层玻璃（从底层到顶层）：

| 类名 | 层级 | 用途 | 模糊程度 |
|------|------|------|---------|
| `glass-l1` | 最底层 | 侧边栏 | `blur(32px)` |
| `glass-l2` | 第二层 | 顶栏、对话区主背景 | `blur(24px)` |
| `glass-l3` | 第三层 | 卡片、消息气泡 | `blur(18px)` |
| `glass-l4` | 最顶层 | 弹窗、Tooltip、下拉菜单 | `blur(28px)` |

同时提供向后兼容的旧类名：`glass`、`glass-sm`、`glass-hover`。

### 6.1 玻璃使用示例

```tsx
<!-- 侧边栏 -->
<aside className="glass-l1 h-full w-64">
  ...
</aside>

<!-- 顶栏 -->
<header className="glass-l2 sticky top-0 z-40">
  ...
</header>

<!-- 卡片 -->
<div className="glass-l3 rounded-xl p-4">
  ...
</div>

<!-- 弹窗 -->
<div className="glass-l4 rounded-2xl shadow-lg">
  ...
</div>
```

## 7. 组件模式

### 7.1 按钮

- **主按钮**：使用 `btn-aurora` 类，渐变背景 + 白色文字 + 悬浮亮度提升。
- **次要按钮**：使用 shadcn/ui `variant="secondary"`。
- **幽灵/描边按钮**：使用 `variant="outline"` 或 `variant="ghost"`。
- **悬浮提升**：`.btn-lift` 提供轻微上浮效果。

```tsx
<Button className="btn-aurora">主要操作</Button>
<Button variant="outline">次要操作</Button>
<Button className="btn-lift" variant="ghost">悬浮提升</Button>
```

### 7.2 徽章

统一使用 `.badge` + 状态类：

```tsx
<span className="badge badge-success">运行中</span>
<span className="badge badge-warning">待处理</span>
<span className="badge badge-error">失败</span>
<span className="badge badge-info">信息</span>
<span className="badge badge-neutral">默认</span>
```

### 7.3 卡片

- 使用 `glass-l3` 或 shadcn/ui `Card` 组件。
- 可添加 `.card-lift` 实现悬浮提升。

```tsx
<Card className="glass-l3 card-lift">
  <CardHeader>...</CardHeader>
  <CardContent>...</CardContent>
</Card>
```

### 7.4 输入框

焦点状态使用 `.input-glow` 提供极光青色光晕。

```tsx
<div className="input-glow rounded-lg border">
  <Input ... />
</div>
```

## 8. 动画与交互

### 8.1 基础动画

| 动画名 | 用途 | 时长 |
|--------|------|------|
| `fade-in` | 元素淡入 | 0.3s |
| `slide-in-left` / `slide-in-right` | 侧滑进入 | 0.3s |
| `accordion-down` / `accordion-up` | 手风琴展开 | 0.2s |
| `aurora-flow` | 极光背景流动 | 15s 循环 |
| `msg-enter` | 聊天消息进入 | 0.3s |
| `spin-slow` | 慢速旋转 | 3s |
| `bell-shake` | 通知铃铛摇晃 | 0.6s |

### 8.2 呼吸灯

用于运行中、等待中等动态状态：

```tsx
<span className="pulse-cyan">●</span> 运行中
<span className="pulse-amber">●</span> 等待中
<span className="pulse-emerald">●</span> 在线
```

### 8.3 渐变文字与边框

```tsx
<!-- 极光渐变文字 -->
<h1 className="aurora-text">OwlOS</h1>

<!-- 极光渐变边框 -->
<div className="aurora-border rounded-xl p-4">...</div>
```

## 9. 深色 / 浅色模式

### 9.1 切换机制

通过 `html` 标签上的 `.dark` class 控制，由 `next-themes` 与 `AppContext` 共同管理。

```tsx
// 切换主题
document.documentElement.classList.add('dark');
document.documentElement.classList.remove('dark');
```

### 9.2 双主题适配

`src/index.css` 底部包含大量 `html:not(.dark)` 覆盖规则，将深色专用 Tailwind 类（如 `text-slate-100`、`bg-slate-900`、`border-white/10`）自动映射到浅色合适的值。新增自定义颜色时，需要同步检查浅色表现。

### 9.3 背景

```css
/* 浅色 */
background: radial-gradient(ellipse at top left, #e0f7f4 0%, #f1f5f9 60%, #f8fafc 100%);

/* 深色 */
background: radial-gradient(ellipse at top left, #042f2e 0%, #020617 50%, #0f0a1e 100%);
```

## 10. 图标

- 图标库：**lucide-react**
- 在 shadcn/ui 组件中默认使用 Lucide 图标。
- 尺寸规范：`size-4`（辅助）、`size-5`（默认按钮/列表）、`size-6`（空状态/大图标）。

## 11. 布局模式

### 11.1 应用布局

```
┌─────────────────────────────────────┐
│  Sidebar   │        Topbar          │
│  (glass-l1)│        (glass-l2)      │
├────────────┼────────────────────────┤
│            │                        │
│  导航模块   │     主内容区            │
│            │     (glass-l2 背景)     │
│            │                        │
└─────────────────────────────────────┘
```

### 11.2 内容卡片

主内容区内使用 `glass-l3` 卡片承载具体功能面板，关键操作使用 `btn-aurora`。

## 12. 新增组件 checklist

新增 UI 时，请对照以下清单：

- [ ] 颜色是否使用 CSS 变量而非写死值？
- [ ] 玻璃层级是否符合当前组件层级？
- [ ] 是否在浅色模式下测试过表现？
- [ ] 按钮是否满足 `.rules/require-button-interaction.yml` 可交互约束？
- [ ] 是否使用了正确的状态徽章类？
- [ ] 动画时长是否控制在 0.15s ~ 0.3s？
- [ ] 图标是否来自 lucide-react？

## 13. 关键文件

| 文件 | 说明 |
|------|------|
| `src/index.css` | Aurora 设计系统核心：变量、工具类、动画、浅色覆盖 |
| `tailwind.config.js` | Tailwind 主题扩展：颜色、渐变、关键帧 |
| `components.json` | shadcn/ui 配置（new-york 风格、lucide 图标） |
| `src/contexts/AppContext.tsx` | 主题切换与 CSS 变量动态调整 |
| `src/components/settings/AppearanceSettings.tsx` | 主题色、强调色、字体大小设置入口 |

---

> 保持极光点缀、克制用色、层次分明，即可维持 OwlOS 的视觉一致性。
