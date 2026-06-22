# Worker 线程未初始化数据库导致对话报错

## 现象

启动应用后，在单 Agent 对话界面发送第一条消息时，主进程控制台出现错误：

```
Error: 数据库尚未初始化，请先调用 initDatabase()
```

随后该会话的 worker 崩溃，前端一直显示“正在思考…”。

## 根本原因

### 主进程的数据库初始化是正常的

`apps/desktop/src/main.ts` 在 `app.whenReady()` 中正确执行了：

```ts
await initDatabase();
registerIpcHandlers();
new WebSocketOwlery({ webSocketPort });
```

因此 IPC 路径和传统在主进程内运行的 Owlery 都能正常访问数据库。

### 新的 WebSocket Owlery 使用了 worker 线程

新的 Owlery 架构（`apps/desktop/src/owlery/`、`apps/desktop/src/runtime/` 等）为每个会话启动一个 `worker_threads` Worker：

```ts
// apps/desktop/src/owlery/SessionSlot.ts
const worker = new Worker(this.options.threadEntryPath);
```

Worker 入口 `apps/desktop/src/runtime/SessionThreadEntry.ts` 会创建 `SessionRuntime`，其中通过 `createOwleryAgentFactory()` 最终调用 `apps/desktop/src/agent/agent.ts`。`agent.ts` 在构造 Agent 时需要读取数据库中的 LLM 设置：

```ts
function getSetting(key: string): string | undefined {
  return queries.getSetting(getDatabase(), key);
}
```

`getDatabase()` 检查模块级变量 `db`，如果为 `null` 就抛出“数据库尚未初始化”。

**Worker 线程拥有独立的 JavaScript 上下文和模块状态**，主进程调用过的 `initDatabase()` 不会同步到 Worker 中。因此 Worker 在读取 LLM 配置时触发该错误。

### schema.sql 路径问题

即便在 Worker 入口调用 `initDatabase()`，还需要保证 Worker 构建产物能定位到 `schema.sql`：

- `main.cjs` 位于 `dist/main/`，使用 `../db/schema.sql` 会定位到 `dist/db/schema.sql`。
- `runtime/SessionThreadEntry.cjs` 位于 `dist/main/runtime/`，使用 `../db/schema.sql` 会定位到 `dist/main/db/schema.sql`。

原构建配置只把 `schema.sql` 复制到 `dist/db/`，导致 Worker 初始化时找不到 schema 文件。

## 解决方案

### 1. 在 Worker 入口初始化数据库

文件：`apps/desktop/src/runtime/SessionThreadEntry.ts`

```ts
import { initDatabase } from "../db/connection.js";

parentPort?.once("message", async (init: WorkerInitMessage) => {
  await initDatabase();
  const runtime = new SessionRuntime({ ... });
  runtime.run();
});
```

这样每个 Worker 在创建 Agent 之前都会先完成自己的数据库连接初始化。

### 2. 为 Worker 构建产物复制 schema.sql

文件：`apps/desktop/vite.main.config.ts`

在 `viteStaticCopy` 中增加一个目标，把 `schema.sql` 同时复制到 `dist/main/db/`，让 `dist/main/runtime/SessionThreadEntry.cjs` 通过 `../db/schema.sql` 也能找到它。

## 验证结果

- `pnpm typecheck` ✅ 通过
- `pnpm lint` ✅ 通过
- `pnpm test` ✅ 通过（core 17 个测试 + desktop 10 个测试）
- `pnpm build` ✅ 通过
- 构建后 `dist/db/schema.sql` 与 `dist/main/db/schema.sql` 均存在
