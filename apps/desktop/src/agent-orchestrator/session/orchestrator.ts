import { AgentWorkStatus, SessionRunStatus, SessionVisibility } from "@owl-os/core";
import type {
  AgentDriverChunk,
  AgentFactory,
  AgentId,
  AgentRole,
  AgentRuntime,
  TeammateMode,
  TeammateStatus,
} from "@owl-os/core";
import { MessageBox } from "@owl-os/core";
import type { ControlCommand, SessionRuntimeEvent } from "../session/port-types.js";
import { createAgentFactoryWithConfig } from "../../agent-runtime/agent-factory.js";
import { setAgentNamesPersistCallback, setSessionAgentNames } from "../../agent-runtime/agent-names.js";
import type { LlmConfig } from "../../agent-runtime/llm-config.js";
import type { RuntimePort } from "../session/port-types.js";
import { SessionChannel } from "./session-channel.js";
import { TaskBoard } from "../task-board/task-board.js";
import { TaskStatus } from "../task-board/task-status.js";
import { PeerChannel } from "../runner/channel/peer-channel.js";
import { ElderAgentRunner } from "../runner/elder-agent-runner.js";
import { SentinelAgentRunner } from "../runner/sentinel-agent-runner.js";
import { WorkerAgentRunner } from "../runner/worker-agent-runner.js";
import type { BaseAgentRunner } from "../runner/base-agent-runner.js";

const SENTINEL_TITLE_LABEL: Record<string, string> = {
  boss: "老板",
  planner: "规划师",
  supervisor: "监督者",
  coordinator: "协调者",
  cto: "CTO",
};

const WORKER_TITLE_LABEL: Record<string, string> = {
  developer: "开发者",
  tester: "测试员",
  designer: "设计师",
  writer: "撰写者",
  researcher: "研究员",
  analyst: "分析师",
  marketer: "营销员",
  operator: "操作员",
  reviewer: "审核员",
  debugger: "调试员",
};

export interface AgentOrchestratorOptions {
  sessionId: string;
  port: RuntimePort;
  agentFactory?: AgentFactory;
  llmConfig?: LlmConfig;
  agentNames?: Record<string, string>;
  mode?: TeammateMode;
}

function getAgentTitleLabel(role: string, title: string): string {
  if (role === "elder" || title === "boss") return "老板";
  if (role === "sentinel") return SENTINEL_TITLE_LABEL[title] ?? title;
  return WORKER_TITLE_LABEL[title] ?? title;
}

function getTeamName(title: string): string {
  return `${getAgentTitleLabel("sentinel", title)}团队`;
}

/**
 * 新架构的会话运行时（Phase 2）。
 * 使用 SessionChannel + TaskBoard + BaseAgentRunner 分层替代旧 SessionRuntime。
 * 当前通过 feature flag 与旧运行时并存。
 */
export class AgentOrchestrator {
  private readonly sessionId: string;
  private readonly port: RuntimePort;
  private readonly sessionChannel: SessionChannel;
  private readonly taskBoard: TaskBoard;
  private readonly messageBox: MessageBox;
  private agentFactory: AgentFactory;
  private readonly agents = new Map<AgentId, BaseAgentRunner>();
  private elder?: ElderAgentRunner;
  private currentRunner?: BaseAgentRunner;
  private visibility: SessionVisibility = SessionVisibility.ACTIVE;
  private runStatus: SessionRunStatus = SessionRunStatus.IDLE;
  private mode: TeammateMode = "supervisor";
  private unsubscribeCommand?: () => void;
  private unsubscribeOutput?: () => void;
  private unsubscribeTaskEvent?: () => void;
  private unsubscribeAgentStatus?: () => void;

  constructor(options: AgentOrchestratorOptions) {
    this.sessionId = options.sessionId;
    this.port = options.port;
    this.sessionChannel = new SessionChannel(options.sessionId);
    this.taskBoard = new TaskBoard();
    this.messageBox = new MessageBox();
    this.agentFactory = options.agentFactory ?? createAgentFactoryWithConfig(options.llmConfig!);
    this.mode = options.mode ?? "supervisor";
    setSessionAgentNames(this.sessionId, options.agentNames ?? {});
    setAgentNamesPersistCallback(this.sessionId, (names) => {
      this.port.postEvent({ type: "persist_agent_names", names });
    });
    this.subscribeChannelEvents();
  }

