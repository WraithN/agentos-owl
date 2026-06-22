# OwlOS 前端到 Teammate 架构说明

> 本文档覆盖三条核心链路的当前实现与已知缺口：
> 1. `webui → Elder → … → teammate` 的会话链路
> 2. `teammate → CrystalBall → webui` 的状态链路
> 3. 前端 `ChatModule` 的信息流处理
>
> 最后更新：2026-06-19

---

## 1. 当前入口链路

用户从 Web 前端进入聊天模块，默认路径已经统一为 Owlery / Teammate 新架构。

```text
ChatContainer
  -> ChatHeader
  -> SingleAgentChat
    -> useOwleryRuntime
      -> apps/web/src/services/electron.ts Owlery API
        -> Electron preload
          -> apps/desktop/src/ipc/owlery.ts
            -> apps/desktop/src/agent/owleryRuntime.ts
              -> packages/core/src/owlery/Owlery.ts
                -> SessionSlot
                  -> ElderAgent
                  -> TeammateManager
                    -> AgentPool
                      -> PrimarySentinel
                      -> Workers / SubSentinels
                  -> CrystalBall 内部状态源
```

旧前端 `usePiAgentRuntime` 与旧 `agent:create / agent:prompt / agent:stop / agent:event` IPC 已删除。底层仍可通过 `PiAgentDriver` 把具体模型运行时事件适配为 core `AgentDriverChunk`，但前端不再直接感知旧 Pi Agent runtime。

---

## 2. 会话链路：webui → Elder → … → teammate

### 2.1 前端入口

#### 2.1.1 AppContext（全局状态）

`apps/web/src/contexts/AppContext.tsx` 维护：

- `activeModule: string` —— 当前激活的侧边栏模块，默认 `'chat'`。
- `chatMode: AppMode` —— 当前对话模式，默认 `'squad'`。
- `currentConversation: Conversation | null` —— 当前选中的会话。
- `conversations: Conversation[]` —— 会话列表，来自 `listConversations()`。

`refreshConversations()` 在加载列表后，若 `currentConversation` 为空会自动选中 `data[0]`。这与 PRD 要求的「默认展示对话模块空状态」不符，已记入 TODO。

#### 2.1.2 ChatContainer（模式判断与布局）

`apps/web/src/components/chat/ChatContainer.tsx` 根据 `chatMode` 决定主区域渲染：

```tsx
{chatMode === 'single' ? (
  currentConversation ? <SingleAgentChat ... /> : <EmptyState ... />
) : (
  <EmptyState ... />
)}
```

- 仅 `single` 模式渲染真实对话组件。
- `squad` / `auto` 模式目前统一回退到 `EmptyState`。
- `handleNewConv` 新建会话时写死 `mode: 'single'`、`agentIds: ['elder_boss']`。
- 右侧抽屉：`squad` → `TaskBoard`；`auto` → `ExecutionLog`；其他 → `TaskBoard`。

#### 2.1.3 SingleAgentChat（消息流与输入区）

`apps/web/src/components/chat/SingleAgentChat.tsx` 是当前唯一真实对话 UI：

- 基于 `@assistant-ui/react` 的 `AssistantRuntimeProvider`、`ThreadPrimitive`、`ComposerPrimitive`、`MessagePrimitive`。
- 消息列表、消息项、输入区全部内联在该文件中，未拆分为 `MessageFlow.tsx` / `MessageItem.tsx` / `InputArea.tsx`。
- 支持文本、reasoning、tool-call、image 等消息 part 的渲染。
- 工具栏按钮（附件、录音、命令、技能、团队）目前仅修改输入框文本或本地 state，未接入真实能力。

#### 2.1.4 useOwleryRuntime（前后端消息桥接）

`apps/web/src/components/chat/useOwleryRuntime.ts` 负责：

- 挂载时 `activateOwlerySession(conversationId)`，然后拉取 `listMessages` + `getOwleryBufferedOutput` 恢复历史与未完成回复。
- 用户发送时：`saveConversation` → `saveMessage` → `startOwleryChat(conversationId, text)`。
- 通过 `onOwleryChunk` 订阅 `owlery:chunk`，按 `sessionId` 过滤后调用 `applyChunk`。
- `applyChunk` 维护 `assistantIdRef` / `assistantTextRef` / `assistantPartsRef`，处理 `text_delta` / `reasoning_delta` / `tool_event` / `error` / `done`。
- `regenerateFromMessage` 与 `onCancel` 当前仅 toast 提示，未真正停止或重新生成。

### 2.2 Service 层封装

