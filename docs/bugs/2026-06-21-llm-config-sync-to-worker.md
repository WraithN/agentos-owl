# 将 LLM 配置同步推送给 Worker 线程，避免 Worker 直接访问数据库

## 现象

上一版本修复了 Worker 线程因未初始化数据库而报错的问题（见 `2026-06-21-worker-database-not-initialized.md`），但实现方式是让每个 Worker 单独调用 `initDatabase()`。这导致数据库读写分散到了 Worker 线程，与"数据库读写只在主线程"的设计目标不符。

## 根本原因

Worker 线程里的 `AgentFactory` 在创建 Agent 时需要读取 LLM 配置（默认模型、API Key 等），因此必须访问 SQLite。即使数据库连接可用，也让 Worker 承担了本不该由它承担的 I/O 职责：

```text
Worker
  └── createOwleryAgentFactory()
        └── driverFactory()
              └── createPlainAgent()
                    └── resolveDefaultLlm()
                          └── getSetting("llmModels")  // 读库
                          └── getSecret(...)           // 读 secure store
```

同时，如果用户在设置中心修改了 LLM 配置，正在运行的 Worker 无法感知新配置。

## 解决方案

改为**主线程预读取 LLM 配置，通过初始化消息传给 Worker；配置变更时再通过 `update_config` 控制命令同步给所有 Worker**。

### 1. 新增配置读取模块

文件：`apps/desktop/src/agent/llmConfig.ts`

```ts
export interface LlmConfig {
  models: LlmModelConfig[];
  apiKey: string;
}

export function readLlmConfig(): LlmConfig {
  // 仅在主线程调用：读取 settings.llmModels 与对应 apiKey
}
```

### 2. Agent 构造支持传入配置

文件：`apps/desktop/src/agent/agent.ts`

- 保留主线程直接读库版本 `createPlainAgent()`，供旧的 IPC 回退 Owlery 使用。
- 新增 `createPlainAgentWithConfig()`，由 Worker 线程使用，不再访问数据库。

### 3. Worker 入口接收配置

文件：`apps/desktop/src/runtime/SessionThreadEntry.ts`

```ts
parentPort?.once("message", (init: WorkerInitMessage) => {
  const runtime = new SessionRuntime({
    sessionId: init.sessionId,
    llmConfig: init.llmConfig,
    port: createRuntimePortFromMessagePort(init.port),
  });
  runtime.run();
});
```

### 4. SessionSlot 主线程读配置并传给 Worker

文件：`apps/desktop/src/owlery/SessionSlot.ts`

`spawn()` 时调用 `readLlmConfig()`，把配置通过初始化消息传给 Worker。

### 5. SessionRuntime 支持配置热更新

文件：`apps/desktop/src/runtime/SessionRuntime.ts`

新增 `update_config` 控制命令处理：

```ts
if (command.type === "update_config") {
  this.llmConfig = command.llmConfig;
  this.agentFactory = createOwleryAgentFactoryWithConfig(command.llmConfig);
  this.elder = undefined; // 下次 start_chat 会使用新配置重新创建 elder
  this.emitStatus();
  return;
}
```

### 6. 配置变更通知所有 Worker

文件：`apps/desktop/src/owlery/Owlery.ts`

```ts
updateLlmConfig(): void {
  const llmConfig = readLlmConfig();
  const command: ControlCommand = { type: "update_config", llmConfig };
  for (const slot of this.slots.values()) {
    slot.sendCommand(command);
  }
}
```

### 7. save_settings 触发同步

文件：`apps/desktop/src/ipc/settings.ts`

保存 `llmModels` 后调用 `notifyLlmConfigUpdate()`，由 `main.ts` 注册的 WebSocket Owlery 引用实际执行 `updateLlmConfig()`。

## 验证结果

- `pnpm typecheck` ✅ 通过
- `pnpm lint` ✅ 通过
- `pnpm test` ✅ 通过（core 17 个测试 + desktop 10 个测试）
- `pnpm build` ✅ 通过
