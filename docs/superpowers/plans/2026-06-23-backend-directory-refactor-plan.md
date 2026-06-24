# 后端目录结构整理实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变任何类/函数/类型签名的前提下，把 `apps/desktop/src` 的后端代码按 `utils/`、`agent-runtime/`、`agent-orchestrator/` 三个顶层目录重新归类。

**Architecture:** 通过 `git mv` 移动文件 + 统一 import 路径更新脚本完成迁移；每阶段独立跑 `lint / test / build` 验证，确保行为不变。

**Tech Stack:** TypeScript 5.9, Node.js 20+, pnpm, Biome, Vitest, Electron, better-sqlite3.

---

## 文件结构总览

迁移后的关键目录：

```
apps/desktop/src/
├── utils/
│   ├── crypto/password.ts          # 原 crypto.ts
│   ├── crypto/secrets.ts           # 原 secure.ts
│   ├── id.ts                       # 原 ipc/_utils.ts: uuid()
│   ├── time.ts                     # 原 ipc/_utils.ts: nowMs() + db/seed/utils.ts
│   ├── json.ts                     # 原 db/queries/_json.ts
│   └── errors.ts                   # 原 ipc/_errors.ts
├── agent-runtime/                  # 原 agent/
│   ├── agent.ts
│   ├── agentNames.ts
│   ├── llmConfig.ts
│   ├── owleryAgentFactory.ts
│   ├── owleryRuntime.ts
│   ├── tools.ts
│   ├── workspacePath.ts
│   ├── drivers/pi/PiAgentDriver.ts
│   ├── drivers/pi/AsyncQueue.ts
│   ├── file-writers/...
│   └── __tests__/PiAgentDriver.test.ts
└── agent-orchestrator/             # 原 runtime/ + owlery/ + eventbus/
    ├── SessionRuntime.ts
    ├── AgentExecutor.ts
    ├── PlannerPipeline.ts
    ├── plannerPrompts.ts
    ├── SessionThreadEntry.ts
    ├── types.ts
    ├── Owlery.ts
    ├── SessionSlot.ts
    ├── eventbus/EventBus.ts
    ├── eventbus/SlotPortAdapter.ts
    ├── eventbus/types.ts
    ├── __tests__/SessionRuntime.test.ts
    ├── __tests__/DynamicRecruitment.test.ts
    ├── __tests__/SessionSlot.test.ts
    └── __tests__/Owlery.integration.test.ts
```

## 通用工具：import 路径更新脚本

 plan 中多次使用同一个 Node.js 脚本完成批量 import 替换。脚本内容如下（保存到 `scripts/update-imports.mjs`）：

