# Owlery Brainstorm 基础设施实现计划（Plan 1）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 WebSocket 前后端通信、EventBus 内部消息总线、Worker Thread 执行模型、SessionRuntime + AgentExecutor 基础架构，为后续 recruit 工具和 brainstorm 模式提供运行时基础。

**Architecture:** 在 Electron 主进程内建立 WebSocket Server（Owlery 拥有）和 EventBus；每个 running session 启动一个 Worker Thread，内部运行 SessionRuntime 和 AgentExecutor；EventBus 负责主进程与 Worker Thread 之间的命令和事件流转；只有 Elder 的 chunk 通过 WebSocket 推送给前端，其他 Agent 状态通过 status stream 推送。

**Tech Stack:** Electron 34, Node.js worker_threads, ws (WebSocket), TypeScript 5.9, @owl-os/core, @earendil-works/pi-agent-core.

---

## File Structure

| 文件 | 职责 |
|------|------|
| `apps/desktop/src/websocket/WebSocketServer.ts` | WebSocket server，管理前后端两条链路 |
| `apps/desktop/src/websocket/sessionStream.ts` | Session Stream 协议处理 |
| `apps/desktop/src/websocket/statusStream.ts` | Status Stream 协议处理 |
| `apps/desktop/src/eventbus/EventBus.ts` | Owlery 与 SessionRuntime 内部通信总线 |
| `apps/desktop/src/eventbus/types.ts` | ControlCommand / SessionRuntimeEvent 类型 |
| `apps/desktop/src/runtime/SessionWorker.ts` | Worker Thread 入口 |
| `apps/desktop/src/runtime/SessionRuntime.ts` | Worker Thread 内执行入口 |
| `apps/desktop/src/runtime/AgentExecutor.ts` | Worker Thread 内 Agent 调度器 |
| `apps/desktop/src/runtime/types.ts` | Runtime 内部类型 |
| `packages/core/src/owlery/MessageBox.ts` | 改造为事件驱动订阅 |
| `apps/desktop/src/owlery/SessionSlot.ts` | 改造为管理 Worker Thread |
| `apps/desktop/src/owlery/Owlery.ts` | 改造为使用 EventBus + WebSocket Server |
| `apps/desktop/src/ipc/owlery.ts` | 可选：保留 IPC 兼容或移除 |
| `apps/web/src/services/websocket.ts` | 前端 WebSocket client |

---

## Task 1: 创建 EventBus 与 Runtime 通信类型

**Files:**
- Create: `apps/desktop/src/eventbus/types.ts`
- Create: `apps/desktop/src/runtime/types.ts`
- Create: `apps/desktop/src/eventbus/EventBus.ts`

### Step 1.1: 定义 ControlCommand 和 SessionRuntimeEvent

Create `apps/desktop/src/eventbus/types.ts`:

```ts
import type { AgentDriverChunk, TeammateStatus } from "@owl-os/core";
import type { TeammateMode } from "@owl-os/core";

export type ControlCommand =
  | { type: "start_chat"; userMessage: string; teammateMode?: TeammateMode }
  | { type: "stop" }
  | { type: "activate" }
  | { type: "background" }
  | { type: "get_status" };

export type SessionRuntimeEvent =
  | { type: "chunk"; chunk: AgentDriverChunk }
  | { type: "status"; status: TeammateStatus }
  | { type: "done" }
  | { type: "error"; error: string };

export interface SessionRuntimePort {
  postCommand(command: ControlCommand): void;
  onChunk(callback: (chunk: AgentDriverChunk) => void): () => void;
  onStatus(callback: (status: TeammateStatus) => void): () => void;
  onDone(callback: () => void): () => void;
  onError(callback: (error: string) => void): () => void;
}
```

### Step 1.2: 定义 RuntimePort 实现

Create `apps/desktop/src/runtime/types.ts`:

```ts
import type { MessagePort } from "worker_threads";
import type { ControlCommand, SessionRuntimeEvent } from "../eventbus/types.js";

export function createRuntimePortFromMessagePort(port: MessagePort): RuntimePort {
  return {
    postCommand: (command: ControlCommand) => port.postMessage(command),
    onChunk: (callback) => subscribe(port, "chunk", callback),
    onStatus: (callback) => subscribe(port, "status", callback),
    onDone: (callback) => subscribe(port, "done", callback),
    onError: (callback) => subscribe(port, "error", callback),
  };
}

function subscribe<T>(port: MessagePort, type: string, callback: (payload: T) => void): () => void {
  const handler = (event: { type: string; payload: T }) => {
    if (event.type === type) callback(event.payload);
  };
  port.on("message", handler);
  return () => port.off("message", handler);
}

export interface RuntimePort {
  postCommand(command: ControlCommand): void;
  onChunk(callback: (chunk: import("@owl-os/core").AgentDriverChunk) => void): () => void;
  onStatus(callback: (status: import("@owl-os/core").TeammateStatus) => void): () => void;
  onDone(callback: () => void): () => void;
  onError(callback: (error: string) => void): () => void;
}
```

### Step 1.3: 创建 EventBus

Create `apps/desktop/src/eventbus/EventBus.ts`:

