# 聊天输入框提示词功能实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让提示词收藏状态入库并在聊天输入框中按 category Tabs 展示常用提示词，同时统一输入框按钮为图标 + Tooltip。

**Architecture:** 数据库新增 `is_favorite` 列并迁移；后端 IPC 保存/读取该字段；工具市场收藏按钮通过 IPC 持久化；聊天输入框新增 `PromptPicker` 组件，从 `listPrompts()` 过滤常用并按 category 分 Tabs 渲染，点击插入 textarea 当前光标处。

**Tech Stack:** React + TypeScript + Tailwind + shadcn/ui (Tooltip, Popover, Tabs, ScrollArea) + Electron IPC + better-sqlite3.

---

## 文件结构

| 文件 | 职责 |
|------|------|
| `apps/desktop/src/db/schema.sql` | `prompts` 表新增 `is_favorite` 列 |
| `apps/desktop/src/db/migrations.ts` | 老库增量添加 `is_favorite` 列 |
| `apps/desktop/src/db/queries/prompts.ts` | 查询/保存 `is_favorite` |
| `apps/desktop/src/ipc/extensions.ts` | `save_prompt` 透传 `isFavorite` |
| `apps/web/src/services/electron.ts` | 前端 `Prompt` 类型加 `isFavorite` |
| `packages/tools/src/types.ts` | `PromptItem` 加 `isFavorite` |
| `packages/tools/src/components/PromptCard.tsx` | 收藏按钮调用 dataSource 持久化 |
| `packages/tools/src/components/ToolsModule.tsx` | 去掉本地 `favPrompts`，使用 `isFavorite` + `onToggleFavoritePrompt` |
| `apps/web/src/components/tools/ToolsModule.tsx` | 实现 `onToggleFavoritePrompt` 并刷新列表 |
| `apps/web/src/components/chat/PromptPicker.tsx` | 新增：常用提示词 Popover + Tabs + 插入逻辑 |
| `apps/web/src/components/chat/ChatComposer.tsx` | 接入 `PromptPicker`，所有按钮加 Tooltip |

---

## Task 1: 数据库 schema 与迁移

**Files:**
- Modify: `apps/desktop/src/db/schema.sql:207-217`
- Modify: `apps/desktop/src/db/migrations.ts:11-24, 186-240`

- [ ] **Step 1: 修改 schema.sql 增加 is_favorite 列**

在 `prompts` 表定义中加入 `is_favorite`：