`apps/web/src/services/electron.ts` 中与会话链路相关的关键 API：

```ts
export const activateOwlerySession = (sessionId: string) =>
  invoke('owlery:activate_session', { sessionId });
export const startOwleryChat = (sessionId: string, text: string) =>
  invoke('owlery:start_chat', { sessionId, text });
export const getOwleryBufferedOutput = (sessionId: string) =>
  invoke<AgentDriverChunk[]>('owlery:get_buffered_output', { sessionId });
export const onOwleryChunk = (callback) => subscribe('owlery:chunk', callback);
```

**注意**：`startOwleryChat` 仅传递 `sessionId` + `text`，未传递前端 `chatMode` 或用户所选团队模板，因此 Owlery 后端无法感知 UI 模式。

### 2.3 Desktop IPC

`apps/desktop/src/ipc/owlery.ts`：

- `owlery:activate_session`：激活会话，发布当前 Teammate 状态，确保窗口级 chunk 订阅。
- `owlery:start_chat`：调用 `owlery.startChat`，发布 Teammate 状态，确保订阅。
- `owlery:get_buffered_output`：返回会话槽的 `outputBuffer`。
- `owlery:get_teammate_status`：返回 `owlery.getTeammateStatus(sessionId)`。
- 订阅按 `windowId + sessionId` 去重；窗口关闭时取消订阅。
- **仅当 `sessionId` 是当前 active slot 时才发送 `owlery:chunk`**，后台会话的 chunk 不会推送到前端。

### 2.4 Owlery Runtime 构造

`apps/desktop/src/agent/owleryRuntime.ts`：

```ts
const driverFactory: AgentDriverFactory = (input) => {
  if (!hasDefaultLlm()) throw new NoDefaultLlmError();
  const systemPrompt = input.role === "elder"
    ? loadSystemPrompt("elder_boss")
    : `你是 ${input.title}，负责在 Agent 团队中完成 ${input.role} 职责。`;
  return new PiAgentDriver(createPlainAgent(input.sessionId, 0, { systemPrompt }));
};

const toolFactory: AgentToolFactory = (input) => {
  if (input.role !== "sentinel" || input.title !== "supervisor") return [];
  return [{ name: "recruit", description: "评估任务并招募当前 Teammate 的后续成员" }];
};

export const owlery = new Owlery({
  agentFactory: new AgentFactory({
    driverFactory,
    nameGenerator: fixedNameGenerator,
    toolFactory,
  }),
});
```

- `fixedNameGenerator` 直接把 `title` 当作 `name`。
- `recruit` 工具目前只有描述，没有 `execute` 实现，因此 Primary Sentinel 无法真正招募 Worker。

### 2.5 核心运行链路

`packages/core/src/owlery/Owlery.ts` 中的 `SessionSlot`：

```ts
export interface SessionSlot {
  sessionId: SessionId;
  elder: ElderAgentRuntime;
  teammates?: TeammateManager;
  crystalBall: CrystalBall;
  visibility: SessionVisibility;
  runStatus: SessionRunStatus;
  outputBuffer: AgentDriverChunk[];
  subscribers: Set<SessionChunkListener>;
  lastError?: string;
}
```

创建/激活会话：

- `getOrCreateSlot(sessionId)`：创建 Elder，注册到 `CrystalBall`。
- `activateSession(sessionId)`：把会话切为 `active`，旧会话移入 `background`。

招募流程 `recruitForSession`：

- `resolveRecruitPlan`：无用户指定时调用 `modeEvaluator`，**默认实现恒返回 `"supervisor"`**。
- 创建 `AgentPool` + Primary Sentinel（supervisor）。
- `recruitMembersByPrimary`：Primary Sentinel 的 `recruit` 工具目前无 execute，因此回退到 `createDefaultMemberSpecs`，生成 3 个默认 Worker：`planner`、`operator`、`cto`。
- `createBasicTeammates`：组装 `TeammateManager`。

运行会话 `runSession`：

- `conversationContext` 当前始终传 `{ messages: [] }`，历史消息未传给 Elder。
- `mode === "brainstorm"`：调用 `TeammateManager.dispatch`，由 Worker 并行生成结果后汇总。
- 其他模式：直接让 Elder 自己流式回复，Primary Sentinel 与 Workers 创建后并不参与实际对话。
- 流式 chunk 通过 `publishChunk` 写入 `outputBuffer` 并通知所有 `subscribers`。

### 2.6 Pi Agent 驱动映射

`apps/desktop/src/agent/drivers/PiAgentDriver.ts`：