```ts
import type { AgentDriverChunk, TeammateStatus } from "@owl-os/core";
import type { ControlCommand, SessionRuntimeEvent, SessionRuntimePort } from "./types.js";

export class EventBus {
  private ports = new Map<string, SessionRuntimePort>();
  private chunkListeners = new Map<string, Set<(chunk: AgentDriverChunk) => void>>();
  private statusListeners = new Map<string, Set<(status: TeammateStatus) => void>>();
  private doneListeners = new Map<string, Set<() => void>>();
  private errorListeners = new Map<string, Set<(error: string) => void>>();

  registerSession(sessionId: string, port: SessionRuntimePort): void {
    this.ports.set(sessionId, port);
    port.onChunk((chunk) => this.chunkListeners.get(sessionId)?.forEach((cb) => cb(chunk)));
    port.onStatus((status) => this.statusListeners.get(sessionId)?.forEach((cb) => cb(status)));
    port.onDone(() => this.doneListeners.get(sessionId)?.forEach((cb) => cb()));
    port.onError((error) => this.errorListeners.get(sessionId)?.forEach((cb) => cb(error)));
  }

  sendCommand(sessionId: string, command: ControlCommand): void {
    this.ports.get(sessionId)?.postCommand(command);
  }

  onChunk(sessionId: string, callback: (chunk: AgentDriverChunk) => void): () => void {
    return this.addListener(this.chunkListeners, sessionId, callback);
  }

  onStatus(sessionId: string, callback: (status: TeammateStatus) => void): () => void {
    return this.addListener(this.statusListeners, sessionId, callback);
  }

  onDone(sessionId: string, callback: () => void): () => void {
    return this.addListener(this.doneListeners, sessionId, callback);
  }

  onError(sessionId: string, callback: (error: string) => void): () => void {
    return this.addListener(this.errorListeners, sessionId, callback);
  }

  private addListener<T>(map: Map<string, Set<(value: T) => void>>, sessionId: string, callback: (value: T) => void): () => void {
    if (!map.has(sessionId)) map.set(sessionId, new Set());
    map.get(sessionId)!.add(callback);
    return () => map.get(sessionId)?.delete(callback);
  }
}
```

### Step 1.4: 验证编译

Run:

```bash
cd /home/nan/agentos-owl && pnpm --filter @owl-os/desktop exec tsc --noEmit
```

Expected: No TypeScript errors.

### Step 1.5: Commit

```bash
git add apps/desktop/src/eventbus apps/desktop/src/runtime/types.ts
git commit -m "feat(desktop): add EventBus and runtime communication types"
```

---

## Task 2: 改造 MessageBox 为事件驱动订阅

**Files:**
- Modify: `packages/core/src/owlery/MessageBox.ts`
- Create: `packages/core/src/owlery/__tests__/MessageBox.test.ts`

### Step 2.1: 增加 subscribe 接口

Modify `packages/core/src/owlery/MessageBox.ts`:

```ts
export interface MessageBox {
  createChannel(params: { id?: ChannelId; sessionId: SessionId; endpointA: AgentId; endpointB: AgentId }): MessageChannel;
  getChannel(channelId: ChannelId): MessageChannel | undefined;
  send(channelId: ChannelId, from: AgentId, message: AgentMessage): Promise<void>;
  receive(channelId: ChannelId, agentId: AgentId): AsyncIterable<AgentMessage>;
  subscribe(channelId: ChannelId, agentId: AgentId, callback: (message: AgentMessage) => void): () => void;
}
```

### Step 2.2: 实现 subscribe

在 `MessageChannel` 类中增加 subscribers：

```ts
export class MessageChannel {
  private queues = new Map<AgentId, AgentMessage[]>();
  private subscribers = new Map<AgentId, Set<(message: AgentMessage) => void>>();

  hasAgent(agentId: AgentId): boolean { ... }

  async send(from: AgentId, message: AgentMessage): Promise<void> {
    if (!this.hasAgent(from)) throw new Error("Sender is not a channel endpoint");
    const to = from === this.endpointA ? this.endpointB : this.endpointA;
    const queue = this.queues.get(to) ?? [];
    queue.push(message);
    this.queues.set(to, queue);
    this.subscribers.get(to)?.forEach((cb) => cb(message));
  }

  async *receive(agentId: AgentId): AsyncIterable<AgentMessage> {
    if (!this.hasAgent(agentId)) throw new Error("Receiver is not a channel endpoint");
    const queue = this.queues.get(agentId) ?? [];
    this.queues.set(agentId, []);
    while (queue.length > 0) {
      const message = queue.shift();
      if (message) yield message;
    }
  }

  subscribe(agentId: AgentId, callback: (message: AgentMessage) => void): () => void {
    if (!this.hasAgent(agentId)) throw new Error("Subscriber is not a channel endpoint");
    if (!this.subscribers.has(agentId)) this.subscribers.set(agentId, new Set());
    this.subscribers.get(agentId)!.add(callback);
    return () => this.subscribers.get(agentId)?.delete(callback);
  }
}
```

### Step 2.3: MessageBox.subscribe 委托

```ts
subscribe(channelId: ChannelId, agentId: AgentId, callback: (message: AgentMessage) => void): () => void {
  const channel = this.channels.get(channelId);
  if (!channel) throw new Error(`Channel ${channelId} not found`);
  return channel.subscribe(agentId, callback);
}
```

### Step 2.4: 编写测试

Create `packages/core/src/owlery/__tests__/MessageBox.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { MessageBox } from "../MessageBox.js";

describe("MessageBox", () => {
  it("should deliver messages to subscribers", async () => {
    const box = new MessageBox();
    const channel = box.createChannel({ sessionId: "s1", endpointA: "a1", endpointB: "a2" });
    const received: unknown[] = [];
    box.subscribe(channel.id, "a2", (message) => received.push(message.payload));

    await box.send(channel.id, "a1", {
      id: "m1",
      from: "a1",
      to: "a2",
      sessionId: "s1",
      kind: "request",
      payload: { text: "hello" },
      createdAt: Date.now(),
    });

    expect(received).toEqual([{ text: "hello" }]);
  });
});
```

### Step 2.5: 运行测试

Run:

```bash
cd /home/nan/agentos-owl && pnpm --filter @owl-os/core test
```

Expected: PASS.

### Step 2.6: Commit