```sql
CREATE TABLE IF NOT EXISTS prompts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  official INTEGER NOT NULL DEFAULT 0,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  tags_json TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

- [ ] **Step 2: 在 migrations.ts 增加幂用迁移函数**

在 `ensureExtensionTables` 之后新增：

```ts
function ensurePromptFavoriteColumn(db: Database.Database): void {
  const cols = tableColumns(db, "prompts");
  if (!cols.has("is_favorite")) {
    db.exec("ALTER TABLE prompts ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0");
  }
}
```

并在 `runMigrations` 中调用：

```ts
export function runMigrations(db: Database.Database): void {
  // ...existing calls
  ensureExtensionTables(db);
  ensurePromptFavoriteColumn(db);
  // ...existing calls
  bumpSchemaVersion(db, 8);
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/db/schema.sql apps/desktop/src/db/migrations.ts
git commit -m "feat(db): add is_favorite column to prompts table"
```

---

## Task 2: 后端查询与 IPC

**Files:**
- Modify: `apps/desktop/src/db/queries/prompts.ts`
- Modify: `apps/desktop/src/ipc/extensions.ts`

- [ ] **Step 1: 更新 prompts.ts 查询和映射**

```ts
const selectColumns = `
  SELECT id, name, category, description, content, official, is_favorite, tags_json,
         created_at, updated_at
  FROM prompts
`;

function mapPrompt(row: Record<string, unknown>): Prompt {
  return {
    id: String(row.id),
    name: String(row.name),
    category: String(row.category ?? ""),
    description: String(row.description ?? ""),
    content: String(row.content ?? ""),
    official: Number(row.official) !== 0,
    isFavorite: Number(row.is_favorite) !== 0,
    tags: fromJson(String(row.tags_json ?? "[]"), []),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export function upsertPrompt(db: Database.Database, prompt: Prompt): void {
  db.prepare(
    `INSERT INTO prompts (id, name, category, description, content, official, is_favorite,
                          tags_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, category = excluded.category, description = excluded.description,
        content = excluded.content, official = excluded.official, is_favorite = excluded.is_favorite,
        tags_json = excluded.tags_json, updated_at = excluded.updated_at`
  ).run(
    prompt.id,
    prompt.name,
    prompt.category,
    prompt.description,
    prompt.content,
    prompt.official ? 1 : 0,
    prompt.isFavorite ? 1 : 0,
    toJson(prompt.tags),
    prompt.createdAt,
    prompt.updatedAt
  );
}
```

- [ ] **Step 2: 更新 extensions.ts save_prompt handler**

```ts
ipcMain.handle("save_prompt", (_event, raw: Partial<Prompt>): Prompt => {
  const db = getDatabase();
  const now = nowMs();
  const prompt: Prompt = {
    id: raw.id ?? uuid(),
    name: raw.name ?? "未命名提示词",
    category: raw.category ?? "通用",
    description: raw.description ?? "",
    content: raw.content ?? "",
    official: raw.official ?? false,
    isFavorite: raw.isFavorite ?? false,
    tags: raw.tags ?? [],
    createdAt: raw.createdAt ?? now,
    updatedAt: now,
  };
  queries.upsertPrompt(db, prompt);
  return prompt;
});
```

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/db/queries/prompts.ts apps/desktop/src/ipc/extensions.ts
git commit -m "feat(ipc,db): persist and return prompt isFavorite"
```

---

## Task 3: 前端类型与工具市场收藏联动

**Files:**
- Modify: `apps/web/src/services/electron.ts`
- Modify: `packages/tools/src/types.ts`
- Modify: `packages/tools/src/components/PromptCard.tsx`
- Modify: `packages/tools/src/components/ToolsModule.tsx`
- Modify: `apps/web/src/components/tools/ToolsModule.tsx`

- [ ] **Step 1: 扩展 Prompt 类型**

`apps/web/src/services/electron.ts`：

```ts
export interface Prompt {
  id: string;
  name: string;
  category: string;
  description: string;
  content: string;
  official: boolean;
  isFavorite: boolean;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}
```

`packages/tools/src/types.ts`：

```ts
export interface PromptItem {
  id: string;
  name: string;
  category: string;
  description: string;
  content: string;
  official: boolean;
  isFavorite: boolean;
  tags: string[];
}
```

- [ ] **Step 2: 在 ToolsModuleDataSource 增加 toggle favorite 接口**

`packages/tools/src/components/ToolsModule.tsx` 的 `ToolsModuleDataSource`：

```ts
export interface ToolsModuleDataSource {
  // ...existing fields
  onToggleFavoritePrompt: (id: string, isFavorite: boolean) => void;
}
```

- [ ] **Step 3: PromptCard 使用 dataSource 的 toggle 回调**

`packages/tools/src/components/PromptCard.tsx`：

```tsx
export default function PromptCard({
  item,
  onDelete,
  onFav,
  onSave,
  index,
}: {
  item: PromptItem;
  onDelete: () => void;
  onFav: () => void;
  onSave: (p: PromptItem) => void;
  index: number;
}) {
  // remove faved prop, use item.isFavorite
}
```

渲染收藏按钮：

```tsx
<button
  type="button"
  onClick={(e) => {
    e.stopPropagation();
    onFav();
  }}
  className={...}
>
  {item.isFavorite ? <Bookmark className="..." /> : <BookmarkIcon className="..." />}
</button>
```

- [ ] **Step 4: ToolsModule 去掉本地 favPrompts，使用 dataSource**

`packages/tools/src/components/ToolsModule.tsx`：

```tsx
<PromptCard
  key={p.id}
  item={p}
  onDelete={() => dataSource.onDeletePrompt(p.id)}
  onFav={() => dataSource.onToggleFavoritePrompt(p.id, !p.isFavorite)}
  onSave={dataSource.onUpdatePrompt}
  index={i}
/>
```

删除 `favPrompts` state 及所有相关逻辑。

- [ ] **Step 5: 容器实现 onToggleFavoritePrompt**

`apps/web/src/components/tools/ToolsModule.tsx`：

```ts
const onToggleFavoritePrompt = useCallback(async (id: string, isFavorite: boolean) => {
  const existing = prompts.find((p) => p.id === id);
  if (!existing) return;
  const saved = await savePrompt({
    id,
    name: existing.name,
    category: existing.category,
    description: existing.description,
    content: existing.content,
    official: existing.official,
    tags: existing.tags,
    isFavorite,
    createdAt: existing.createdAt,
  });
  setPrompts((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
}, [prompts]);
```

同时更新 `promptItems` 映射以透传 `isFavorite`：

```ts
const promptItems: PromptItem[] = useMemo(
  () => prompts.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    description: p.description,
    content: p.content,
    official: p.official,
    isFavorite: p.isFavorite,
    tags: p.tags,
  })),
  [prompts]
);
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/services/electron.ts packages/tools/src/types.ts \
  packages/tools/src/components/PromptCard.tsx \
  packages/tools/src/components/ToolsModule.tsx \
  apps/web/src/components/tools/ToolsModule.tsx
git commit -m "feat(tools): wire prompt favorite toggle to SQLite"
```

---

## Task 4: 新增 PromptPicker 组件

**Files:**
- Create: `apps/web/src/components/chat/PromptPicker.tsx`

- [ ] **Step 1: 创建组件文件**

```tsx
import { useEffect, useMemo, useState } from 'react';
import { Bookmark, Loader2 } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { listPrompts, type Prompt } from '@/services/electron';
import { toast } from 'sonner';

const MAX_FAVORITE_PROMPTS = 20;
const UNCATEGORIZED = '未分类';

interface PromptPickerProps {
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}

function groupFavoritePrompts(prompts: Prompt[]) {
  const favorites = prompts
    .filter((p) => p.isFavorite)
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const categorized = new Map<string, Prompt[]>();
  for (const prompt of favorites) {
    const category = prompt.category.trim() || UNCATEGORIZED;
    if (!categorized.has(category)) categorized.set(category, []);
    categorized.get(category)!.push(prompt);
  }

  const sortedCategories = Array.from(categorized.keys()).sort((a, b) => {
    if (a === UNCATEGORIZED) return 1;
    if (b === UNCATEGORIZED) return -1;
    return a.localeCompare(b, 'zh-CN');
  });

  return { categories: sortedCategories, itemsByCategory: categorized };
}

export function PromptPicker({ inputRef }: PromptPickerProps) {
  const [open, setOpen] = useState(false);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    listPrompts()
      .then(setPrompts)
      .catch((error: unknown) => {
        console.error('加载提示词失败:', error);
        toast.error('加载提示词失败');
      })
      .finally(() => setLoading(false));
  }, [open]);

  const { categories, itemsByCategory } = useMemo(
    () => groupFavoritePrompts(prompts),
    [prompts]
  );

  const insertPrompt = (content: string) => {
    const textarea = inputRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const before = textarea.value.slice(0, start);
    const after = textarea.value.slice(end);
    textarea.value = `${before}${content}${after}`;
    const cursor = start + content.length;
    textarea.setSelectionRange(cursor, cursor);
    textarea.focus();
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    setOpen(false);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                <Bookmark className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 p-0">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : categories.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  暂无常用提示词，去提示词市场添加
                </div>
              ) : (
                <Tabs defaultValue={categories[0]} className="w-full">
                  <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-2">
                    {categories.map((category) => (
                      <TabsTrigger key={category} value={category} className="text-xs">
                        {category}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {categories.map((category) => (
                    <TabsContent key={category} value={category} className="m-0">
                      <ScrollArea className="h-64">
                        <div className="py-1">
                          {itemsByCategory.get(category)?.map((prompt) => (
                            <button
                              key={prompt.id}
                              type="button"
                              onClick={() => insertPrompt(prompt.content)}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                            >
                              <div className="font-medium">{prompt.name}</div>
                              {prompt.description && (
                                <div className="truncate text-xs text-muted-foreground">
                                  {prompt.description}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  ))}
                </Tabs>
              )}
            </PopoverContent>
          </Popover>
        </TooltipTrigger>
        <TooltipContent>
          <p>常用提示词</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/chat/PromptPicker.tsx
git commit -m "feat(chat): add PromptPicker component for favorite prompts"
```

---

## Task 5: ChatComposer 接入 PromptPicker 并统一 Tooltip

**Files:**
- Modify: `apps/web/src/components/chat/ChatComposer.tsx`

- [ ] **Step 1: 引入 PromptPicker 和 TooltipProvider/Tooltip 组件**

在文件顶部引入：

```tsx
import { PromptPicker } from './PromptPicker';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
```

- [ ] **Step 2: 把现有图标按钮包上 Tooltip**

例如语音按钮：

```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={...}>
      <Mic className="h-4 w-4" />
    </Button>
  </TooltipTrigger>
  <TooltipContent>语音输入</TooltipContent>
</Tooltip>
```

对附件、快捷指令、技能、发送按钮同理。若文件内已存在 `TooltipProvider` 包裹，确保只包一层最外层（可在整个按钮组外统一包 `TooltipProvider`）。

- [ ] **Step 3: 在按钮组中插入 PromptPicker**

在技能按钮之后、`TeamSelector` 之前插入：

```tsx
<PromptPicker inputRef={inputRef} />
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/chat/ChatComposer.tsx
git commit -m "feat(chat): integrate PromptPicker and add tooltips to composer buttons"
```

---

## Task 6: 上限校验（20 个常用）

**Files:**
- Modify: `apps/web/src/components/tools/ToolsModule.tsx`
- Modify: `packages/tools/src/components/PromptCard.tsx`

- [ ] **Step 1: 在容器层校验上限**

`apps/web/src/components/tools/ToolsModule.tsx`：

```ts
const MAX_FAVORITE_PROMPTS = 20;

const onToggleFavoritePrompt = useCallback(async (id: string, isFavorite: boolean) => {
  if (isFavorite) {
    const currentCount = prompts.filter((p) => p.isFavorite).length;
    if (currentCount >= MAX_FAVORITE_PROMPTS) {
      toast.info('常用提示词最多 20 个，请先取消部分收藏');
      return;
    }
  }
  // ...existing save logic
}, [prompts]);
```

- [ ] **Step 2: 可选 - 在 PromptCard 视觉提示**

若 `isFavorite === false` 且当前收藏数已达上限，收藏按钮可置灰。该信息通过 dataSource 传入：`favoriteCount` 和 `maxFavoriteCount`，或简单 toast 足够。本计划采用 toast 方案，保持改动最小。

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/tools/ToolsModule.tsx
git commit -m "feat(tools): enforce max 20 favorite prompts"
```

---

## Task 7: 验证

- [ ] **Step 1: 类型与静态检查**

```bash
pnpm typecheck
```

Expected: all packages pass.

- [ ] **Step 2: 代码风格检查**

```bash
pnpm lint
```

Expected: no Biome/ast-grep errors.

- [ ] **Step 3: 运行测试**

```bash
pnpm test
```

Expected: desktop & core tests pass.

- [ ] **Step 4: 构建验证**

```bash
pnpm build
```

Expected: web & desktop build successfully.

- [ ] **Step 5: 手工验证**

1. 打开工具市场 > 提示词，给 3 个不同 category 的提示词点收藏。
2. 打开聊天输入框，点击“常用提示词”图标，确认 Tabs 为 category 名称 + 未分类，点击提示词内容插入输入框。
3. 取消某个收藏，重新打开 Popover，确认该提示词消失。
4. hover 输入框所有图标按钮，确认均有 Tooltip。

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix: address typecheck/lint findings for prompt composer"
```

---

## 自检

- **Spec coverage:**
  - 数据库新增 `is_favorite` → Task 1
  - 后端 IPC 保存/读取 → Task 2
  - 工具市场收藏按钮生效 → Task 3 + Task 6
  - 聊天输入框新增提示词图标按钮 → Task 4 + Task 5
  - 上拉菜单按 category Tabs，无 category 为“未分类” → Task 4 `groupFavoritePrompts`
  - 点击插入当前光标位置 → Task 4 `insertPrompt`
  - 所有按钮改图标 + Tooltip → Task 5
  - 最多 20 个常用，配置化 → Task 6 `MAX_FAVORITE_PROMPTS`

- **Placeholder scan:** 无 TBD/TODO，每步均含具体代码与命令。
- **类型一致性：** `isFavorite` / `is_favorite` 在各层对应明确。