- `streamChat` 通过 `DefaultPromptCompiler` 拼接 `systemPrompt`、`messages` payload、`context`。
- 订阅 pi-agent 事件并映射为 `AgentDriverChunk`：
  - `agent_end` → `done`
  - `tool_execution_start/update/end` → `tool_event`
  - `message_update/end` → `text_delta` / `reasoning_delta`

### 2.7 会话链路总结

```text
用户输入 (SingleAgentChat / ChatComposer)
  ↓
ComposerPrimitive.Send → useOwleryRuntime.handleNew
  ↓
saveConversation + saveMessage + startOwleryChat (IPC)
  ↓
owlery:start_chat → Owlery.startChat → Owlery.runSession
  ↓
if (!teammates) Owlery.recruitForSession
  ↓
  ├─ create Elder (elder_boss.md)
  ├─ create AgentPool + Primary Sentinel (supervisor)
  ├─ recruitMembersByPrimary → fallback 默认 workers (planner/operator/cto)
  └─ createBasicTeammates → TeammateManager
  ↓
if mode === "brainstorm": TeammateManager.dispatchBrainstorm → workers
else: slot.elder.streamChat → PiAgentDriver → Pi Agent LLM
  ↓
AgentDriverChunk (text_delta/reasoning_delta/tool_event/error/done)
  ↓
Owlery.publishChunk → slot.outputBuffer + slot.subscribers
  ↓
IPC ensureSubscription → window.webContents.send("owlery:chunk")
  ↓
useOwleryRuntime.onOwleryChunk → applyChunk → setMessages
  ↓
@assistant-ui/react 重新渲染 SingleAgentChat
```

---

## 3. Teammate 对象

Teammate 是对用户可见的团队对象，不等同于内部 AgentPool。

```ts
interface Teammate {
  id: string;
  templateTeammateId?: string;
  name: string;
}
```

- `id`：本次会话中的团队实例 ID。
- `templateTeammateId`：用户可能传入的团队模板 ID，当前先允许为空。
- `name`：团队展示名称；无模板时自动生成 `3~5 个字符 + 团队`。

`TeammateManager` 负责把 Teammate 元信息、协作模式、Primary Sentinel、AgentPool 和消息通道绑定起来。

---

## 4. Recruit 两阶段流程

### 4.1 Elder 初次 recruit

用户消息可能携带 `templateTeammateId`。如果用户没有指定团队模板，则 Elder 调用 recruit 逻辑生成：

- Teammate ID
- Teammate 随机名称
- 协作模式
- Primary Sentinel Agent

Elder 阶段只创建 Primary Sentinel，不直接创建完整团队。

### 4.2 Primary Sentinel 再次 recruit

Primary Sentinel 获取任务上下文后，通过注册在自身上的 `recruit` 工具评估任务并招募后续成员。

```text
Elder
  -> recruitForSession
    -> create Teammate
    -> create PrimarySentinel
    -> PrimarySentinel.recruit tool
      -> create Worker / SubSentinel specs
      -> AgentFactory async create agents
```

当前 core 已支持 `AgentToolRegistration`：

```ts
interface AgentToolRegistration {
  name: string;
  description: string;
  execute?: (input: RecruitToolInput) => Promise<RecruitAgentSpec[]>;
}
```

Desktop 侧已为 Primary Sentinel 注册 `recruit` 工具元数据。真实 LLM 工具调用与动态工具执行仍是下一阶段要接入的重点。

---

## 5. 状态链路：teammate → CrystalBall → webui

### 5.1 CrystalBall 内部状态源

`packages/core/src/owlery/CrystalBall.ts` 维护每个 Agent 的工作快照：

```ts
export class CrystalBall {
  private readonly snapshots = new Map<AgentId, AgentWorkSnapshot>();
  private readonly listeners = new Set<(snapshot: AgentWorkSnapshot[]) => void>();

  registerAgent(agent: AgentRuntime): void { ... }
  updateStatus(agentId, status, currentTask?): void { ... }
  getSnapshot(): AgentWorkSnapshot[] { ... }
  subscribe(listener): () => void { ... }
}
```

### 5.2 当前状态更新点

| Agent | 更新位置 | 实际状态 |
|-------|----------|----------|
| Elder | `Owlery.runSession`：启动时 `in_progress`，完成/失败时 `completed`/`failed` | 会变化 |
| Primary Sentinel | 注册后无 `updateStatus` 调用 | 始终 `not_started` |
| Workers | 注册后无 `updateStatus` 调用 | 始终 `not_started` |

