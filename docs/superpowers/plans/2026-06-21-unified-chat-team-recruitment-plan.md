# 统一对话入口 + 动态团队招募 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 移除前端 single/squad 区分，由运行时根据用户选择或 Elder 智能判断动态招募 Sentinel 和 Worker，所有招募过程可观测。

**Architecture:** 前端统一为 `chat` 入口并在输入框提供团队选择器；Worker 内 Elder 通过 `recruit_sentinel` 工具决定 Sentinel title，Sentinel 通过 `recruit_workers` 工具动态决定 Worker titles；运行时拦截这两个工具调用并创建对应 Agent，同时 emit `tool_event` 到前端和日志。

**Tech Stack:** React + TypeScript, `@owl-os/core`, Electron Worker Threads, `@earendil-works/pi-agent-core` tools, better-sqlite3.

---

## Task 1: 创建 Sentinel prompt 占位文件

**Files:**
- Create: `apps/desktop/prompt/sentinel_planner.md`
- Create: `apps/desktop/prompt/sentinel_supervisor.md`
- Create: `apps/desktop/prompt/sentinel_coordinator.md`
- Create: `apps/desktop/prompt/sentinel_cto.md`

- [ ] **Step 1: 创建 4 个占位 prompt 文件**

每个文件内容如下（仅文件头注释，后续填充具体提示词）：

```markdown
<!-- sentinel_planner.md -->
# Sentinel: planner

TODO: 补充 planner Sentinel 的系统提示词。
该 Sentinel 负责按流水线方式拆解任务并依次调度 Worker。
```

```markdown
<!-- sentinel_supervisor.md -->
# Sentinel: supervisor

TODO: 补充 supervisor Sentinel 的系统提示词。
该 Sentinel 负责监督并行 Worker 的执行并汇总结果。
```

```markdown
<!-- sentinel_coordinator.md -->
# Sentinel: coordinator

TODO: 补充 coordinator Sentinel 的系统提示词。
该 Sentinel 负责协调头脑风暴式讨论，激发多样观点。
```

```markdown
<!-- sentinel_cto.md -->
# Sentinel: cto

TODO: 补充 cto Sentinel 的系统提示词。
该 Sentinel 负责层级式统筹，管理多个项目组。
```

- [ ] **Step 2: 验证文件存在**

Run:
```bash
ls -la apps/desktop/prompt/sentinel_*.md
```

Expected: 4 个文件均存在。

---

## Task 2: 扩展 AgentTitle 为字符串类型

**Files:**
- Modify: `packages/core/src/agent/types.ts:9`

- [ ] **Step 1: 修改 AgentTitle 定义**

```ts
// packages/core/src/agent/types.ts
export type AgentTitle = string;
```

这样 Worker 的 title 可以是 LLM 动态生成的任意字符串（如 `developer`、`tester`），同时保留现有字面量兼容性。

- [ ] **Step 2: 运行类型检查**

Run:
```bash
pnpm typecheck
```

Expected: 全部通过。

---

## Task 3: 给 Elder/Sentinel 添加招募工具

**Files:**
- Modify: `apps/desktop/src/agent/owleryAgentFactory.ts`

- [ ] **Step 1: 导入 pi-ai Type 和 pi-agent-core AgentToolResult**

在文件顶部添加：

```ts
import { Type } from "@earendil-works/pi-ai";
import type { AgentTool, AgentToolResult } from "@earendil-works/pi-agent-core";
import { buildTools } from "./tools.js";
```

- [ ] **Step 2: 添加 recruit_sentinel 和 recruit_workers 工具函数**

在 `createOwleryAgentFactory` 之前添加：