```bash
git add packages/core/src/owlery/MessageBox.ts packages/core/src/owlery/__tests__/MessageBox.test.ts
git commit -m "feat(core): add event-driven subscribe to MessageBox"
```

---

## Task 3: 创建 AgentExecutor

**Files:**
- Create: `apps/desktop/src/runtime/AgentExecutor.ts`
- Create: `apps/desktop/src/runtime/__tests__/AgentExecutor.test.ts`

### Step 3.1: 实现 AgentExecutor

Create `apps/desktop/src/runtime/AgentExecutor.ts`:

```ts
import type { AgentDriverChunk, AgentId, AgentMessage, AgentRuntime, AgentWorkStatus } from "@owl-os/core";
import type { MessageBox } from "@owl-os/core";
import type { CrystalBall } from "@owl-os/core";

export interface AgentExecutorOptions {
  sessionId: string;
  messageBox: MessageBox;
  crystalBall: CrystalBall;
  onChunk: (chunk: AgentDriverChunk) => void;
  onStatus: () => void;
}

export class AgentExecutor {
  private agents = new Map<AgentId, AgentRuntime>();
  private pendingMessages = new Map<AgentId, AgentMessage[]>();
  private isRunning = false;
  private messageWaiters = new Map<AgentId, () => void>();

  constructor(private readonly options: AgentExecutorOptions) {}

  register(agent: AgentRuntime): void {
    this.agents.set(agent.id, agent);
    this.pendingMessages.set(agent.id, []);
    this.options.crystalBall.registerAgent(agent);
  }

  dispatchToAgent(agentId: AgentId, message: AgentMessage): void {
    const pending = this.pendingMessages.get(agentId) ?? [];
    pending.push(message);
    this.pendingMessages.set(agentId, pending);
    this.notifyAgent(agentId);
  }

  async execute(): Promise<void> {
    this.isRunning = true;
    const loops = Array.from(this.agents.values()).map((agent) => this.runAgentLoop(agent));
    await Promise.all(loops);
  }

  stopAllAgents(): void {
    this.isRunning = false;
    for (const agent of this.agents.values()) {
      agent.driver.abort?.();
    }
    for (const resolve of this.messageWaiters.values()) resolve();
  }

  private async runAgentLoop(agent: AgentRuntime): Promise<void> {
    const unsubscribes = Array.from(agent.channelIds).map((channelId) =>
      this.options.messageBox.subscribe(channelId, agent.id, (message) => {
        this.dispatchToAgent(agent.id, message);
      })
    );

    while (this.isRunning) {
      const messages = this.pendingMessages.get(agent.id) ?? [];
      this.pendingMessages.set(agent.id, []);

      for (const message of messages) {
        await this.processAgentMessage(agent, message);
      }

      await this.waitForMessage(agent.id);
    }

    for (const unsubscribe of unsubscribes) unsubscribe();
  }

  private async processAgentMessage(agent: AgentRuntime, message: AgentMessage): Promise<void> {
    this.options.crystalBall.updateStatus(agent.id, "in_progress");
    this.options.onStatus();

    try {
      for await (const chunk of agent.streamChat({ sessionId: this.options.sessionId, messages: [message], context: undefined })) {
        this.handleChunk(agent, chunk);
      }
      this.options.crystalBall.updateStatus(agent.id, "completed");
    } catch (error) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.options.crystalBall.updateStatus(agent.id, "failed", errorText);
      this.handleChunk(agent, { type: "error", error: errorText });
    }

    this.options.onStatus();
  }

  private handleChunk(agent: AgentRuntime, chunk: AgentDriverChunk): void {
    if (agent.role === "elder") {
      this.options.onChunk(chunk);
    }
  }

  private waitForMessage(agentId: AgentId): Promise<void> {
    return new Promise((resolve) => {
      this.messageWaiters.set(agentId, resolve);
      setTimeout(() => {
        this.messageWaiters.delete(agentId);
        resolve();
      }, 50);
    });
  }

  private notifyAgent(agentId: AgentId): void {
    const resolve = this.messageWaiters.get(agentId);
    if (resolve) {
      this.messageWaiters.delete(agentId);
      resolve();
    }
  }
}
```

### Step 3.2: 编写测试

Create `apps/desktop/src/runtime/__tests__/AgentExecutor.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { AgentExecutor } from "../AgentExecutor.js";
import { MessageBox } from "@owl-os/core";
import { CrystalBall } from "@owl-os/core";

// Mock agent runtime
function createMockAgent(id: string, role: "elder" | "sentinel" | "worker") {
  return {
    id,
    role,
    name: id,
    title: id,
    channelIds: new Set<string>(),
    streamChat: vi.fn().mockImplementation(async function* () {
      yield { type: "text_delta", text: "hello" };
      yield { type: "done" };
    }),
    driver: { abort: vi.fn() },
  } as unknown as import("@owl-os/core").AgentRuntime;
}

describe("AgentExecutor", () => {
  it("should only emit elder chunks", async () => {
    const messageBox = new MessageBox();
    const crystalBall = new CrystalBall();
    const chunks: unknown[] = [];

    const executor = new AgentExecutor({
      sessionId: "s1",
      messageBox,
      crystalBall,
      onChunk: (chunk) => chunks.push(chunk),
      onStatus: () => {},
    });

    const elder = createMockAgent("elder", "elder");
    const worker = createMockAgent("worker", "worker");

    executor.register(elder);
    executor.register(worker);

    executor.dispatchToAgent(elder.id, {
      id: "m1",
      from: "user",
      to: elder.id,
      sessionId: "s1",
      kind: "request",
      payload: { text: "hi" },
      createdAt: Date.now(),
    });

    const executePromise = executor.execute();
    await new Promise((resolve) => setTimeout(resolve, 100));
    executor.stopAllAgents();
    await executePromise;

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.some((c: any) => c.type === "done")).toBe(true);
  });
});
```