```js
import fs from "node:fs";
import path from "node:path";

const ROOT = process.argv[2] || "apps/desktop/src";

const replacements = [
  // Phase 1: utils
  { from: /"\.\.\/\.\.\/crypto\.js"/g, to: '"../../utils/crypto/password.js"' },
  { from: /'\.\.\/\.\.\/crypto\.js'/g, to: "'../../utils/crypto/password.js'" },
  { from: /"\.\.\/secure\.js"/g, to: '"../utils/crypto/secrets.js"' },
  { from: /'\.\.\/secure\.js'/g, to: "'../utils/crypto/secrets.js'" },
  { from: /"\.\.\/\.\.\/secure\.js"/g, to: '"../../utils/crypto/secrets.js"' },
  { from: /'\.\.\/\.\.\/secure\.js'/g, to: "'../../utils/crypto/secrets.js'" },
  { from: /"\.\.\/\.\.\/\.\.\/secure\.js"/g, to: '"../../../utils/crypto/secrets.js"' },
  { from: /'\.\.\/\.\.\/\.\.\/secure\.js'/g, to: "'../../../utils/crypto/secrets.js'" },
  { from: /"\.\.\/_utils\.js"/g, to: '"../utils/time.js"' },
  { from: /'\.\.\/_utils\.js'/g, to: "'../utils/time.js'" },
  { from: /"\.\.\/\.\.\/_utils\.js"/g, to: '"../../utils/time.js"' },
  { from: /'\.\.\/\.\.\/_utils\.js'/g, to: "'../../utils/time.js'" },
  { from: /"\.\.\/_errors\.js"/g, to: '"../utils/errors.js"' },
  { from: /'\.\.\/_errors\.js'/g, to: "'../utils/errors.js'" },
  { from: /"\.\.\/\.\.\/db\/queries\/_json\.js"/g, to: '"../../utils/json.js"' },
  { from: /'\.\.\/\.\.\/db\/queries\/_json\.js'/g, to: "'../../utils/json.js'" },
  { from: /"\.\.\/db\/queries\/_json\.js"/g, to: '"../utils/json.js"' },
  { from: /'\.\.\/db\/queries\/_json\.js'/g, to: "'../utils/json.js'" },
  { from: /"\.\/db\/queries\/_json\.js"/g, to: '"../utils/json.js"' },
  { from: /'\.\/db\/queries\/_json\.js'/g, to: "'../utils/json.js'" },

  // Phase 2: agent -> agent-runtime
  { from: /"\.\.\/agent\//g, to: '"../agent-runtime/' },
  { from: /'\.\.\/agent\//g, to: "'../agent-runtime/" },
  { from: /"\.\.\/\.\.\/agent\//g, to: '"../../agent-runtime/' },
  { from: /'\.\.\/\.\.\/agent\//g, to: "'../../agent-runtime/" },
  { from: /"\.\.\/\.\.\/\.\.\/agent\//g, to: '"../../../agent-runtime/' },
  { from: /'\.\.\/\.\.\/\.\.\/agent\//g, to: "'../../../agent-runtime/" },

  // Phase 3: runtime / owlery / eventbus -> agent-orchestrator
  { from: /"\.\.\/runtime\//g, to: '"../agent-orchestrator/' },
  { from: /'\.\.\/runtime\//g, to: "'../agent-orchestrator/" },
  { from: /"\.\.\/owlery\//g, to: '"../agent-orchestrator/' },
  { from: /'\.\.\/owlery\//g, to: "'../agent-orchestrator/" },
  { from: /"\.\.\/eventbus\//g, to: '"../agent-orchestrator/eventbus/' },
  { from: /'\.\.\/eventbus\//g, to: "'../agent-orchestrator/eventbus/" },
];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      walk(full);
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx") || entry.name.endsWith(".mjs")) {
      let content = fs.readFileSync(full, "utf-8");
      const original = content;
      for (const { from, to } of replacements) {
        content = content.replace(from, to);
      }
      if (content !== original) {
        fs.writeFileSync(full, content);
        console.log(`updated: ${full}`);
      }
    }
  }
}

walk(ROOT);
```

> 说明：该脚本会**全局替换** import 路径。执行前必须确保工作区干净，执行后通过 `git diff` 检查，避免误改非 import 字符串。

---

## Task 1: Phase 1 — 整理 utils

**Files:**
- Create: `apps/desktop/src/utils/crypto/password.ts`
- Create: `apps/desktop/src/utils/crypto/secrets.ts`
- Create: `apps/desktop/src/utils/id.ts`
- Create: `apps/desktop/src/utils/time.ts`
- Create: `apps/desktop/src/utils/json.ts`
- Create: `apps/desktop/src/utils/errors.ts`
- Modify: `apps/desktop/src/db/queries/index.ts`
- Modify: `apps/desktop/src/db/seed/*.ts`
- Modify: `apps/desktop/src/ipc/*.ts`
- Modify: `apps/desktop/src/db/migrations.ts`
- Modify: `apps/desktop/src/agent/agent.ts`
- Modify: `apps/desktop/src/agent/llmConfig.ts`
- Delete: `apps/desktop/src/crypto.ts`
- Delete: `apps/desktop/src/secure.ts`
- Delete: `apps/desktop/src/ipc/_utils.ts`
- Delete: `apps/desktop/src/ipc/_errors.ts`
- Delete: `apps/desktop/src/db/queries/_json.ts`
- Delete: `apps/desktop/src/db/seed/utils.ts`

- [ ] **Step 1: 创建 utils 目录并迁移文件**

```bash
cd apps/desktop/src
mkdir -p utils/crypto

git mv crypto.ts utils/crypto/password.ts
git mv secure.ts utils/crypto/secrets.ts
git mv db/queries/_json.ts utils/json.ts
git mv ipc/_errors.ts utils/errors.ts
rm ipc/_utils.ts
rm db/seed/utils.ts
```

- [ ] **Step 2: 创建新的 utils 文件**

`utils/id.ts`：

```ts
import { randomUUID } from "node:crypto";

export function uuid(): string {
  return randomUUID();
}
```

`utils/time.ts`：

```ts
export function nowMs(): number {
  return Date.now();
}

export function now(): number {
  return Date.now();
}

export function daysAgo(days: number): number {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}
```

`utils/crypto/password.ts`（复制原 `crypto.ts` 内容）。