```ts
function buildRecruitSentinelTool(): AgentTool {
  return {
    name: "recruit_sentinel",
    label: "招募 Sentinel",
    description:
      "根据任务复杂度选择一个 Sentinel title 并招募它。参数 title 必须是 planner、supervisor、coordinator、cto 之一。",
    parameters: Type.Object({
      title: Type.String(),
      reason: Type.Optional(Type.String()),
    }),
    execute: async (_id, params): Promise<AgentToolResult<unknown>> => {
      const { title, reason } = params as { title: string; reason?: string };
      return {
        content: [
          {
            type: "text",
            text: `已选择 Sentinel: ${title}${reason ? `，原因：${reason}` : ""}`,
          },
        ],
        details: undefined,
      };
    },
  };
}

function buildRecruitWorkersTool(): AgentTool {
  return {
    name: "recruit_workers",
    label: "招募 Workers",
    description:
      "分析任务后，决定需要哪些 Worker 角色。参数 workers 是一个 title 字符串数组，例如 [\"developer\", \"tester\"]。",
    parameters: Type.Object({
      workers: Type.Array(Type.String()),
    }),
    execute: async (_id, params): Promise<AgentToolResult<unknown>> => {
      const { workers } = params as { workers: string[] };
      return {
        content: [
          {
            type: "text",
            text: `已决定 Workers: ${workers.join(", ")}`,
          },
        ],
        details: undefined,
      };
    },
  };
}

function sanitizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
```

- [ ] **Step 3: 修改 driverFactory 为不同角色分配工具**

替换 `createOwleryAgentFactory` 和 `createOwleryAgentFactoryWithConfig` 中的 `driverFactory`，让 `tools` 参数按角色生效：

```ts
const driverFactory: AgentDriverFactory = (input) => {
  if (!hasDefaultLlm()) throw new NoDefaultLlmError();
  const systemPrompt =
    input.role === "elder"
      ? loadSystemPrompt("elder_boss")
      : loadSystemPrompt(`sentinel_${sanitizeTitle(input.title)}`);

  const tools: AgentTool[] =
    input.role === "elder"
      ? [buildRecruitSentinelTool()]
      : input.role === "sentinel"
        ? [...buildTools(input.sessionId), buildRecruitWorkersTool()]
        : buildTools(input.sessionId);

  return new PiAgentDriver(
    createPlainAgent(input.sessionId, 0, {
      systemPrompt,
      tools,
    }),
  );
};
```

`createOwleryAgentFactoryWithConfig` 做相同修改，使用 `createPlainAgentWithConfig`。

- [ ] **Step 4: 运行 lint 与类型检查**

Run:
```bash
pnpm lint && pnpm typecheck
```

Expected: 通过。

---

## Task 4: 更新 elder_boss.md 增加 recruit_sentinel 工具说明

**Files:**
- Modify: `apps/desktop/prompt/elder_boss.md`

- [ ] **Step 1: 在 elder_boss.md 增加工具说明段落**

在 "## 二、核心调度流程" 的 "分支B：复杂委派任务" 下，第一步之后插入：

```markdown
#### Step 2.1：选择 Sentinel

如果当前没有已激活的专业团队，你必须先调用工具 `recruit_sentinel` 来选择本次任务的 Sentinel 角色：

- `planner`：任务需要按步骤流水线执行（如生成代码、写文档、数据处理）。
- `supervisor`：任务需要多个 Worker 并行协作并由监督者汇总（如综合分析、多维度评审）。
- `coordinator`：任务需要头脑风暴、发散创意、多角色讨论。
- `cto`：任务规模大、需要层级管理多个项目组（如完整产品方案、复杂系统架构）。

调用格式：
```json
{"title": "planner", "reason": "用户要求按步骤生成 React 组件"}
```

选择完成后，继续输出自然语言委派提示，不要在用户可见内容中暴露该 JSON。
```

- [ ] **Step 2: 验证文件格式**

Run:
```bash
pnpm lint
```

Expected: 通过（markdown 文件不在 Biome 范围内，但 lint 不应报错）。

---

## Task 5: 更新运行时类型与控制命令

**Files:**
- Modify: `apps/desktop/src/eventbus/types.ts`
- Modify: `apps/web/src/services/websocket.ts`
- Modify: `apps/web/src/services/electron.ts`
- Modify: `apps/web/src/types/index.ts`

- [ ] **Step 1: 确认 ControlCommand 仅携带 teammateMode**

Worker 运行时只需要 teammateMode（主线程会把团队模板 mode 解析成该值）。

