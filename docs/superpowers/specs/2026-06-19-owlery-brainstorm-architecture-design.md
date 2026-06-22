# Owlery Brainstorm 协作模式架构设计

> 设计目标：实现 Elder → Sentinel → Worker 的完整招募链路，支持 brainstorm 等多 Agent 协作模式，明确 Owlery、SessionRuntime、AgentExecutor、EventBus、WebSocket 各层职责。

---

## 1. 背景与目标

### 1.1 当前问题

- `Owlery` 的 `modeEvaluator` 是存根，恒返回 `"supervisor"`，无法根据用户输入进入 brainstorm 模式。
- Primary Sentinel 的 `recruit` 工具只有元数据，没有 `execute` 实现，Worker 创建后处于闲置。
- 所有 Agent 默认携带 `execute_command` 等工具，Elder/Boss Agent 会执行无关 shell 命令。
- 前端传入的 `teammateMode` 被后端忽略。
- PromptCompiler 把用户消息 JSON 化，导致 LLM 重复用户输入。
- squad 模式没有真实群聊 UI，MessageBox 不支持持续订阅。

### 1.2 设计目标

- 建立 `Elder → Sentinel → Worker` 两层招募链路。
- recruit 工具返回 `channelId`，Agent 通过 channel 双向通信。
- 每个 running session 运行在独立 Worker Thread 中。
- Session 内 Agent 通过事件驱动式 `MessageBox` 通信。
- 只有 Elder 的 chunk 推送到前端，其他 Agent 只上报状态。
- 前后端通过 WebSocket 通信，Owlery 内部通过 EventBus 与 SessionRuntime 通信。

---

## 2. 总体架构