`utils/crypto/secrets.ts`（复制原 `secure.ts` 内容）。

`utils/json.ts`（复制原 `db/queries/_json.ts` 内容）。

`utils/errors.ts`（复制原 `ipc/_errors.ts` 内容）。

- [ ] **Step 3: 更新 seed 文件引用**

将所有 `db/seed/*.ts` 中的：

```ts
import { daysAgo } from "./utils.js";
import { now } from "./utils.js";
import { argonHash, now } from "./utils.js";
```

分别替换为：

```ts
import { daysAgo } from "../../utils/time.js";
import { now } from "../../utils/time.js";
import { now } from "../../utils/time.js";
import { hash as argonHash } from "../../utils/crypto/password.js";
```

- [ ] **Step 4: 批量更新所有 TypeScript 文件的 import 路径**

```bash
node scripts/update-imports.mjs apps/desktop/src
```

- [ ] **Step 5: 检查并修正 uuid / nowMs 拆分后的 import**

原 `ipc/_utils.ts` 同时导出 `uuid()` 和 `nowMs()`。迁移后：

- 需要 `uuid()` 的文件改为 `import { uuid } from "../utils/id.js";`
- 需要 `nowMs()` 的文件改为 `import { nowMs } from "../utils/time.js";`

运行以下命令检查是否仍有引用 `utils/time.js` 中不存在的 `uuid` 或 `utils/id.js` 中不存在的 `nowMs`：

```bash
cd apps/desktop/src
grep -R "from \"[^\"]*utils/time.js\"" --include="*.ts" ipc/ | grep -i uuid || true
grep -R "from \"[^\"]*utils/id.js\"" --include="*.ts" ipc/ | grep -i nowMs || true
```

如有，手动拆分为对应 import。

- [ ] **Step 6: 更新 db/queries/index.ts**

原 `db/queries/index.ts` 有：

```ts
export * from "./_json.js";
```

改为：

```ts
export { fromJson, toJson } from "../../utils/json.js";
```

这样外部若通过 `db/queries/index.js` 使用 `fromJson/toJson` 仍可用。

- [ ] **Step 7: 验证 Phase 1**

```bash
pnpm --filter @owl-os/desktop typecheck
pnpm test
pnpm lint
pnpm build
```

全部通过后方可进入 Phase 2。

---

## Task 2: Phase 2 — agent/ → agent-runtime/

**Files:**
- Move all files under `apps/desktop/src/agent/` to `apps/desktop/src/agent-runtime/`
- Move: `apps/desktop/src/__tests__/PiAgentDriver.test.ts` → `apps/desktop/src/agent-runtime/__tests__/PiAgentDriver.test.ts`
- Modify: 所有引用 `../agent/`、`../../agent/`、`../../../agent/` 的文件

- [ ] **Step 1: 重命名 agent 目录**

```bash
cd apps/desktop/src
git mv agent agent-runtime
```

- [ ] **Step 2: 移动 PiAgentDriver 测试到 agent-runtime/__tests__**

```bash
cd apps/desktop/src
mkdir -p agent-runtime/__tests__
git mv __tests__/PiAgentDriver.test.ts agent-runtime/__tests__/PiAgentDriver.test.ts
```

