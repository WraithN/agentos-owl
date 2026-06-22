# 聊天输入框提示词功能设计

## 背景与目标

当前 OwlOS 的提示词（Prompt）已经通过 SQLite 持久化，并在“工具市场 > 提示词”模块中可新增、编辑、删除。但聊天输入框（`ChatComposer`）尚未接入这些提示词，且工具市场中的“添加到常用”按钮未真正生效。

本次设计目标：

1. 确保提示词数据来自 SQLite，创建/编辑/收藏逻辑生效。
2. 在聊天输入框的“技能”按钮右侧新增“常用提示词”图标按钮。
3. 点击后弹出上拉菜单，按 category 分组 Tabs 展示常用提示词，无 category 的归入“未分类”。
4. 所有聊天输入框按钮改为图标按钮，并统一使用 Tooltip 展示功能说明。

## 非目标

- 不改动现有“技能”下拉的功能与数据（本次只新增提示词入口）。
- 不实现提示词搜索/拖拽排序/分类管理等进阶功能。

## 数据模型

在现有 `prompts` 表基础上新增一列：

```sql
ALTER TABLE prompts ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0;
```

完整表结构：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PRIMARY KEY | 提示词 ID |
| name | TEXT NOT NULL | 名称 |
| category | TEXT NOT NULL DEFAULT '' | 分类标签 |
| description | TEXT NOT NULL DEFAULT '' | 描述 |
| content | TEXT NOT NULL DEFAULT '' | 内容 |
| official | INTEGER NOT NULL DEFAULT 0 | 是否官方 |
| is_favorite | INTEGER NOT NULL DEFAULT 0 | **新增：是否常用** |
| tags_json | TEXT NOT NULL DEFAULT '[]' | 标签 JSON |
| created_at | INTEGER NOT NULL | 创建时间戳 |
| updated_at | INTEGER NOT NULL | 更新时间戳 |

## 后端设计

### 迁移

- 文件：`apps/desktop/src/db/migrations.ts`
- 在迁移脚本中检测 `prompts` 表是否存在 `is_favorite` 列，不存在则添加。
- 新增迁移版本号，确保已有数据库也能升级。

### 查询与写入

- 文件：`apps/desktop/src/db/queries/prompts.ts`
  - `listPrompts`：返回 `is_favorite` 字段。
  - `upsertPrompt`：接收 `isFavorite` 并写入 `is_favorite` 列。
  - `getPrompt`：返回 `is_favorite`。

### IPC

- 文件：`apps/desktop/src/ipc/extensions.ts`
  - `save_prompt` handler 接收并保存 `isFavorite`。
  - `list_prompts` / `get_prompt` 返回 `isFavorite`。

### 前端服务类型

- 文件：`apps/web/src/services/electron.ts`
  - `Prompt` 接口增加 `isFavorite: boolean`。
  - `savePrompt` 的 `Partial<Prompt>` 参数已兼容该字段。

## 前端设计

### 工具市场 - 收藏按钮生效

- 文件：`packages/tools/src/components/PromptCard.tsx`
  - 收藏/取消收藏图标按钮调用 `savePrompt({ id, isFavorite: !current })`。
  - 成功后通知父组件刷新列表（通过 `onChange` 或内部重新 `listPrompts()`）。

- 文件：`packages/tools/src/components/ToolsModule.tsx` / `ToolsModuleContainer.tsx`
  - 保存成功后重新调用 `listPrompts()`，确保 UI 与数据库一致。

### 聊天输入框改造

- 文件：`apps/web/src/components/chat/ChatComposer.tsx`

#### 按钮统一为图标 + Tooltip

输入区现有按钮（语音、附件、快捷指令、技能、发送）全部改为图标按钮，并用 shadcn `Tooltip` 包裹，hover 显示中文功能说明。

#### 新增“常用提示词”按钮

- 位置：技能按钮右侧。
- 图标：`BookMarked`（lucide-react）。
- Tooltip：常用提示词。
- 点击后弹出 `Popover`。

#### Popover 内容

- **数据来源**：`listPrompts()` 返回的数据中过滤 `isFavorite === true`。
- **Tabs**：
  - 对常用提示词的 `category` 去重，按字母升序排列生成 Tabs。
  - 若存在 `category === ''` 的提示词，最后一个 Tab 为“未分类”。
- **Tab 内排序**：按 `updatedAt` 倒序（最新设为常用的排在前面）。
- **滚动**：每个 Tab 内容区域使用 `ScrollArea`，最大高度固定。
- **点击行为**：把提示词 `content` 插入到 textarea 当前光标位置；若未聚焦则追加到末尾。
- **空状态**：当没有常用提示词时显示“暂无常用提示词，去提示词市场添加”。
- **数量上限**：最多允许 20 个常用提示词，由配置常量 `MAX_FAVORITE_PROMPTS` 控制。超过时点击“添加到常用”给出 toast 提示且不写入。

### 配置化

- 在 `apps/web/src/components/chat/ChatComposer.tsx` 顶部定义常量：

```ts
const MAX_FAVORITE_PROMPTS = 20;
```

- 不在组件内写魔法数字，也不分散到多处。

## 数据流与时序

1. 应用启动 / 进入工具市场：`ToolsModuleContainer` 调用 `listPrompts()` 加载全部提示词。
2. 用户在工具市场点击“收藏”：`PromptCard` 调用 `savePrompt({ id, isFavorite: true })`。
3. 保存成功后：`ToolsModuleContainer` 重新 `listPrompts()`，更新本地列表。
4. 用户打开聊天输入框的提示词 Popover：`ChatComposer` 调用 `listPrompts()`（或复用已有状态），过滤 `isFavorite` 后渲染 Tabs。
5. 用户点击提示词：把 `content` 插入 textarea。
6. 用户在工具市场取消收藏：同 2-3，Popover 下次打开时不再展示该提示词。

## 错误处理

- `listPrompts()` 失败：Popover 内显示“加载失败，请重试”，并记录 console.error。
- `savePrompt()` 失败：toast 提示“操作失败”，收藏状态不翻转。
- 插入内容失败：console.error，不影响输入框原有内容。

## 测试建议

- 单元测试：
  - `recruitWorkersIfNeeded` 已修复，确保多 Worker 被正确创建（回归）。
  - 提示词按 category 分组逻辑（纯函数）可单独测试。
- 集成测试：
  - 收藏一个提示词后，聊天输入框 Popover 中能看到对应 Tab 和提示词。
  - 取消收藏后，Popover 中不再出现。
- 手工验证：
  - 输入框所有按钮 hover 均有 Tooltip。
  - 常用数量达到 20 后继续添加给出提示。

## 依赖与影响面

- 新增数据库列，需要迁移脚本。
- 前端 `Prompt` 类型扩展，需同步更新 TypeScript 类型。
- 仅影响 `packages/tools` 和 `apps/web/src/components/chat/ChatComposer.tsx`，不改动 Owlery runtime。