```text
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Renderer / Web UI)                                │
│  ─────────────────────────────                               │
│  WebSocket Client                                            │
│    ├── Session Stream WS  (chunk / text_delta / done)        │
│    └── Status Stream WS   (crystalball / background notify)  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend Main Process (Electron Main)                        │
│  ─────────────────────────────────────                       │
│  WebSocket Server (owned by Owlery)                          │
│  Owlery (Global Session Manager)                             │
│    ├── EventBus (internal messaging)                         │
│    ├── SessionSlot(active)  → Worker Thread                  │
│    ├── SessionSlot(background-1) → Worker Thread             │
│    ├── SessionSlot(background-2) → Worker Thread             │
│    └── ...                                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Session Worker Thread                                       │
│  ─────────────────────                                       │
│  SessionRuntime                                              │
│    ├── AgentExecutor (thread-local, unique)                  │
│    ├── MessageBox (thread-local, event-driven)               │
│    └── CrystalBall (thread-local)                            │
│         └── Agent loops (async concurrent)                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Session 状态模型

| 状态 | 定义 | 对应线程 |
|------|------|----------|
| **active** | 当前用户关注的 session，正在执行 | 1 个 Worker Thread |
| **background** | 有 Agent 在执行，但用户注意力不在上面 | N 个 Worker Threads |
| **idle** | 没有正在执行的用户会话消息 | 无线程 |

### 状态转换

```text
idle ──start_chat──► active
active ──switch──► background
background ──switch──► active
background ──done/error──► idle
active ──done/error──► idle
```

### 约束

- 同时只能有 1 个 active session。
- active + background 的 session 总量受系统资源限制。
- 每个 running session 独占一个 Worker Thread。
- Session 之间不通过 MessageBox 通信。

---

## 4. 组件职责

### 4.1 Owlery（主进程）

- 全局 session manager。
- 拥有 WebSocket Server，向前端推送 chunk 和 status。
- 管理 `SessionSlot` 列表，维护 active/background/idle 状态。
- 通过 `EventBus` 向 `SessionRuntime` 发送控制命令。
- 接收 `EventBus` 回传的 chunk/status 事件，转发给前端。

### 4.2 SessionSlot（主进程）

- 每个 session 在主进程中的管理器。
- 持有 `worker_threads.Worker` 实例和与 Worker 通信的 `MessagePort`。
- 维护 `outputBuffer`（background 时缓存 chunk）。
- 提供 `start`、`activate`、`background`、`stop`、`terminate` 方法。

### 4.3 EventBus（主进程）

- 负责 Owlery 与 SessionRuntime 之间的内部通信。
- 发送 `ControlCommand` 到指定 session 的 Worker。
- 订阅 Worker 回传的 `chunk`、`status`、`done`、`error` 事件。
- 把事件回调给 Owlery，Owlery 再推送到前端 WebSocket。

### 4.4 SessionRuntime（Worker Thread）

- Worker Thread 内的执行入口。
- 持有 `AgentExecutor`、`MessageBox`、`CrystalBall`。
- 接收 EventBus 的 `ControlCommand`，调用 `AgentExecutor` 执行。
- 把 Elder chunk 和 CrystalBall 状态通过 EventBus 回传。

### 4.5 AgentExecutor（Worker Thread 内唯一）

- 管理同 session 内所有 Agent 的生命周期和 loops。
- 提供 `register(agent)` 和 `execute()` 方法。
- 驱动每个 Agent 的 async loop，处理 pending 消息和 channel 订阅。
- 过滤 chunk：只有 Elder 的 chunk 推送到 EventBus。
- 更新 CrystalBall 状态并触发 status 推送。

### 4.6 MessageBox（Worker Thread 内唯一）

- 同 session 内 Agent ↔ Agent 的 1:1 通信通道。
- 提供 `createChannel`、`send`、`receive`、`subscribe`。
- `subscribe` 是事件驱动式，新消息到达时回调 Agent loop。

### 4.7 CrystalBall（Worker Thread 内唯一）

- 维护同 session 内所有 Agent 的工作快照。
- 提供 `registerAgent`、`updateStatus`、`getTeammateStatus`。
- 状态变化时触发 EventBus status 推送。

---

## 5. 通信机制

### 5.1 WebSocket（前后端）

Owlery 拥有 WebSocket Server，维护两条逻辑链路：

| 链路 | 方向 | 内容 |
|------|------|------|
| **Session Stream** | Worker → Frontend | Elder 的 chunk（text_delta / reasoning_delta / tool_event / done / error） |
| **Status Stream** | Worker → Frontend | CrystalBall 状态（TeammateStatus：leader/members 状态） |

前端命令（如 `start_chat`、`stop`）通过 WebSocket 发送到 Owlery，Owlery 通过 EventBus 转发给 SessionRuntime。

### 5.2 EventBus（Owlery ↔ SessionRuntime）

EventBus 是内部消息总线，负责主进程 Owlery 与 Worker Thread 内 SessionRuntime 的通信。

#### ControlCommand（主 → Worker）

```ts
type ControlCommand =
  | { type: "start_chat"; userMessage: string; teammateMode?: TeammateMode }
  | { type: "stop" }
  | { type: "activate" }
  | { type: "background" }
  | { type: "get_status" };
```

#### SessionRuntimeEvent（Worker → 主）

```ts
type SessionRuntimeEvent =
  | { type: "chunk"; chunk: AgentDriverChunk }
  | { type: "status"; status: TeammateStatus }
  | { type: "done" }
  | { type: "error"; error: string };
```

EventBus 不直接操作 WebSocket，只与 Owlery 交互。

### 5.3 MessageBox（Agent ↔ Agent）

- 每个 Worker Thread 内有一个独立的 `MessageBox`。
- channel 是 1:1 双向通道，由 recruit 工具创建。
- Agent 持有自己订阅的 `channelIds: Set<ChannelId>`。
- 新 Agent 被 recruit 后，父 Agent 把新 `channelId` 加入自己的订阅集合。

---

## 6. Recruit 链路

### 6.1 两层招募

```text
Elder Agent
  ↓ 调用 recruit 工具
  创建 Primary Sentinel Agent
  创建 Elder ↔ Sentinel MessageChannel
  返回 channelId 给 Elder
  ↓ Elder 通过 channelId 发送任务

Primary Sentinel Agent
  ↓ 收到任务后，调用 recruit 工具
  创建 N 个 Worker Agents
  为每个 Worker 创建 Sentinel ↔ Worker MessageChannel
  返回 channelId 列表给 Sentinel
  ↓ Sentinel 通过 channelId 向所有 Worker 分发任务

Worker Agents
  ↓ 并行处理
  通过各自 channelId 返回结果给 Sentinel

Sentinel
  ↓ 汇总所有 Worker 结果
  通过 channelId 返回给 Elder