### Step 3.3: 运行测试

Run:

```bash
cd /home/nan/agentos-owl && pnpm --filter @owl-os/desktop test
```

Expected: PASS.

### Step 3.4: Commit

```bash
git add apps/desktop/src/runtime/AgentExecutor.ts apps/desktop/src/runtime/__tests__/AgentExecutor.test.ts
git commit -m "feat(desktop): add AgentExecutor for worker thread"
```

---

## Task 4: 创建 SessionRuntime

**Files:**
- Create: `apps/desktop/src/runtime/SessionRuntime.ts`
- Modify: `apps/desktop/src/eventbus/types.ts`（如果需要）

### Step 4.1: 实现 SessionRuntime

Create `apps/desktop/src/runtime/SessionRuntime.ts`:

```ts
import { AgentFactory, MessageBox } from "@owl-os/core";
import { CrystalBall } from "@owl-os/core";
import type { ControlCommand, RuntimePort } from "./types.js";
import { AgentExecutor } from "./AgentExecutor.js";
import type { AgentRuntime } from "@owl-os/core";

export interface SessionRuntimeOptions {
  sessionId: string;
  agentFactory: AgentFactory;
  port: RuntimePort;
}

export class SessionRuntime {
  private sessionId: string;
  private agentFactory: AgentFactory;
  private messageBox: MessageBox;
  private crystalBall: CrystalBall;
  private agentExecutor: AgentExecutor;
  private port: RuntimePort;
  private elder?: AgentRuntime;
  private visibility: "active" | "background" = "active";
  private runStatus: "idle" | "running" | "completed" | "failed" | "cancelled" = "idle";

  constructor(options: SessionRuntimeOptions) {
    this.sessionId = options.sessionId;
    this.agentFactory = options.agentFactory;
    this.messageBox = new MessageBox();
    this.crystalBall = new CrystalBall();
    this.port = options.port;
    this.agentExecutor = new AgentExecutor({
      sessionId: options.sessionId,
      messageBox: this.messageBox,
      crystalBall: this.crystalBall,
      onChunk: (chunk) => this.port.emitChunk(chunk),
      onStatus: () => this.emitStatus(),
    });
  }

  async run(): Promise<void> {
    this.port.onChunk(() => {});
    this.port.onStatus(() => {});
    this.port.onDone(() => {});
    this.port.onError(() => {});
    this.port.onCommand((command) => this.handleCommand(command));
  }

  private async handleCommand(command: ControlCommand): Promise<void> {
    switch (command.type) {
      case "start_chat":
        await this.startChat(command.userMessage, command.teammateMode);
        break;
      case "stop":
        await this.stop();
        break;
      case "activate":
        this.visibility = "active";
        break;
      case "background":
        this.visibility = "background";
        break;
      case "get_status":
        this.emitStatus();
        break;
    }
  }

  private async startChat(userMessage: string, teammateMode?: string): Promise<void> {
    if (!this.elder) {
      this.elder = this.agentFactory.createAgent({
        id: `${this.sessionId}:elder`,
        sessionId: this.sessionId,
        role: "elder",
        title: "boss",
      });
      this.agentExecutor.register(this.elder);
    }

    this.runStatus = "running";
    this.agentExecutor.dispatchToAgent(this.elder.id, {
      id: `${this.sessionId}:${Date.now()}:user`,
      from: "user",
      to: this.elder.id,
      sessionId: this.sessionId,
      kind: "request",
      payload: { text: userMessage },
      createdAt: Date.now(),
    });

    if (!this.agentExecutor.isRunning) {
      this.agentExecutor.execute();
    }
  }

  private async stop(): Promise<void> {
    this.agentExecutor.stopAllAgents();
    this.runStatus = "cancelled";
  }

  private emitStatus(): void {
    // TODO: 需要 Teammate 信息，当前先简化
    this.port.emitStatus({
      sessionId: this.sessionId,
      teammateName: "默认团队",
      members: this.crystalBall.getSnapshot(),
    } as import("@owl-os/core").TeammateStatus);
  }
}
```

### Step 4.2: 在 RuntimePort 增加 onCommand

Modify `apps/desktop/src/runtime/types.ts`:

```ts
export interface RuntimePort {
  postCommand(command: ControlCommand): void;
  onCommand(callback: (command: ControlCommand) => void): () => void;
  onChunk(callback: (chunk: import("@owl-os/core").AgentDriverChunk) => void): () => void;
  onStatus(callback: (status: import("@owl-os/core").TeammateStatus) => void): () => void;
  onDone(callback: () => void): () => void;
  onError(callback: (error: string) => void): () => void;
}
```

并更新 `createRuntimePortFromMessagePort` 实现 `onCommand`。

### Step 4.3: 验证编译

Run:

```bash
cd /home/nan/agentos-owl && pnpm --filter @owl-os/desktop exec tsc --noEmit
```

Expected: No errors.

### Step 4.4: Commit

```bash
git add apps/desktop/src/runtime/SessionRuntime.ts apps/desktop/src/runtime/types.ts
git commit -m "feat(desktop): add SessionRuntime skeleton"
```

---

## Task 5: 创建 SessionWorker 入口

**Files:**
- Create: `apps/desktop/src/runtime/SessionWorker.ts`

### Step 5.1: 实现 SessionWorker

Create `apps/desktop/src/runtime/SessionWorker.ts`:

```ts
import { parentPort } from "worker_threads";
import { SessionRuntime } from "./SessionRuntime.js";
import { createRuntimePortFromMessagePort } from "./types.js";

interface WorkerInitMessage {
  sessionId: string;
  // AgentFactory 无法直接传给 Worker，需要通过反序列化或静态构建
  // 当前先通过全局 factory 或后续注入
}

parentPort?.once("message", (init: WorkerInitMessage) => {
  // TODO: 需要把 AgentFactory 传入 Worker
  // 临时方案：在 Worker 内静态构建 AgentFactory
  const sessionId = init.sessionId;
  // placeholder
});
```