只有在 `brainstorm` 模式下 `TeammateManager.dispatchBrainstorm` 会调用 `worker.streamChat`，但也没有更新 `CrystalBall` 状态。

### 5.3 Owlery 组装 TeammateStatus

`Owlery.getTeammateStatus(sessionId)` 从 `CrystalBall` 快照组装：

```ts
getTeammateStatus(sessionId: SessionId): TeammateStatus {
  const slot = this.getOrCreateSlot(sessionId);
  const snapshots = slot.crystalBall.getSnapshot();
  const primaryId = slot.teammates?.primarySentinelId;
  const leaderSnapshot = snapshots.find(a => a.agentId === primaryId) ?? snapshots.find(a => a.role === "elder");
  const members = snapshots.filter(a => a.agentId !== leaderSnapshot?.agentId);
  return { sessionId, teammateId, teammateName, mode, leader, members };
}
```

### 5.4 IPC 广播

`apps/desktop/src/ipc/teammateStatus.ts`：

```ts
export function publishAgentStatus(sessionId: string, status: TeammateStatus): void {
  teammateStatuses.set(sessionId, status);
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send("agent:status", { sessionId, status });
  }
}
```

- 内存缓存；每次 Owlery chunk 产生后都会触发一次状态广播。
- 事件名保留为 `agent:status`，负载语义已经是 `TeammateStatus`。

### 5.5 前端展示

`apps/web/src/components/chat/ChatHeader.tsx`：

- 用 `currentConversation.id` 作为 `sessionId`。
- 初始拉取 `getTeammateStatus(currentId)` + 实时订阅 `agent:status`。
- Bot 浮层展示 `teammateName`、`leader`、所有 `members` 及其 `AgentWorkStatus`。
- 状态映射：`not_started` / `in_progress` / `completed` / `failed` / `cancelled`。

### 5.6 状态链路总结

```text
TeammateManager / AgentPool 中的 Agent
  ↓
CrystalBall.registerAgent (创建时) / updateStatus (运行时)
  ↓
Owlery.getTeammateStatus → 组装 leader + members
  ↓
publishAgentStatus(sessionId, status)
  ↓
BrowserWindow.webContents.send("agent:status")
  ↓
ChatHeader onAgentStatus → setTeammateStatus
  ↓
Bot Popover 渲染各 Agent 状态
```

---

## 6. 前端信息流处理

### 6.1 模式区分

前端 `AppMode = 'single' | 'squad' | 'auto'`，后端 `TeammateMode = 'pipeline' | 'brainstorm' | 'supervisor' | 'hierarchy'`。两者映射关系尚未定义。

当前实际行为：

| 模式 | 主区域 | 右侧抽屉 |
|------|--------|----------|
| `single` | `SingleAgentChat`（真实对话） | `TaskBoard` |
| `squad` | `EmptyState` | `TaskBoard` |
| `auto` | `EmptyState` | `ExecutionLog` |

模式切换入口：

1. 会话列表选择会话时 `setChatMode(c.mode)`。
2. 新建会话固定切到 `single`。
3. `UpgradeBar` 点击「组建团队」后切到 `squad`。
4. `EmptyState` 快捷操作写死 `CONVERSATIONS[2]` 并切到 `single`。

### 6.2 消息持久化

`useOwleryRuntime` 通过 `saveConversation` / `saveMessage` 持久化：

- 用户消息发送时立即 `saveMessage`。
- 助手消息在 `done` chunk 到达后持久化，同时更新会话标题与 `lastMessage`。
- `buildConversationUpdate` 固定 `agentIds: ['elder_boss']`，未反映真实参与 Agent。

### 6.3 历史消息与上下文

- 前端挂载时通过 `listMessages(conversationId)` 恢复历史。
- 但 `Owlery.runSession` 中 `conversationContext` 始终传 `{ messages: [] }`，历史未真正进入 Elder 的 prompt。

### 6.4 Mock 数据仍被直接引用

`apps/web/src/data/mockData.ts` 仍在多处被直接引用：

| 文件 | 用途 |
|------|------|
| `components/chat/EmptyState.tsx` | `CONVERSATIONS[2]` 作为快捷操作目标 |
| `components/squad/TaskBoard.tsx` | `KANBAN_TASKS`、`getAgent` |
| `components/squad/TeamPanel.tsx` | `AGENTS`、`KANBAN_TASKS` |
| `components/automation/ExecutionLog.tsx` | `WORKFLOW_NODES` |
| `components/global/CommandPalette.tsx` | `CONVERSATIONS`、`AGENTS`、`WORKFLOW_TEMPLATES` |
| `components/settings/AgentSettings.tsx` | `AGENTS` |
| `components/settings/team/KBPicker.tsx` | `AVAILABLE_KBS` |
| `components/monitor/AgentStatusTable.tsx` | `AGENTS` |
| `components/settings/BillingSettings.tsx` | `BILLING_DATA`、`MONTHLY_COST` |