  /**
   * 启动命令监听。
   */
  run(): void {
    this.unsubscribeCommand?.();
    this.unsubscribeCommand = this.port.onCommand((command) => {
      void this.handleCommand(command);
    });
  }

  /**
   * 释放所有资源。
   */
  dispose(): void {
    this.unsubscribeCommand?.();
    this.unsubscribeCommand = undefined;
    this.unsubscribeOutput?.();
    this.unsubscribeOutput = undefined;
    this.unsubscribeTaskEvent?.();
    this.unsubscribeTaskEvent = undefined;
    this.unsubscribeAgentStatus?.();
    this.unsubscribeAgentStatus = undefined;
    for (const agent of this.agents.values()) {
      agent.destroy();
    }
    this.agents.clear();
    this.elder = undefined;
  }

  getSessionChannel(): SessionChannel {
    return this.sessionChannel;
  }

  getTaskBoard(): TaskBoard {
    return this.taskBoard;
  }

  getMessageBox(): MessageBox {
    return this.messageBox;
  }

  getAgent(id: AgentId): BaseAgentRunner | undefined {
    return this.agents.get(id);
  }

  getElder(): ElderAgentRunner | undefined {
    return this.elder;
  }

  /**
   * 创建或复用 Elder Agent。
   */
  createElder(title = "boss"): ElderAgentRunner {
    if (this.elder) return this.elder;

    const agent = this.agentFactory.createAgent({
      id: `${this.sessionId}:elder`,
      sessionId: this.sessionId,
      role: "elder",
      title,
    });
    const runner = new ElderAgentRunner(agent, this.sessionChannel, {
      createSentinel: (sentinelTitle) => this.createSentinel(sentinelTitle),
      postEvent: (event) => this.port.postEvent(event),
    });
    this.registerAgent(runner);
    this.elder = runner;
    return runner;
  }

  /**
   * 创建 Sentinel Agent，并建立与 Elder 的点对点通道。
   */
  createSentinel(title: string): SentinelAgentRunner {
    const id = `${this.sessionId}:sentinel:${this.getSanitizedId(title)}`;
    const existing = this.agents.get(id);
    if (existing instanceof SentinelAgentRunner) return existing;

    const elder = this.ensureElder();
    const agent = this.agentFactory.createAgent({
      id,
      sessionId: this.sessionId,
      role: "sentinel",
      title,
      sentinelKind: "primary",
    });
    const parentChannel = new PeerChannel(
      this.messageBox,
      `${this.sessionId}:${elder.id}:${agent.id}`,
      this.sessionId,
      agent.id,
      elder.id,
    );
    const runner = new SentinelAgentRunner(agent, this.sessionChannel, parentChannel, {
      createWorker: (workerTitle) => this.createWorker(workerTitle, agent.id),
      postEvent: (event) => this.port.postEvent(event),
      taskBoard: this.taskBoard,
    });
    this.registerAgent(runner);
    this.emitAgentStatusCard(agent, `正在招聘${getTeamName(title)}团队`, AgentWorkStatus.WAITING);
    return runner;
  }

  /**
   * 创建 Worker Agent，并建立与父 Sentinel 的点对点通道。
   * 返回 Runner 和 Sentinel 视角的通道，便于 Sentinel 直接向 Worker 发送/监听消息。
   */
  createWorker(
    title: string,
    parentSentinelId: AgentId,
  ): { runner: WorkerAgentRunner; channel: PeerChannel } {
    const id = `${this.sessionId}:worker:${this.getSanitizedId(title)}`;
    const existing = this.agents.get(id);
    if (existing instanceof WorkerAgentRunner) {
      return {
        runner: existing,
        channel: new PeerChannel(
          this.messageBox,
          `${this.sessionId}:${parentSentinelId}:${existing.id}`,
          this.sessionId,
          parentSentinelId,
          existing.id,
        ),
      };
    }

    const agent = this.agentFactory.createAgent({
      id,
      sessionId: this.sessionId,
      role: "worker",
      title,
      parentSentinelId,
    });
    const workerChannel = new PeerChannel(
      this.messageBox,
      `${this.sessionId}:${parentSentinelId}:${agent.id}`,
      this.sessionId,
      agent.id,
      parentSentinelId,
    );
    const sentinelChannel = new PeerChannel(
      this.messageBox,
      `${this.sessionId}:${parentSentinelId}:${agent.id}`,
      this.sessionId,
      parentSentinelId,
      agent.id,
    );
    const runner = new WorkerAgentRunner(agent, this.sessionChannel, workerChannel);
    this.registerAgent(runner);
    return { runner, channel: sentinelChannel };
  }