- [ ] **Step 3: 批量替换 agent/ import 为 agent-runtime/**

```bash
node scripts/update-imports.mjs apps/desktop/src
```

- [ ] **Step 4: 验证 Phase 2**

```bash
pnpm --filter @owl-os/desktop typecheck
pnpm test
pnpm lint
pnpm build
```

---

## Task 3: Phase 3 — runtime/ + owlery/ + eventbus/ → agent-orchestrator/

**Files:**
- Move all files under `apps/desktop/src/runtime/` to `apps/desktop/src/agent-orchestrator/`
- Move all files under `apps/desktop/src/owlery/` to `apps/desktop/src/agent-orchestrator/`
- Move `apps/desktop/src/eventbus/` to `apps/desktop/src/agent-orchestrator/eventbus/`
- Move tests:
  - `apps/desktop/src/runtime/__tests__/SessionRuntime.test.ts` → `apps/desktop/src/agent-orchestrator/__tests__/SessionRuntime.test.ts`
  - `apps/desktop/src/runtime/__tests__/DynamicRecruitment.test.ts` → `apps/desktop/src/agent-orchestrator/__tests__/DynamicRecruitment.test.ts`
  - `apps/desktop/src/owlery/SessionSlot.test.ts` → `apps/desktop/src/agent-orchestrator/__tests__/SessionSlot.test.ts`
  - `apps/desktop/src/owlery/__tests__/Owlery.integration.test.ts` → `apps/desktop/src/agent-orchestrator/__tests__/Owlery.integration.test.ts`
- Modify: `apps/desktop/src/main.ts`
- Modify: `apps/desktop/src/ipc/owlery.ts`
- Modify: `apps/desktop/src/ipc/settings.ts`
- Modify: `apps/desktop/src/__tests__/EventBus.test.ts`
- Modify: `apps/desktop/src/agent-runtime/owleryAgentFactory.ts`（若引用了 runtime？一般没有）
- Modify: `apps/desktop/src/agent-runtime/owleryRuntime.ts`

- [ ] **Step 1: 创建 agent-orchestrator 并迁移 runtime / owlery / eventbus**

```bash
cd apps/desktop/src
mkdir -p agent-orchestrator/__tests__

git mv runtime/* agent-orchestrator/
git mv owlery/* agent-orchestrator/
git mv eventbus agent-orchestrator/eventbus
rmdir runtime owlery
```

> 注意：`runtime/__tests__` 和 `owlery/__tests__` 已随父目录移动，后续再重命名/合并到 `agent-orchestrator/__tests__`。

- [ ] **Step 2: 合并测试文件到 agent-orchestrator/__tests__**

```bash
cd apps/desktop/src/agent-orchestrator
mv runtime/__tests__/SessionRuntime.test.ts __tests__/SessionRuntime.test.ts
mv runtime/__tests__/DynamicRecruitment.test.ts __tests__/DynamicRecruitment.test.ts
mv SessionSlot.test.ts __tests__/SessionSlot.test.ts
mv owlery/__tests__/Owlery.integration.test.ts __tests__/Owlery.integration.test.ts
rmdir runtime/__tests__ runtime owlery/__tests__ owlery
```

- [ ] **Step 3: 批量替换 runtime/ / owlery/ / eventbus/ import**

```bash
node scripts/update-imports.mjs apps/desktop/src
```

- [ ] **Step 4: 修正同目录内相对路径**

迁移后，以下内部相对 import 需要调整：

| 原 import | 新 import |
|---|---|
| `Owlery.ts` 中 `from "../eventbus/EventBus.js"` | `from "./eventbus/EventBus.js"` |
| `Owlery.ts` 中 `from "../eventbus/SlotPortAdapter.js"` | `from "./eventbus/SlotPortAdapter.js"` |
| `Owlery.ts` 中 `from "../eventbus/types.js"` | `from "./eventbus/types.js"` |
| `SessionSlot.ts` 中 `from "../eventbus/types.js"` | `from "./eventbus/types.js"` |
| `eventbus/SlotPortAdapter.ts` 中 `from "../owlery/SessionSlot.js"` | `from "../SessionSlot.js"` |
| `runtime/types.ts` 中 `from "../eventbus/types.js"` | `from "./eventbus/types.js"` |
| `SessionRuntime.ts` 中 `from "../eventbus/types.js"` | `from "./eventbus/types.js"` |

执行脚本后，上述路径可能仍是 `../agent-orchestrator/eventbus/...` 或 `../agent-orchestrator/SessionSlot.js`，需要手工改为同目录相对路径。

```bash
cd apps/desktop/src/agent-orchestrator
sed -i 's|from "\.\.\/agent-orchestrator\/eventbus\/|from "./eventbus/|g' Owlery.ts SessionSlot.ts types.ts SessionRuntime.ts
sed -i "s|from '\.\./agent-orchestrator/eventbus/|from './eventbus/|g" Owlery.ts SessionSlot.ts types.ts SessionRuntime.ts
sed -i 's|from "\.\.\/agent-orchestrator\/SessionSlot\.js"|from "./SessionSlot.js"|g' eventbus/SlotPortAdapter.ts
sed -i "s|from '\.\./agent-orchestrator/SessionSlot\.js'|from './SessionSlot.js'|g" eventbus/SlotPortAdapter.ts
```

- [ ] **Step 5: 修正 agent-runtime 相关 import**

Phase 3 之后，`agent-orchestrator/` 内文件引用 `../agent/...` 的，应改为 `../agent-runtime/...`。`update-imports.mjs` 已在 Phase 2 处理过 `agent/`，但 Phase 3 新增文件（来自 runtime/owlery/eventbus）中可能仍有 `../agent/` 引用，需要再跑一次脚本或单独检查：

```bash
node scripts/update-imports.mjs apps/desktop/src
```

- [ ] **Step 6: 更新测试文件中的相对路径**

测试文件从 `runtime/__tests__` / `owlery/__tests__` 移到 `agent-orchestrator/__tests__` 后，原来的 `../../eventbus/types.js` 等引用需要改为 `../eventbus/types.js` 或 `./eventbus/types.js`。

手工检查并修正以下测试文件：

- `agent-orchestrator/__tests__/SessionRuntime.test.ts`
- `agent-orchestrator/__tests__/DynamicRecruitment.test.ts`
- `agent-orchestrator/__tests__/SessionSlot.test.ts`
- `agent-orchestrator/__tests__/Owlery.integration.test.ts`
- `__tests__/EventBus.test.ts`（顶层，引用 `../eventbus/...` → `../agent-orchestrator/eventbus/...`）

- [ ] **Step 7: 验证 Phase 3**

```bash
pnpm --filter @owl-os/desktop typecheck
pnpm test
pnpm lint
pnpm build
```

---

## Task 4: 清理与最终验证

- [ ] **Step 1: 确认没有残留空目录或旧文件**

```bash
cd apps/desktop/src
ls agent 2>/dev/null && echo "ERROR: agent/ still exists" || true
ls runtime 2>/dev/null && echo "ERROR: runtime/ still exists" || true
ls owlery 2>/dev/null && echo "ERROR: owlery/ still exists" || true
ls eventbus 2>/dev/null && echo "ERROR: eventbus/ still exists" || true
ls ipc/_utils.ts 2>/dev/null && echo "ERROR: ipc/_utils.ts still exists" || true
ls ipc/_errors.ts 2>/dev/null && echo "ERROR: ipc/_errors.ts still exists" || true
ls db/queries/_json.ts 2>/dev/null && echo "ERROR: db/queries/_json.ts still exists" || true
ls db/seed/utils.ts 2>/dev/null && echo "ERROR: db/seed/utils.ts still exists" || true
ls crypto.ts 2>/dev/null && echo "ERROR: crypto.ts still exists" || true
ls secure.ts 2>/dev/null && echo "ERROR: secure.ts still exists" || true
```

- [ ] **Step 2: 检查是否仍有引用旧路径的 import**

```bash
cd apps/desktop/src
grep -R "from \"[^\"]*\/agent/" --include="*.ts" . || true
grep -R "from \"[^\"]*\/runtime/" --include="*.ts" . || true
grep -R "from \"[^\"]*\/owlery/" --include="*.ts" . || true
grep -R "from \"[^\"]*\/eventbus/" --include="*.ts" . || true
grep -R "_utils\.js\"" --include="*.ts" . || true
grep -R "_errors\.js\"" --include="*.ts" . || true
grep -R "_json\.js\"" --include="*.ts" . || true
grep -R "secure\.js\"" --include="*.ts" . || true
grep -R "crypto\.js\"" --include="*.ts" . || true
```

以上命令应无输出（或只有历史注释/文档）。

- [ ] **Step 3: 最终全量验证**

```bash
pnpm lint
pnpm test
pnpm build
```

- [ ] **Step 4: 提交变更**

```bash
git add -A
git commit -m "refactor(desktop): restructure backend into utils / agent-runtime / agent-orchestrator"
```

---

## Spec 覆盖自检

| Spec 要求 | 对应 Task |
|---|---|
| 建立 `utils/` 统一内部工具 | Task 1 |
| `crypto.ts` → `utils/crypto/password.ts` | Task 1 Step 1-2 |
| `secure.ts` → `utils/crypto/secrets.ts` | Task 1 Step 1-2 |
| `ipc/_utils.ts` 删除，拆分到 `utils/id.ts` / `utils/time.ts` | Task 1 Step 1、5 |
| `db/seed/utils.ts` 删除，引用迁到 utils | Task 1 Step 3 |
| `db/queries/_json.ts` → `utils/json.ts` | Task 1 Step 1、6 |
| `ipc/_errors.ts` → `utils/errors.ts` | Task 1 Step 1-2 |
| `agent/` → `agent-runtime/` | Task 2 |
| `runtime/` + `owlery/` + `eventbus/` → `agent-orchestrator/` | Task 3 |
| 每阶段跑 lint / test / build | Task 1/2/3 Step 验证 |
| 不改接口签名 | 计划中所有改动均为文件路径/import |

## 无 Placeholder 自检

- 无 "TBD" / "TODO" / "implement later"。
- 所有步骤包含具体命令或代码。
- 所有文件路径为相对仓库根的实际路径。
- 验证命令明确。