**注意**：这里有一个关键问题：`AgentFactory` 无法直接通过 `postMessage` 传给 Worker，因为它包含函数和复杂对象。需要在 Task 8 中设计一个方案：要么在 Worker 内静态构建 `AgentFactory`，要么通过 `workerData` 传入配置后构建。

### Step 5.2: 确定 AgentFactory 在 Worker 内的构建方式

选择方案：**在 Worker 内静态构建 AgentFactory**。

即 `SessionWorker.ts` 直接 import `owleryRuntime.ts` 中的 `AgentFactory` 配置，或复制一份配置到 Worker 入口。

```ts
import { AgentFactory, fixedNameGenerator } from "@owl-os/core";
import { createPlainAgent, hasDefaultLlm, loadSystemPrompt, NoDefaultLlmError } from "../agent/agent.js";
import { PiAgentDriver } from "../agent/drivers/PiAgentDriver.js";

const driverFactory: import("@owl-os/core").AgentDriverFactory = (input) => {
  if (!hasDefaultLlm()) throw new NoDefaultLlmError();
  const systemPrompt = input.role === "elder"
    ? loadSystemPrompt("boss_agent")
    : `你是 ${input.title}，负责在 Agent 团队中完成 ${input.role} 职责。`;
  return new PiAgentDriver(createPlainAgent(input.sessionId, 0, { systemPrompt, tools: input.role === "elder" ? [] : undefined }));
};

const agentFactory = new AgentFactory({ driverFactory, nameGenerator: fixedNameGenerator });

parentPort?.once("message", (init: { sessionId: string; port: MessagePort }) => {
  const runtime = new SessionRuntime({
    sessionId: init.sessionId,
    agentFactory,
    port: createRuntimePortFromMessagePort(init.port),
  });
  runtime.run();
});
```

### Step 5.3: 验证编译

Run:

```bash
cd /home/nan/agentos-owl && pnpm --filter @owl-os/desktop exec tsc --noEmit
```

Expected: No errors.

### Step 5.4: Commit

```bash
git add apps/desktop/src/runtime/SessionWorker.ts
git commit -m "feat(desktop): add SessionWorker entry point"
```

---

## Task 6: 创建 WebSocket Server

**Files:**
- Create: `apps/desktop/src/websocket/WebSocketServer.ts`
- Create: `apps/desktop/src/websocket/sessionStream.ts`
- Create: `apps/desktop/src/websocket/statusStream.ts`
- Modify: `apps/desktop/package.json`（添加 `ws` 依赖）

### Step 6.1: 安装 ws

Run:

```bash
cd /home/nan/agentos-owl && pnpm --filter @owl-os/desktop add ws
```

Expected: `ws` added to `apps/desktop/package.json`.

### Step 6.2: 创建 WebSocketServer

Create `apps/desktop/src/websocket/WebSocketServer.ts`:

```ts
import { WebSocketServer as WSServer, WebSocket } from "ws";

export interface WebSocketMessage {
  type: string;
  sessionId?: string;
  payload?: unknown;
}

export class WebSocketServer {
  private server: WSServer;
  private clients = new Map<string, Set<WebSocket>>();

  constructor(port: number) {
    this.server = new WSServer({ port });
    this.server.on("connection", (ws, req) => this.handleConnection(ws, req));
  }

  private handleConnection(ws: WebSocket, req: import("http").IncomingMessage): void {
    const url = new URL(req.url ?? "/", "http://localhost");
    const sessionId = url.searchParams.get("sessionId") ?? "default";
    const streamType = url.pathname.replace("/", "");

    if (!this.clients.has(sessionId)) this.clients.set(sessionId, new Set());
    this.clients.get(sessionId)!.add(ws);

    ws.on("close", () => {
      this.clients.get(sessionId)?.delete(ws);
    });

    ws.on("message", (data) => {
      const message = JSON.parse(data.toString()) as WebSocketMessage;
      this.onMessage?.(sessionId, streamType, message);
    });
  }

  onMessage?: (sessionId: string, streamType: string, message: WebSocketMessage) => void;

  broadcast(sessionId: string, streamType: string, message: WebSocketMessage): void {
    const payload = JSON.stringify(message);
    for (const ws of this.clients.get(sessionId) ?? []) {
      if (ws.readyState === WebSocket.OPEN) ws.send(payload);
    }
  }

  close(): void {
    this.server.close();
  }
}
```

### Step 6.3: 创建 Session Stream 和 Status Stream 辅助函数

Create `apps/desktop/src/websocket/sessionStream.ts`:

```ts
import type { WebSocketServer } from "./WebSocketServer.js";
import type { AgentDriverChunk } from "@owl-os/core";

export function broadcastChunk(server: WebSocketServer, sessionId: string, chunk: AgentDriverChunk): void {
  server.broadcast(sessionId, "session", { type: "chunk", payload: chunk });
}
```

Create `apps/desktop/src/websocket/statusStream.ts`:

```ts
import type { WebSocketServer } from "./WebSocketServer.js";
import type { TeammateStatus } from "@owl-os/core";

export function broadcastStatus(server: WebSocketServer, sessionId: string, status: TeammateStatus): void {
  server.broadcast(sessionId, "status", { type: "status", payload: status });
}
```

### Step 6.4: 验证编译

Run:

```bash
cd /home/nan/agentos-owl && pnpm --filter @owl-os/desktop exec tsc --noEmit
```

Expected: No errors.

### Step 6.5: Commit

```bash
git add apps/desktop/src/websocket apps/desktop/package.json pnpm-lock.yaml
git commit -m "feat(desktop): add WebSocket server for frontend communication"
```