  /**
   * 向全局端口发送事件。
   */
  postEvent(event: SessionRuntimeEvent): void {
    this.port.postEvent(event);
  }

  private registerAgent(runner: BaseAgentRunner): void {
    this.agents.set(runner.id, runner);
    runner.start();
  }

  private ensureElder(): ElderAgentRunner {
    if (!this.elder) this.createElder();
    return this.elder!;
  }

  private subscribeChannelEvents(): void {
    this.unsubscribeOutput = this.sessionChannel.subscribe("output", (payload) => {
      const { agentInfo, content } = payload as { agentInfo: { agentId: AgentId }; content: AgentDriverChunk };
      this.currentRunner = this.agents.get(agentInfo.agentId);
      this.port.postEvent({ type: "chunk", chunk: content });
    });

    this.unsubscribeTaskEvent = this.sessionChannel.subscribe("task_event", (payload) => {
      const event = payload as { type: string; taskId: string; payload?: Record<string, unknown> };
      const task = this.taskBoard.getTaskById(event.taskId);
      const status = this.mapTaskStatusToWorkStatus(task?.status);
      const progress = typeof task?.progress === "number" ? task.progress : 0;
      const assigneeId = task?.assigneeAgentId ?? String(event.payload?.workerTitle ?? event.payload?.assigneeAgentId ?? "");
      const assigneeName = assigneeId ? this.getAgentName(assigneeId) : "";
      const instruction = this.formatTaskEventInstruction(event.type, event.payload);
      this.port.postEvent({
        type: "chunk",
        chunk: {
          type: "task_card",
          taskId: event.taskId,
          round: 1,
          stage: typeof event.payload?.stage === "number" ? event.payload.stage : 0,
          title: task?.title ?? String(event.payload?.title ?? ""),
          description: task?.description ?? String(event.payload?.description ?? ""),
          instruction,
          status,
          progress,
          requestedBy: "orchestrator",
          assigneeAgentId: assigneeId,
          assignee: assigneeName,
        },
      });
    });

    this.unsubscribeAgentStatus = this.sessionChannel.subscribe("agent_status", (payload) => {
      const { agentInfo, status, currentTask } = payload as {
        agentInfo: { agentId: AgentId; agentName: string; title: string; role: string };
        status: string;
        currentTask?: string;
      };
      this.port.postEvent({
        type: "chunk",
        chunk: {
          type: "status_card",
          text: currentTask ?? status,
          agentId: agentInfo.agentId,
          agentName: agentInfo.agentName,
          agentTitle: agentInfo.title,
          role: agentInfo.role as "elder" | "sentinel" | "worker",
        },
      });
    });
  }

  private async handleCommand(command: ControlCommand): Promise<void> {
    if (command.type === "start_chat") {
      await this.startChat(command.userMessage, command.teammateMode);
      return;
    }
    if (command.type === "stop") {
      this.stop();
      return;
    }
    if (command.type === "activate") {
      this.visibility = SessionVisibility.ACTIVE;
      this.emitStatus();
      return;
    }
    if (command.type === "background") {
      this.visibility = SessionVisibility.BACKGROUND;
      this.emitStatus();
      return;
    }
    if (command.type === "update_config") {
      this.agentFactory = createAgentFactoryWithConfig(command.llmConfig);
      this.elder = undefined;
      this.emitStatus();
      return;
    }
    this.emitStatus();
  }