```ts
// apps/desktop/src/eventbus/types.ts
export type ControlCommand =
  | { type: "start_chat"; userMessage: string; teammateMode?: TeammateMode }
  | { type: "stop" }
  | { type: "activate" }
  | { type: "background" }
  | { type: "get_status" }
  | { type: "update_config"; llmConfig: LlmConfig };
```

- [ ] **Step 2: 更新 WebSocketClient.sendChat 参数**

```ts
// apps/web/src/services/websocket.ts
sendChat(userMessage: string, options?: { teammateMode?: TeammateMode; teamTemplateId?: string }): boolean {
  return this.send(this.sessionStream, {
    type: 'start_chat',
    payload: { userMessage, teammateMode: options?.teammateMode, teamTemplateId: options?.teamTemplateId },
  });
}
```

- [ ] **Step 3: 更新 startOwleryChat 参数**

```ts
// apps/web/src/services/electron.ts
export const startOwleryChat = (
  sessionId: string,
  text: string,
  options?: { teammateMode?: TeammateMode; teamTemplateId?: string },
) =>
  invoke<{ ok: boolean }>('owlery:start_chat', {
    sessionId,
    text,
    teammateMode: options?.teammateMode,
    teamTemplateId: options?.teamTemplateId,
  });
```

- [ ] **Step 4: 给 Conversation 增加 teamTemplateId**

```ts
// apps/web/src/types/index.ts
export interface Conversation {
  id: string;
  title: string;
  mode: AppMode;
  /** @deprecated 由 teamTemplateId 替代，保留仅用于兼容旧数据 */
  teammateMode?: TeammateMode;
  /** 用户手动选择的团队模板 ID */
  teamTemplateId?: string;
  lastMessage: string;
  lastTime: Date;
  unread: number;
  agentIds: string[];
  pinned?: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

- [ ] **Step 5: 运行类型检查**

Run:
```bash
pnpm typecheck
```

Expected: 通过。

---

## Task 6: 重构 SessionRuntime 支持动态招募

**Files:**
- Modify: `apps/desktop/src/runtime/SessionRuntime.ts`
- Create: `apps/desktop/src/runtime/__tests__/DynamicRecruitment.test.ts`

- [ ] **Step 1: 在 SessionRuntime 中新增招募状态与辅助方法**

在 `SessionRuntime` 类中添加：

```ts
private pendingRecruitment: {
  sentinelTitle?: string;
  workers?: string[];
} = {};

private recruitedAgents = new Map<string, AgentRuntime>();