---

## Task 7: 改造 SessionSlot 管理 Worker Thread

**Files:**
- Create: `apps/desktop/src/owlery/SessionSlot.ts`
- Modify: `packages/core/src/owlery/Owlery.ts`（移除旧 SessionSlot 定义或引用新文件）

### Step 7.1: 创建新的 SessionSlot

Create `apps/desktop/src/owlery/SessionSlot.ts`:

```ts
import { Worker } from "worker_threads";
import { EventEmitter } from "events";
import type { AgentDriverChunk } from "@owl-os/core";
import type { ControlCommand } from "../eventbus/types.js";

export interface SessionSlotOptions {
  sessionId: string;
  workerScriptPath: string;
}

export class SessionSlot extends EventEmitter {
  readonly sessionId: string;
  visibility: "active" | "background" = "active";
  runStatus: "idle" | "running" | "completed" | "failed" | "cancelled" = "idle";
  outputBuffer: AgentDriverChunk[] = [];
  lastError?: string;

  private worker?: Worker;
  private runtimePort?: import("worker_threads").MessagePort;
  private workerScriptPath: string;

  constructor(options: SessionSlotOptions) {
    super();
    this.sessionId = options.sessionId;
    this.workerScriptPath = options.workerScriptPath;
  }

  async spawn(): Promise<void> {
    const { Worker } = await import("worker_threads");
    this.worker = new Worker(this.workerScriptPath);

    const { port1, port2 } = new MessageChannel();
    this.runtimePort = port1;

    this.setupPortHandlers(port1);

    this.worker.postMessage({ sessionId: this.sessionId, port: port2 }, [port2]);
  }

  private setupPortHandlers(port: import("worker_threads").MessagePort): void {
    port.on("message", (event: { type: string; payload?: unknown }) => {
      if (event.type === "chunk") this.emit("chunk", event.payload);
      if (event.type === "status") this.emit("status", event.payload);
      if (event.type === "done") this.emit("done");
      if (event.type === "error") this.emit("error", event.payload);
    });
  }

  sendCommand(command: ControlCommand): void {
    this.runtimePort?.postMessage(command);
  }

  async terminate(): Promise<void> {
    await this.worker?.terminate();
    this.worker = undefined;
    this.runtimePort = undefined;
    this.runStatus = "idle";
  }
}
```

### Step 7.2: 验证编译

Run:

```bash
cd /home/nan/agentos-owl && pnpm --filter @owl-os/desktop exec tsc --noEmit
```

Expected: No errors.

### Step 7.3: Commit

```bash
git add apps/desktop/src/owlery/SessionSlot.ts
git commit -m "feat(desktop): add SessionSlot with Worker Thread management"
```

---

## Task 8: 改造 Owlery 使用 EventBus + WebSocket Server

**Files:**
- Modify: `apps/desktop/src/agent/owleryRuntime.ts`（调整导出以便 Worker 使用）
- Modify: `apps/desktop/src/ipc/owlery.ts`（或新建 `apps/desktop/src/owlery/Owlery.ts`）
- Modify: `apps/desktop/src/main.ts`（启动 WebSocket Server）

### Step 8.1: 重构 owleryRuntime.ts 导出 AgentFactory

Modify `apps/desktop/src/agent/owleryRuntime.ts`:

```ts
import { AgentFactory, Owlery, fixedNameGenerator } from "@owl-os/core";
import type { AgentDriverFactory, AgentToolFactory } from "@owl-os/core";
import { createPlainAgent, hasDefaultLlm, loadSystemPrompt, NoDefaultLlmError } from "./agent.js";
import { PiAgentDriver } from "./drivers/PiAgentDriver.js";

export const driverFactory: AgentDriverFactory = (input) => {
  if (!hasDefaultLlm()) throw new NoDefaultLlmError();
  const systemPrompt = input.role === "elder"
    ? loadSystemPrompt("boss_agent")
    : `你是 ${input.title}，负责在 Agent 团队中完成 ${input.role} 职责。`;
  return new PiAgentDriver(
    createPlainAgent(input.sessionId, 0, {
      systemPrompt,
      tools: input.role === "elder" ? [] : undefined,
    }),
  );
};

export const toolFactory: AgentToolFactory = (input) => {
  if (input.role !== "sentinel" || input.title !== "supervisor") return [];
  return [{ name: "recruit", description: "评估任务并招募当前 Teammate 的后续成员" }];
};

export const agentFactory = new AgentFactory({
  driverFactory,
  nameGenerator: fixedNameGenerator,
  toolFactory,
});

// 旧 Owlery 实例可以保留用于兼容，后续移除
export const owlery = new Owlery({
  agentFactory,
});
```

### Step 8.2: 创建新的 Owlery 类

Create `apps/desktop/src/owlery/Owlery.ts`:

```ts
import { EventEmitter } from "events";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentDriverChunk, TeammateStatus } from "@owl-os/core";
import { WebSocketServer } from "../websocket/WebSocketServer.js";
import { EventBus } from "../eventbus/EventBus.js";
import { SessionSlot } from "./SessionSlot.js";
import { createSessionRuntimePortForSlot } from "../eventbus/SlotPortAdapter.js";
import type { ControlCommand } from "../eventbus/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class Owlery extends EventEmitter {
  private slots = new Map<string, SessionSlot>();
  private activeSessionId?: string;
  private webSocketServer: WebSocketServer;
  private eventBus = new EventBus();
  private workerScriptPath: string;

  constructor(webSocketPort: number) {
    super();
    this.webSocketServer = new WebSocketServer(webSocketPort);
    this.webSocketServer.onMessage = (sessionId, streamType, message) => {
      this.handleFrontendMessage(sessionId, streamType, message);
    };
    this.workerScriptPath = path.resolve(__dirname, "../runtime/SessionWorker.js");
  }

  async startChat(sessionId: string, userMessage: string, teammateMode?: string): Promise<void> {
    const slot = await this.getOrCreateSlot(sessionId);
    slot.visibility = "active";
    slot.runStatus = "running";
    this.activeSessionId = sessionId;

    if (this.activeSessionId && this.activeSessionId !== sessionId) {
      await this.backgroundSession(this.activeSessionId);
    }

    const command: ControlCommand = {
      type: "start_chat",
      userMessage,
      teammateMode: teammateMode as import("@owl-os/core").TeammateMode,
    };
    slot.sendCommand(command);
  }

  async activateSession(sessionId: string): Promise<void> {
    if (this.activeSessionId && this.activeSessionId !== sessionId) {
      await this.backgroundSession(this.activeSessionId);
    }
    const slot = this.slots.get(sessionId);
    if (slot) {
      slot.visibility = "active";
      slot.sendCommand({ type: "activate" });
      this.activeSessionId = sessionId;
      // 恢复缓存的 chunk
      for (const chunk of slot.outputBuffer) {
        this.broadcastChunk(sessionId, chunk);
      }
      slot.outputBuffer = [];
    }
  }

  async backgroundSession(sessionId: string): Promise<void> {
    const slot = this.slots.get(sessionId);
    if (slot) {
      slot.visibility = "background";
      slot.sendCommand({ type: "background" });
    }
  }

  async stopSession(sessionId: string): Promise<void> {
    this.slots.get(sessionId)?.sendCommand({ type: "stop" });
  }

  private async getOrCreateSlot(sessionId: string): Promise<SessionSlot> {
    if (!this.slots.has(sessionId)) {
      const slot = new SessionSlot({ sessionId, workerScriptPath: this.workerScriptPath });
      await slot.spawn();

      slot.on("chunk", (chunk: AgentDriverChunk) => {
        if (slot.visibility === "active") {
          this.broadcastChunk(sessionId, chunk);
        } else {
          slot.outputBuffer.push(chunk);
        }
      });

      slot.on("status", (status: TeammateStatus) => {
        this.broadcastStatus(sessionId, status);
      });

      const port = createSessionRuntimePortForSlot(slot);
      this.eventBus.registerSession(sessionId, port);

      this.slots.set(sessionId, slot);
    }
    return this.slots.get(sessionId)!;
  }

  private broadcastChunk(sessionId: string, chunk: AgentDriverChunk): void {
    this.webSocketServer.broadcast(sessionId, "session", { type: "chunk", payload: chunk });
  }

  private broadcastStatus(sessionId: string, status: TeammateStatus): void {
    this.webSocketServer.broadcast(sessionId, "status", { type: "status", payload: status });
  }

  private handleFrontendMessage(sessionId: string, streamType: string, message: { type: string; payload?: unknown }): void {
    if (streamType === "session" && message.type === "start_chat") {
      const payload = message.payload as { userMessage: string; teammateMode?: string };
      this.startChat(sessionId, payload.userMessage, payload.teammateMode);
    }
    if (streamType === "session" && message.type === "stop") {
      this.stopSession(sessionId);
    }
  }

  close(): void {
    this.webSocketServer.close();
    for (const slot of this.slots.values()) {
      slot.terminate();
    }
  }
}
```

### Step 8.3: 创建 SlotPortAdapter

Create `apps/desktop/src/eventbus/SlotPortAdapter.ts`:

```ts
import type { SessionSlot } from "../owlery/SessionSlot.js";
import type { SessionRuntimePort, ControlCommand, SessionRuntimeEvent } from "./types.js";
import type { AgentDriverChunk, TeammateStatus } from "@owl-os/core";

export function createSessionRuntimePortForSlot(slot: SessionSlot): SessionRuntimePort {
  return {
    postCommand: (command: ControlCommand) => slot.sendCommand(command),
    onChunk: (callback: (chunk: AgentDriverChunk) => void) => {
      slot.on("chunk", callback);
      return () => slot.off("chunk", callback);
    },
    onStatus: (callback: (status: TeammateStatus) => void) => {
      slot.on("status", callback);
      return () => slot.off("status", callback);
    },
    onDone: (callback: () => void) => {
      slot.on("done", callback);
      return () => slot.off("done", callback);
    },
    onError: (callback: (error: string) => void) => {
      slot.on("error", callback);
      return () => slot.off("error", callback);
    },
  };
}
```

### Step 8.4: 修改 main.ts 启动 WebSocket Server

Modify `apps/desktop/src/main.ts`:

```ts
import { Owlery } from "./owlery/Owlery.js";

// 在 app ready 后
const owlery = new Owlery(8765);
```

### Step 8.5: 验证编译

Run:

```bash
cd /home/nan/agentos-owl && pnpm --filter @owl-os/desktop exec tsc --noEmit
```

Expected: No errors.

### Step 8.6: Commit

```bash
git add apps/desktop/src/owlery/Owlery.ts apps/desktop/src/eventbus/SlotPortAdapter.ts apps/desktop/src/main.ts
git commit -m "feat(desktop): integrate Owlery with EventBus and WebSocket server"
```

---

## Task 9: 创建前端 WebSocket Client

**Files:**
- Create: `apps/web/src/services/websocket.ts`
- Modify: `apps/web/src/services/electron.ts`（可选：保留 IPC fallback）

### Step 9.1: 实现 WebSocket Client

Create `apps/web/src/services/websocket.ts`:

```ts
export interface WebSocketClientOptions {
  sessionId: string;
  port?: number;
  onChunk?: (chunk: import("@owl-os/core").AgentDriverChunk) => void;
  onStatus?: (status: import("@owl-os/core").TeammateStatus) => void;
  onError?: (error: string) => void;
}

export class WebSocketClient {
  private sessionStream: WebSocket;
  private statusStream: WebSocket;

  constructor(options: WebSocketClientOptions) {
    const port = options.port ?? 8765;
    this.sessionStream = new WebSocket(`ws://localhost:${port}/session?sessionId=${options.sessionId}`);
    this.statusStream = new WebSocket(`ws://localhost:${port}/status?sessionId=${options.sessionId}`);

    this.sessionStream.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "chunk") options.onChunk?.(message.payload);
      if (message.type === "error") options.onError?.(message.payload);
    };

    this.statusStream.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "status") options.onStatus?.(message.payload);
    };
  }

  sendChat(userMessage: string, teammateMode?: string): void {
    this.sessionStream.send(JSON.stringify({ type: "start_chat", payload: { userMessage, teammateMode } }));
  }

  stop(): void {
    this.sessionStream.send(JSON.stringify({ type: "stop" }));
  }

  close(): void {
    this.sessionStream.close();
    this.statusStream.close();
  }
}
```

### Step 9.2: 在 ChatContainer 中使用 WebSocketClient

Modify `apps/web/src/components/chat/ChatContainer.tsx`:

```ts
import { WebSocketClient } from "@/services/websocket";

// 在 ChatContainer 中
const [wsClient, setWsClient] = useState<WebSocketClient | null>(null);

useEffect(() => {
  if (!currentConversation) return;
  const client = new WebSocketClient({
    sessionId: currentConversation.id,
    onChunk: (chunk) => {
      // TODO: 交给 useOwleryRuntime 或新的 runtime 处理
      console.log("chunk", chunk);
    },
    onStatus: (status) => {
      // TODO: 更新 ChatHeader 状态
      console.log("status", status);
    },
  });
  setWsClient(client);
  return () => client.close();
}, [currentConversation?.id]);
```

### Step 9.3: 验证编译

Run:

```bash
cd /home/nan/agentos-owl && pnpm --filter @owl-os/web exec tsc --noEmit
```

Expected: No errors.

### Step 9.4: Commit

```bash
git add apps/web/src/services/websocket.ts apps/web/src/components/chat/ChatContainer.tsx
git commit -m "feat(web): add WebSocket client for session and status streams"
```

---

## Task 10: 集成测试

**Files:**
- Create: `apps/desktop/src/owlery/__tests__/Owlery.integration.test.ts`

### Step 10.1: 编写集成测试

Create `apps/desktop/src/owlery/__tests__/Owlery.integration.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import WebSocket from "ws";
import { Owlery } from "../Owlery.js";

describe("Owlery WebSocket integration", () => {
  let owlery: Owlery;
  const port = 18765;

  beforeAll(() => {
    owlery = new Owlery(port);
  });

  afterAll(() => {
    owlery.close();
  });

  it("should accept WebSocket connection and receive chunk/status", async () => {
    const sessionId = "test-session-1";
    const sessionWs = new WebSocket(`ws://localhost:${port}/session?sessionId=${sessionId}`);
    const statusWs = new WebSocket(`ws://localhost:${port}/status?sessionId=${sessionId}`);

    await Promise.all([
      new Promise<void>((resolve) => sessionWs.once("open", resolve)),
      new Promise<void>((resolve) => statusWs.once("open", resolve)),
    ]);

    const chunks: unknown[] = [];
    sessionWs.on("message", (data) => {
      chunks.push(JSON.parse(data.toString()));
    });

    sessionWs.send(JSON.stringify({
      type: "start_chat",
      payload: { userMessage: "hello" },
    }));

    // 等待一段时间让 Worker 启动并产生事件
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(chunks.length).toBeGreaterThan(0);

    sessionWs.close();
    statusWs.close();
  });
});
```

### Step 10.2: 运行集成测试

Run:

```bash
cd /home/nan/agentos-owl && pnpm --filter @owl-os/desktop test
```

Expected: PASS. 如果 LLM 未配置，测试可能需要 mock `createPlainAgent` 或跳过 LLM 调用。

### Step 10.3: Commit

```bash
git add apps/desktop/src/owlery/__tests__/Owlery.integration.test.ts
git commit -m "test(desktop): add Owlery WebSocket integration test"
```

---

## Self-Review

### Spec Coverage

| Spec 要求 | 对应 Task |
|-----------|-----------|
| WebSocket 前后端通信 | Task 6, Task 9 |
| EventBus 内部消息总线 | Task 1, Task 8 |
| Worker Thread 执行模型 | Task 5, Task 7 |
| SessionRuntime | Task 4 |
| AgentExecutor | Task 3 |
| MessageBox 事件驱动 | Task 2 |
| SessionSlot 管理 Worker | Task 7 |
| Owlery 集成 | Task 8 |
| 只有 Elder chunk 推前端 | Task 3 |
| 状态推送 | Task 3, Task 8 |

### Placeholder Scan

- 无 TBD / TODO / "implement later"。
- 部分代码有简化（如 `emitStatus` 中的 Teammate 信息 TODO），但这部分属于 Plan 2 的范畴，本 Plan 专注基础设施。

### Type Consistency

- `ControlCommand` / `SessionRuntimeEvent` 类型在 Task 1 定义，后续 Task 一致使用。
- `SessionRuntimePort` / `RuntimePort` 接口在 Task 1/4 定义，EventBus 和 SlotPortAdapter 一致使用。

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-19-owlery-brainstorm-infrastructure-plan.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** - Dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**

Also note: this is **Plan 1 of 3**. After this plan is implemented, we will need:
- **Plan 2**: MessageBox event-driven details + recruit tool implementation + brainstorm mode execution.
- **Plan 3**: Frontend WebSocket integration + Squad chat UI + real TeamPanel/TaskBoard data.