  private async startChat(userMessage: string, teammateMode?: TeammateMode): Promise<void> {
    this.runStatus = SessionRunStatus.RUNNING;
    this.emitStatus();

    try {
      const elder = this.ensureElder();
      elder.enqueueTask({
        id: `${this.sessionId}:root`,
        sessionId: this.sessionId,
        instruction: userMessage,
        context: { teammateMode },
        createdAt: Date.now(),
      });

      // Elder 处理是异步的，通过 SessionChannel 输出；这里等待完成信号
      await this.waitForCompletion();

      if (this.runStatus === SessionRunStatus.RUNNING) {
        this.runStatus = SessionRunStatus.COMPLETED;
      }
    } catch (error) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.runStatus = SessionRunStatus.FAILED;
      this.port.postEvent({ type: "error", error: errorText });
    } finally {
      this.currentRunner = undefined;
      this.port.postEvent({ type: "done" });
      this.emitStatus();
    }
  }

  private waitForCompletion(): Promise<void> {
    return new Promise((resolve) => {
      const unsubscribe = this.sessionChannel.subscribe("session_done", () => {
        unsubscribe();
        resolve();
      });
      // 兜底：30 秒后自动结束，避免测试挂起
      setTimeout(() => {
        unsubscribe();
        resolve();
      }, 30000);
    });
  }

  private stop(): void {
    this.currentRunner?.destroy();
    for (const agent of this.agents.values()) {
      agent.destroy();
    }
    this.runStatus = SessionRunStatus.CANCELLED;
    this.port.postEvent({ type: "done" });
    this.emitStatus();
  }

  private formatTaskEventInstruction(type: string, payload?: Record<string, unknown>): string {
    switch (type) {
      case "task_created":
        return `${String(payload?.title ?? "任务")}：${String(payload?.description ?? "")}`;
      case "task_assigned":
        return `阶段 ${payload?.stage ?? 0} → ${payload?.workerTitle ?? ""}：${payload?.instruction ?? ""}`;
      case "task_completed":
        return `已完成：${payload?.result ?? ""}`;
      case "task_failed":
        return `失败：${payload?.error ?? ""}`;
      default:
        return JSON.stringify(payload ?? {});
    }
  }

  private emitStatus(): void {
    this.port.postEvent({
      type: "status",
      status: this.createStatus(),
    });
  }

  private createStatus(): TeammateStatus & { visibility: SessionVisibility; runStatus: SessionRunStatus } {
    const members = [...this.agents.values()].map((runner) => ({
      agentId: runner.id,
      name: runner.title,
      title: runner.title,
      role: runner.role as AgentRole,
      status: runner.status.status,
      currentTask: runner.status.currentTask,
    }));
    const elder = this.elder;
    const sentinel = [...this.agents.values()].find((runner) => runner.role === "sentinel");
    const teammateName = sentinel ? `${getTeamName(sentinel.title)}团队` : "默认团队";
    return {
      sessionId: this.sessionId,
      mode: this.mode,
      teammateName,
      leader: elder
        ? {
            agentId: elder.id,
            name: elder.title,
            title: elder.title,
            role: elder.role as AgentRole,
            status: elder.status.status,
            currentTask: elder.status.currentTask,
          }
        : undefined,
      members: members.filter((member) => member.agentId !== elder?.id),
      visibility: this.visibility,
      runStatus: this.runStatus,
    };
  }

  private mapTaskStatusToWorkStatus(status?: TaskStatus): AgentWorkStatus {
    switch (status) {
      case TaskStatus.PENDING:
        return AgentWorkStatus.NOT_STARTED;
      case TaskStatus.ASSIGNED:
        return AgentWorkStatus.WAITING;
      case TaskStatus.RUNNING:
      case TaskStatus.REVIEWING:
        return AgentWorkStatus.IN_PROGRESS;
      case TaskStatus.COMPLETED:
        return AgentWorkStatus.COMPLETED;
      case TaskStatus.FAILED:
        return AgentWorkStatus.FAILED;
      case TaskStatus.CANCELLED:
        return AgentWorkStatus.CANCELLED;
      default:
        return AgentWorkStatus.NOT_STARTED;
    }
  }

  private getAgentName(agentId: string): string {
    const runner = this.agents.get(agentId);
    if (runner) return runner.title;
    const parts = agentId.split(":");
    const role = parts[1] ?? "";
    const title = parts.slice(2).join(":");
    return getAgentTitleLabel(role, title);
  }

  private emitAgentStatusCard(agent: AgentRuntime, text: string, status: AgentWorkStatus): void {
    this.port.postEvent({
      type: "chunk",
      chunk: {
        type: "status_card",
        text,
        status,
        agentId: agent.id,
        agentName: agent.name,
        agentTitle: agent.title,
        role: agent.role,
      },
    });
  }

  private getSanitizedId(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
}