private getSanitizedId(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
```

- [ ] **Step 2: 实现 recruitSentinel 方法**

```ts
private recruitSentinel(elder: AgentRuntime, title: string): AgentRuntime {
  const id = `${this.sessionId}:sentinel:${this.getSanitizedId(title)}`;
  const existing = this.recruitedAgents.get(id);
  if (existing) return existing;

  const sentinel = this.agentFactory.createAgent({
    id,
    sessionId: this.sessionId,
    role: "sentinel",
    title: title as import("@owl-os/core").AgentTitle,
    sentinelKind: "primary",
  });
  this.agentExecutor.register(sentinel);
  this.recruitedAgents.set(id, sentinel);

  this.messageBox.createChannel({
    sessionId: this.sessionId,
    endpointA: elder.id,
    endpointB: sentinel.id,
  });

  this.port.postEvent({
    type: "chunk",
    chunk: {
      type: "tool_event",
      event: {
        type: "tool_execution_end",
        toolName: "recruit_sentinel",
        startedAt: Date.now(),
        endedAt: Date.now(),
        isError: false,
        result: { title, sentinelId: id },
      },
    },
  });

  return sentinel;
}
```

- [ ] **Step 3: 实现 recruitWorkers 方法**

```ts
private recruitWorkers(sentinel: AgentRuntime, titles: string[]): AgentRuntime[] {
  const workers: AgentRuntime[] = [];
  for (const title of titles) {
    const id = `${this.sessionId}:worker:${this.getSanitizedId(title)}`;
    if (this.recruitedAgents.has(id)) {
      workers.push(this.recruitedAgents.get(id)!);
      continue;
    }
    const worker = this.agentFactory.createAgent({
      id,
      sessionId: this.sessionId,
      role: "worker",
      title: title as import("@owl-os/core").AgentTitle,
      parentSentinelId: sentinel.id,
    });
    this.agentExecutor.register(worker);
    this.recruitedAgents.set(id, worker);
    workers.push(worker);
  }

  this.port.postEvent({
    type: "chunk",
    chunk: {
      type: "tool_event",
      event: {
        type: "tool_execution_end",
        toolName: "recruit_workers",
        startedAt: Date.now(),
        endedAt: Date.now(),
        isError: false,
        result: { workers: titles },
      },
    },
  });

  return workers;
}
```

- [ ] **Step 4: 在 streamAgent 中拦截招募工具事件**

修改 `streamAgent` 内的 chunk 循环：

```ts
for await (const chunk of agent.streamChat({
  sessionId: this.sessionId,
  messages: [message],
  context: undefined,
})) {
  if (chunk.type === "tool_event") {
    const event = chunk.event as Record<string, unknown>;
    const toolName = String(event?.toolName ?? event?.name ?? "");
    if (toolName === "recruit_sentinel" && agent.role === "elder") {
      const title = this.extractRecruitTitle(event);
      if (title) this.pendingRecruitment.sentinelTitle = title;
      this.forwardChunk(agent, chunk);
      continue;
    }
    if (toolName === "recruit_workers" && agent.role === "sentinel") {
      const workers = this.extractWorkerTitles(event);
      if (workers) this.pendingRecruitment.workers = workers;
      this.forwardChunk(agent, chunk);
      continue;
    }
  }
  this.forwardChunk(agent, chunk);
}
```

并添加辅助函数：

```ts
private extractRecruitTitle(event: Record<string, unknown>): string | undefined {
  const result = event?.result as Record<string, unknown> | undefined;
  const args = event?.args as Record<string, unknown> | undefined;
  const title = String(result?.title ?? args?.title ?? "");
  return title || undefined;
}

private extractWorkerTitles(event: Record<string, unknown>): string[] | undefined {
  const result = event?.result as Record<string, unknown> | undefined;
  const args = event?.args as Record<string, unknown> | undefined;
  const workers = (result?.workers ?? args?.workers ?? []) as string[];
  return workers.length > 0 ? workers : undefined;
}
```

- [ ] **Step 5: 实现用户选择团队模板时的 Sentinel title 映射**

```ts
private resolveSentinelTitleFromMode(mode: string): string {
  const map: Record<string, string> = {
    pipeline: "planner",
    supervisor: "supervisor",
    brainstorm: "coordinator",
    brainstorming: "coordinator",
    hierarchy: "cto",
    swarm: "cto",
  };
  return map[mode] ?? "supervisor";
}
```

- [ ] **Step 6: 重写 runChat 流程**

```ts
private async runChat(userMessage: string, teammateMode?: TeammateMode): Promise<void> {
  this.runStatus = "running";
  this.emitStatus();

  try {
    const elder = this.ensureElder();
    let sentinel: AgentRuntime;

    if (teammateMode) {
      // 用户已选择团队模板：主线程已将模板 mode 映射为 TeammateMode
      const title = this.resolveSentinelTitleFromMode(teammateMode);
      sentinel = this.recruitSentinel(elder, title);
      await this.streamAgent(elder, userMessage);
    } else {
      // 智能选择：先让 Elder 调用 recruit_sentinel
      await this.streamAgent(elder, userMessage);
      const title = this.pendingRecruitment.sentinelTitle ?? "supervisor";
      sentinel = this.recruitSentinel(elder, title);
    }

    // Sentinel 执行并决定 Workers
    await this.streamAgent(sentinel, userMessage);
    const workerTitles = this.pendingRecruitment.workers;
    if (workerTitles && workerTitles.length > 0) {
      const workers = this.recruitWorkers(sentinel, workerTitles);
      for (const worker of workers) {
        await this.streamAgent(worker, userMessage);
      }
    }

    if (this.runStatus === "running") {
      this.runStatus = "completed";
    }
  } catch (error) {
    const errorText = error instanceof Error ? error.message : String(error);
    this.runStatus = "failed";
    this.port.postEvent({ type: "error", error: errorText });
  } finally {
    this.currentAgent = undefined;
    this.pendingRecruitment = {};
    this.port.postEvent({ type: "done" });
    this.emitStatus();
  }
}
```

- [ ] **Step 7: 更新 startChat 和 handleCommand 签名**

```ts
private startChat(userMessage: string, teammateMode?: TeammateMode): void {
  void this.runChat(userMessage, teammateMode);
}

private async handleCommand(command: ControlCommand): Promise<void> {
  if (command.type === "start_chat") {
    this.startChat(command.userMessage, command.teammateMode);
    return;
  }
  // ... 其余不变
}
```

- [ ] **Step 8: 编写动态招募单元测试**

创建 `apps/desktop/src/runtime/__tests__/DynamicRecruitment.test.ts`：

```ts
import type { AgentDriverChunk, AgentDriverInput, AgentMessage } from "@owl-os/core";
import { AgentFactory, fixedNameGenerator } from "@owl-os/core";
import type { ControlCommand, SessionRuntimeEvent } from "../../eventbus/types.js";
import { SessionRuntime } from "../SessionRuntime.js";
import type { RuntimePort } from "../types.js";

class FakeRuntimePort implements RuntimePort {
  readonly commands: ControlCommand[] = [];
  readonly events: SessionRuntimeEvent[] = [];
  private readonly commandListeners = new Set<(command: ControlCommand) => void>();

  postCommand(command: ControlCommand): void {
    this.commands.push(command);
    this.commandListeners.forEach((callback) => callback(command));
  }

  postEvent(event: SessionRuntimeEvent): void {
    this.events.push(event);
  }

  onCommand(callback: (command: ControlCommand) => void): () => void {
    this.commandListeners.add(callback);
    return () => this.commandListeners.delete(callback);
  }

  onChunk(_callback: (chunk: AgentDriverChunk) => void): () => void { return () => {}; }
  onStatus(_callback: (status: import("@owl-os/core").TeammateStatus) => void): () => void { return () => {}; }
  onDone(_callback: () => void): () => void { return () => {}; }
  onError(_callback: (error: string) => void): () => void { return () => {}; }
}

function createFactory() {
  return new AgentFactory({
    driverFactory: ({ role }) => ({
      streamChat: async function* (_input: AgentDriverInput): AsyncIterable<AgentDriverChunk> {
        if (role === "elder") {
          yield {
            type: "tool_event",
            event: {
              type: "tool_execution_end",
              toolName: "recruit_sentinel",
              result: { title: "planner" },
            },
          };
          yield { type: "text_delta", text: "已交给专业团队" };
          yield { type: "done" };
        } else if (role === "sentinel") {
          yield {
            type: "tool_event",
            event: {
              type: "tool_execution_end",
              toolName: "recruit_workers",
              result: { workers: ["developer", "tester"] },
            },
          };
          yield { type: "text_delta", text: "开始执行" };
          yield { type: "done" };
        } else {
          yield { type: "text_delta", text: `${role}:done` };
          yield { type: "done" };
        }
      },
      send: async (_message: AgentMessage) => {},
      receive: async function* () {},
      abort: async () => {},
    }),
    nameGenerator: fixedNameGenerator,
  });
}

describe("SessionRuntime dynamic recruitment", () => {
  it("creates sentinel and workers from tool events", async () => {
    const port = new FakeRuntimePort();
    const runtime = new SessionRuntime({ sessionId: "session-a", agentFactory: createFactory(), port });
    runtime.run();

    port.postCommand({ type: "start_chat", userMessage: "写个登录页面" });
    await new Promise((resolve) => setTimeout(resolve, 200));
    runtime.dispose();

    const toolEvents = port.events
      .filter((e) => e.type === "chunk" && e.chunk.type === "tool_event")
      .map((e) => (e as { chunk: { event: { toolName: string } } }).chunk.event.toolName);

    expect(toolEvents).toContain("recruit_sentinel");
    expect(toolEvents).toContain("recruit_workers");
  });
});
```

- [ ] **Step 9: 运行测试**

Run:
```bash
pnpm --filter @owl-os/desktop test
```

Expected: 全部通过。

---

## Task 7: 主线程 Owlery 透传 teamTemplateId

**Files:**
- Modify: `apps/desktop/src/db/queries/teams.ts`
- Modify: `apps/desktop/src/owlery/Owlery.ts`

- [ ] **Step 1: 在 queries/teams.ts 增加 getTeam**

```ts
export function getTeam(db: Database.Database, id: string): TeamTemplate | undefined {
  const row = db.prepare(`${selectColumns} WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  return row ? mapTeam(row) : undefined;
}
```

- [ ] **Step 2: 更新 startChat 接收 teamTemplateId**

```ts
async startChat(sessionId: string, userMessage: string, options?: { teamTemplateId?: string; teammateMode?: TeammateMode }): Promise<void> {
  // ... 原有逻辑 ...
  const resolvedMode = options?.teamTemplateId
    ? await this.resolveTeammateModeFromTemplate(options.teamTemplateId)
    : options?.teammateMode;
  slot.start(userMessage, resolvedMode);
}

private async resolveTeammateModeFromTemplate(teamTemplateId: string): Promise<TeammateMode | undefined> {
  try {
    const template = queries.getTeam(getDatabase(), teamTemplateId);
    const map: Record<string, TeammateMode> = {
      pipeline: "pipeline",
      supervisor: "supervisor",
      brainstorming: "brainstorm",
      brainstorm: "brainstorm",
      hierarchy: "hierarchy",
      swarm: "hierarchy",
    };
    return template?.mode ? map[template.mode] ?? undefined : undefined;
  } catch {
    return undefined;
  }
}
```

- [ ] **Step 3: 更新 handleFrontendMessage 解析 payload**

```ts
if (message.type === "start_chat") {
  const payload = message.payload as { userMessage?: string; teammateMode?: TeammateMode; teamTemplateId?: string };
  if (!payload.userMessage) return;
  await this.startChat(sessionId, payload.userMessage, { teamTemplateId: payload.teamTemplateId, teammateMode: payload.teammateMode });
  return;
}
```

- [ ] **Step 3: 运行类型检查**

Run:
```bash
pnpm typecheck
```

Expected: 通过。

---

## Task 8: IPC 回退路径同步更新

**Files:**
- Modify: `apps/desktop/src/ipc/owlery.ts`

- [ ] **Step 1: 更新 owlery:start_chat handler 接收 teamTemplateId**

```ts
ipcMain.handle(
  "owlery:start_chat",
  (
    event,
    {
      sessionId,
      text,
      teammateMode,
      teamTemplateId,
    }: { sessionId: string; text: string; teammateMode?: string; teamTemplateId?: string },
  ) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const mode = normalizeTeammateMode(teammateMode);
    // packages/core 的 Owlery 回退路径仅接收 teammateMode；teamTemplateId 由主线程在需要时解析
    owlery.startChat({ sessionId, userMessage: text, teammateMode: mode });
    // ... 其余不变
  },
);
```

注意：`packages/core` 的 `Owlery.startChat` 目前接收 `teammateMode` 而非 `teamTemplateId`。若保留 IPC 回退路径，需要同步扩展 `packages/core/src/owlery/Owlery.ts` 的 `ChatLoopInput` 与 `startChat`。本任务仅做最小同步；如超出范围，可在实现时再定。

- [ ] **Step 2: 运行类型检查**

Run:
```bash
pnpm typecheck
```

Expected: 通过。

---

## Task 9: 前端移除 single/squad 视觉区分

**Files:**
- Modify: `apps/web/src/types/index.ts`
- Modify: `apps/web/src/contexts/AppContext.tsx`
- Modify: `apps/web/src/components/chat/ChatContainer.tsx`
- Modify: `apps/web/src/components/chat/EmptyState.tsx`
- Modify: `apps/web/src/components/chat/ConversationList.tsx`
- Modify: `apps/web/src/components/chat/UpgradeBar.tsx`（可选，可移除或保留为提示）

- [ ] **Step 1: 简化 AppMode 类型**

```ts
// apps/web/src/types/index.ts
/** 应用模式：统一对话 / 自动化 */
export type AppMode = 'chat' | 'auto';
```

- [ ] **Step 2: 修改 AppContext 默认模式**

```ts
// apps/web/src/contexts/AppContext.tsx
const [chatMode, setChatMode] = useState<AppMode>('chat');
```

- [ ] **Step 3: 更新 ChatContainer 中的模式判断**

删除 `isSquad` / `isAuto` 对侧边栏的差异化渲染，改为根据 `currentConversation?.teamTemplateId` 或 `chatMode === 'auto'`：

```tsx
const hasTeam = Boolean(currentConversation?.teamTemplateId);
const isAuto = chatMode === 'auto';

// 任务看板：有团队 或 非自动模式时显示 TaskBoard
// 执行日志：auto 模式显示 ExecutionLog
```

具体替换 `taskBoardOpen && isSquad` 等条件：

```tsx
{taskBoardOpen && !isAuto && <TaskBoard />}
{taskBoardOpen && isAuto && <ExecutionLog />}
```

删除 `isSquad` 相关样式差异。

- [ ] **Step 4: 更新 EmptyState 快捷操作**

移除 `teammateMode` 参数：

```ts
interface QuickAction {
  label: string;
  emoji: string;
  prompt: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: '分析数据', emoji: '📊', prompt: '帮我分析用户增长数据，找出关键漏斗瓶颈' },
  { label: '生成代码', emoji: '⚡', prompt: '帮我生成一个 React 拖拽排序组件' },
  { label: '撰写文档', emoji: '📝', prompt: '帮我撰写一份产品需求文档' },
  { label: '竞品监控', emoji: '🔍', prompt: '运行每日竞品监控，分析竞品最新动态' },
];
```

`onQuickAction` 签名改为 `(text: string) => void`，调用处不再传 `teammateMode`。

- [ ] **Step 5: 更新 ConversationList 图标/样式**

移除 `mode === 'squad'` 的特殊图标和背景色：

```tsx
// 简化后：所有会话使用统一图标
<span className="w-2 h-2 rounded-full bg-slate-500" />
```

- [ ] **Step 6: 运行 lint 与类型检查**

Run:
```bash
pnpm lint && pnpm typecheck
```

Expected: 通过。

---

## Task 10: 前端输入框增加团队选择按钮

**Files:**
- Modify: `apps/web/src/components/chat/SingleAgentChat.tsx`
- Modify: `apps/web/src/components/chat/useOwleryRuntime.ts`
- Modify: `apps/web/src/components/chat/ChatContainer.tsx`

- [ ] **Step 1: 在 ChatComposer 中增加团队选择按钮**

在 `ChatComposer` 组件的 toolbar 区域（文件顶部附近）新增：

```tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { Users } from 'lucide-react';
import type { TeamTemplate } from '@/types';
import { listTeams } from '@/services/electron';

function TeamSelector({
  selected,
  onSelect,
}: {
  selected?: string;
  onSelect: (teamId?: string) => void;
}) {
  const [teams, setTeams] = useState<TeamTemplate[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    listTeams().then(setTeams).catch(() => setTeams([]));
  }, []);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg border border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/5"
      >
        <Users className="w-3.5 h-3.5" />
        {selected ? teams.find(t => t.id === selected)?.name ?? '团队' : '智能选择'}
      </button>
      {open && (
        <div className="absolute bottom-8 left-0 z-20 min-w-[160px] rounded-xl border border-white/10 bg-background/95 p-1 shadow-xl">
          <button
            type="button"
            onClick={() => { onSelect(undefined); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-white/5 text-slate-300"
          >
            智能选择
          </button>
          {teams.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => { onSelect(t.id); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-white/5 text-slate-300"
            >
              {t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 把选择状态接入 ChatComposer**

在 `ChatComposer` 组件内部新增：

```ts
const [selectedTeam, setSelectedTeam] = useState<string | undefined>(undefined);
```

在 toolbar 中渲染：

```tsx
<TeamSelector selected={selectedTeam} onSelect={setSelectedTeam} />
```

- [ ] **Step 3: 把 teamTemplateId 传回父组件**

修改 `ChatComposer` 的 props：

```ts
interface ChatComposerProps {
  initialText?: string;
  isRunning?: boolean;
  onTeamChange?: (teamId?: string) => void;
}
```

在 `setSelectedTeam` 时调用：

```ts
const handleSelectTeam = useCallback((teamId?: string) => {
  setSelectedTeam(teamId);
  onTeamChange?.(teamId);
}, [onTeamChange]);
```

- [ ] **Step 4: 在 SingleAgentChat 中保存 teamTemplateId 并传给 useOwleryRuntime**

```ts
const [teamTemplateId, setTeamTemplateId] = useState<string | undefined>(initialTeamTemplateId);

// 在 ChatComposer 渲染处
<ChatComposer
  initialText={editText}
  isRunning={isRunning}
  onTeamChange={setTeamTemplateId}
/>
```

- [ ] **Step 5: 更新 useOwleryRuntime 发送 teamTemplateId**

```ts
export function useOwleryRuntime(
  conversationId: string,
  mode: AppMode = 'chat',
  teammateMode?: TeammateMode,
  teamTemplateId?: string,
) {
  // ...
  const handleNew = useCallback(async (message: AppendMessage) => {
    // ...
    const webSocketSent = webSocketClientRef.current?.isSessionReady() === true
      ? webSocketClientRef.current.sendChat(text, { teammateMode, teamTemplateId })
      : false;
    activeTransportRef.current = webSocketSent ? 'websocket' : 'ipc';
    if (!webSocketSent) await startOwleryChat(conversationId, text, { teammateMode, teamTemplateId });
  }, [conversationId, conversationTitle, mode, teammateMode, teamTemplateId]);
}
```

- [ ] **Step 6: 在 ChatContainer 保存 conversation 时写入 teamTemplateId**

```ts
async function handleNewConv(options?: {
  mode?: AppMode;
  teamTemplateId?: string;
  title?: string;
}) {
  const conversation = await saveConversation({
    // ...
    mode: options?.mode ?? 'chat',
    teamTemplateId: options?.teamTemplateId,
    agentIds: options?.teamTemplateId ? [] : ['elder_boss'],
  });
  // ...
}
```

- [ ] **Step 7: 运行 lint 与类型检查**

Run:
```bash
pnpm lint && pnpm typecheck
```

Expected: 通过。

---

## Task 11: 全量验证

- [ ] **Step 1: 运行 lint**

```bash
pnpm lint
```

Expected: 通过。

- [ ] **Step 2: 运行类型检查**

```bash
pnpm typecheck
```

Expected: 通过。

- [ ] **Step 3: 运行测试**

```bash
pnpm test
```

Expected: core 17 / desktop 11 全部通过。

- [ ] **Step 4: 运行构建**

```bash
pnpm build
```

Expected: 通过。

- [ ] **Step 5: 手动验证**

1. 启动 `pnpm --filter @owl-os/desktop dev`。
2. 发送消息，观察 Teammate 面板：应出现 boss + sentinel + 动态 worker。
3. 观察会话日志：应出现 `tool.call` 事件，toolName 包含 `recruit_sentinel` 和 `recruit_workers`。
4. 输入框团队选择按钮应能打开下拉（mock/真实团队列表）。

---

## 自审检查

1. **Spec 覆盖：**
   - 前端统一入口 ✅ Task 9
   - 用户选择团队 ✅ Task 10
   - Elder 智能选择 Sentinel ✅ Task 6
   - Sentinel 动态生成 Worker ✅ Task 6
   - Sentinel 不同 title/prompt ✅ Task 1 + Task 3
   - 招募过程可观测 ✅ Task 6 (tool_event)
2. **Placeholder 扫描：** 所有 TODO 仅存在于占位 prompt 文件中，实现代码无 TBD。
3. **类型一致性：** `teamTemplateId` 在前后端、WebSocket、IPC、Worker 命令中名称一致；`AgentTitle` 统一为 `string`。
4. **范围：** 本计划聚焦统一入口与动态招募；团队模板数据完全打通、自动化工作流模式不在本次范围内。