Elder
  ↓ 整理最终结果
  输出 chunk 到前端
```

### 6.2 recruit 工具接口

**Elder → Sentinel**:

```ts
interface ElderRecruitInput {
  userPrompt: string;
  mode: TeammateMode;
  conversationContext: AgentMessage[];
}

interface ElderRecruitOutput {
  channelId: ChannelId;
}
```

**Sentinel → Worker**:

```ts
interface SentinelRecruitInput {
  task: AgentTask;
  mode: TeammateMode;
}

interface SentinelRecruitOutput {
  channelIds: ChannelId[];
}
```

### 6.3 recruit 工具实现

recruit 工具通过闭包访问 `AgentFactory`、`MessageBox`、`AgentExecutor`：

```ts
function createRecruitTool(ctx: {
  agentFactory: AgentFactory;
  messageBox: MessageBox;
  agentExecutor: AgentExecutor;
}) {
  return {
    name: "recruit",
    description: "评估任务并招募当前 Teammate 的后续成员",
    execute: async (input: RecruitToolInput): Promise<RecruitToolOutput> => {
      // 1. 调用 LLM 决定招募计划
      const plan = await decideRecruitmentPlan(input);

      // 2. 创建 Agent
      const agent = ctx.agentFactory.createAgent({
        id: plan.agentId,
        sessionId: input.sessionId,
        role: plan.role,
        title: plan.title,
        parentSentinelId: input.parentAgentId,
      });

      // 3. 注册到 Executor
      ctx.agentExecutor.register(agent);

      // 4. 创建 channel
      const channel = ctx.messageBox.createChannel({
        sessionId: input.sessionId,
        endpointA: input.parentAgentId,
        endpointB: agent.id,
      });

      return { channelId: channel.id };
    },
  };
}
```

### 6.4 Elder/Sentinel 处理 recruit 结果

当 AgentExecutor 检测到 `tool_event` 类型为 `recruit` 时：

```ts
if (chunk.type === "tool_event" && chunk.event.toolName === "recruit") {
  const result = chunk.event.result as { channelId: string } | { channelIds: string[] };
  // 把新 channelId(s) 加入父 Agent 的订阅集合
  if ("channelId" in result) parentAgent.channelIds.add(result.channelId);
  if ("channelIds" in result) result.channelIds.forEach((id) => parentAgent.channelIds.add(id));
}
```

---

## 7. AgentExecutor

### 7.1 职责

- Worker Thread 内唯一。
- 管理同 session 所有 Agent 的注册和运行。
- 启动所有 Agent 的 async loops。
- 处理 Agent 消息和 chunk。
- 过滤 chunk：只有 Elder 的 chunk 推送到 EventBus。

### 7.2 核心接口

```ts
class AgentExecutor {
  register(agent: AgentRuntime): void;
  execute(): Promise<void>;
  stopAllAgents(): void;
  dispatchToAgent(agentId: AgentId, message: AgentMessage): void;
}
```

### 7.3 Agent Loop

```ts
private async runAgentLoop(agent: AgentRuntime): Promise<void> {
  const unsubscribes = Array.from(agent.channelIds).map((channelId) =>
    this.messageBox.subscribe(channelId, agent.id, (message) => {
      this.handleAgentMessage(agent, message);
    })
  );

  while (this.isRunning && agent.isRunning) {
    // 处理 pending 消息
    const messages = this.pendingMessages.get(agent.id) ?? [];
    this.pendingMessages.set(agent.id, []);
    for (const message of messages) {
      await this.processAgentMessage(agent, message);
    }

    // 等待新消息（事件驱动 + 超时）
    await this.waitForMessage(agent);
  }

  for (const unsubscribe of unsubscribes) unsubscribe();
}
```

---

## 8. Chunk 过滤与状态推送

### 8.1 Chunk 过滤规则

| Agent 角色 | chunk 是否推前端 | 是否更新 CrystalBall |
|------------|------------------|----------------------|
| Elder      | ✅ 是            | ✅ 是                |
| Sentinel   | ❌ 否            | ✅ 是                |
| Worker     | ❌ 否            | ✅ 是                |

### 8.2 handleChunk 实现

```ts
private handleChunk(agent: AgentRuntime, chunk: AgentDriverChunk): void {
  const status = chunkToStatus(chunk);
  this.crystalBall.updateStatus(agent.id, status);

  // 状态变化时推送
  this.sessionRuntime.emitStatus();

  // 只有 Elder 的 chunk 推前端
  if (agent.role === "elder") {
    this.eventPort.emitChunk(chunk);
  }
}
```

### 8.3 状态推送时机

- Agent 注册时：`not_started`
- Agent 开始 streamChat 时：`in_progress`
- Agent 完成时：`completed`
- Agent 失败时：`failed`
- Tool 执行时：可选扩展 tool 级状态

---

## 9. 生命周期管理

### 9.1 SessionSlot 职责

```ts
class SessionSlot {
  sessionId: SessionId;
  visibility: "active" | "background";
  runStatus: "idle" | "running" | "completed" | "failed" | "cancelled";
  worker?: Worker;
  runtimePort?: MessagePort;
  outputBuffer: AgentDriverChunk[];