---

## 7. 当前关键问题

### 7.1 UI 层模式不一致

1. `AppContext` 默认 `chatMode='squad'` 且自动选中第一条会话，违反 PRD「默认展示对话模块空状态」。
2. `ChatContainer` 中 `squad` / `auto` 模式统一回退到 `EmptyState`，没有真实对话界面。
3. 新建会话硬编码 `mode: 'single'`、`agentIds: ['elder_boss']`，未按当前模式创建。
4. `startOwleryChat` 未传递前端模式或团队模板，Owlery 后端无法感知 UI 意图。
5. `UpgradeBar` 只支持 `single → squad`，缺少 `single → auto` 升级路径。
6. `EmptyState` 快捷操作写死 mock 会话，不会真正创建新会话并发送。

### 7.2 招募与调度链路不完整

1. `modeEvaluator` 是存根，恒返回 `"supervisor"`，无法根据用户输入自动切换 `brainstorm` / `pipeline` / `hierarchy`。
2. `recruit` 工具无 `execute` 实现，`recruitMembersByPrimary` 永远走 fallback 默认 worker。
3. 除 `brainstorm` 模式外，Elder 直接流式回复，Primary Sentinel 与 Workers 创建后闲置。
4. `brainstorm` 模式下 Worker 运行时未调用 `CrystalBall.updateStatus`。
5. 普通模式 `TeammateManager.dispatch`（非 brainstorm）仅把消息塞进 `MessageBox`，不驱动 Agent 运行。
6. `MessageBox` 是纯内存队列，重启后通道丢失，未持久化。

### 7.3 CrystalBall 状态缺口

1. Primary Sentinel / Workers 注册后始终 `not_started`。
2. 没有工具/任务级状态。
3. `SessionSlot.runStatus` 未通过 IPC 暴露给前端。

### 7.4 前端结构与功能缺口

1. `MessageFlow.tsx` / `MessageItem.tsx` / `InputArea.tsx` 不存在，相关功能全部内联在 `SingleAgentChat.tsx`。
2. `SingleAgentChat.tsx` 已超过 600 有效行，需要拆分。
3. 取消生成、重新生成未实现（仅 toast）。
4. 附件、录音、命令、技能、团队选择仅修改输入框文本，未接入真实能力。
5. `MonitorModule` / `TaskBoard` / `ExecutionLog` / `TeamPanel` 仍基于 mock 数据。

### 7.5 类型/模型不一致

1. `AppMode` 与 `TeammateMode` 映射关系未定义。
2. `TeamTemplate.mode` 枚举包含 `'brainstorming'`，后端 `TeammateMode` 是 `'brainstorm'`。
3. `AgentTitle` 硬编码为 `boss | cto | planner | supervisor | operator`，与 UI 中丰富的角色模型不同。

---

## 8. 建议下一步

1. 修复默认状态：`chatMode` 默认 `'single'`，`currentConversation` 默认 `null`，`refreshConversations` 不再自动选中第一条。
2. 统一发送入口：让 `EmptyState` 快捷操作真正创建新会话并调用发送逻辑，移除对 `CONVERSATIONS[2]` 的硬编码引用。
3. 定义并传递模式映射：前端 `single/squad/auto` ↔ 后端 `supervisor/brainstorm/pipeline/hierarchy`，并在 `startOwleryChat` 中传递。
4. 实现 Primary Sentinel 的真实 `recruit` 工具执行：根据任务上下文返回 Worker / SubSentinel specs，并由 Owlery 创建 Agent。
5. 在子 Agent 生命周期中调用 `CrystalBall.updateStatus`；补充工具/任务级状态。
6. 拆分 `SingleAgentChat.tsx`，将 `ChatComposer`、`MessageContent`、`ChatMessages` 抽出为独立文件。
7. 实现 `useOwleryRuntime` 的取消与重新生成。
8. 将 `MonitorModule` / `TaskBoard` / `ExecutionLog` / `TeamPanel` 接入真实任务、Agent、工作流数据。
9. 为 Teammate 状态增加端到端测试：发送消息后，Bot 状态面板应展示团队名称、组长和成员状态。
10. 补齐 Owlery runtime 的 stop、retry/regenerate、background 完成通知与输出缓冲持久化。