  async start(userMessage: string, teammateMode?: TeammateMode): Promise<void>;
  async activate(): Promise<void>;
  async background(): Promise<void>;
  async stop(): Promise<void>;
  async terminate(): Promise<void>;
}
```

### 9.2 active / background 行为

| 行为 | active | background |
|------|--------|------------|
| Elder chunk | 实时推前端 | 缓存到 outputBuffer |
| Status | 实时推前端 | 状态变化时推前端 |
| Worker Thread | 运行中 | 运行中 |

### 9.3 停止与错误

- `stop`：SessionRuntime 调用 `AgentExecutor.stopAllAgents()`，状态变为 `cancelled`。
- Elder 失败：整个 session 失败，推送 error chunk。
- Worker/Sentinel 失败：通知父 Agent，父 Agent 决定如何处理。

---

## 10. 数据持久化

### 10.1 需要持久化的内容

| 数据 | 持久化方式 |
|------|------------|
| Conversation | SQLite，增加 `teammate_mode` 字段 |
| Message | SQLite，无需改造 |
| Agent 配置 | SQLite，无需改造 |
| Session Runtime 状态 | **不持久化** |
| MessageBox 消息 | **不持久化**（长期可考虑） |
| OutputBuffer | **不持久化** |

### 10.2 DB 迁移

```sql
ALTER TABLE conversations ADD COLUMN teammate_mode TEXT;
```

对应更新：
- `apps/desktop/src/db/schema.sql`
- `apps/desktop/src/db/migrations.ts`
- `apps/desktop/src/db/types.ts`
- `apps/desktop/src/db/queries/conversations.ts`

---

## 11. 实现阶段

| 阶段 | 目标 | 关键文件 |
|------|------|----------|
| **P1** | WebSocket 基础 + EventBus + Worker Thread 骨架 | `apps/desktop/src/websocket/*`、`EventBus.ts`、`SessionThreadEntry.ts` |
| **P2** | SessionSlot + SessionRuntime + AgentExecutor | `SessionSlot.ts`、`SessionRuntime.ts`、`AgentExecutor.ts` |
| **P3** | MessageBox 事件驱动改造 | `packages/core/src/owlery/MessageBox.ts` |
| **P4** | recruit 工具实现 | `apps/desktop/src/agent/owleryRuntime.ts`、recruit tools |
| **P5** | brainstorm 模式跑通 | `TeammateManager.dispatchBrainstorm`、`Owlery.runSession` |
| **P6** | 前端 WebSocket 适配 | `apps/web/src/services/websocket.ts`、`ChatContainer.tsx` |
| **P7** | Squad 群聊 UI | `SquadChat.tsx`、`TeamPanel`、`TaskBoard` |

---

## 12. 风险与注意事项

1. **Worker Thread 调试复杂度**：错误日志需要明确标识 sessionId 和 workerId。
2. **MessageBox 线程安全**：当前 `MessageBox` 是单线程设计，改造后只在 Worker Thread 内使用，无需额外锁。
3. **LLM 工具调用稳定性**：recruit 工具需要稳定的 JSON 输出格式，可能需要 retry 机制。
4. **资源限制**：background session 过多会占用大量 Worker Thread，需要限制最大并发数。
5. **Session 切换延迟**：切换 active session 时需要恢复 outputBuffer，可能有短暂延迟。
