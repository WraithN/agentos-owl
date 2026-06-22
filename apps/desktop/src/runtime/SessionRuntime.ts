import type {
  AgentDriverChunk,
  AgentFactory,
  AgentMessage,
  AgentRuntime,
  AgentWorkSnapshot,
  SessionRunStatus,
  SessionVisibility,
  TeammateMode,
  TeammateStatus,
} from "@owl-os/core";
import { CrystalBall, MessageBox } from "@owl-os/core";
import type { ControlCommand } from "../eventbus/types.js";
import { createOwleryAgentFactoryWithConfig } from "../agent/owleryAgentFactory.js";
import type { LlmConfig } from "../agent/llmConfig.js";
import { AgentExecutor } from "./AgentExecutor.js";
import type { RuntimePort } from "./types.js";

export interface SessionRuntimeOptions {
  sessionId: string;
  port: RuntimePort;
  agentFactory?: AgentFactory;
  llmConfig?: LlmConfig;
}

export class SessionRuntime {
  private readonly sessionId: string;
  private llmConfig: LlmConfig | undefined;
  private agentFactory: AgentFactory;
  private readonly messageBox = new MessageBox();
  private readonly crystalBall = new CrystalBall();
  private readonly agentExecutor: AgentExecutor;
  private readonly port: RuntimePort;
  private elder?: AgentRuntime;
  private currentAgent?: AgentRuntime;
  private visibility: SessionVisibility = "active";
  private runStatus: SessionRunStatus = "idle";
  private unsubscribeCommand?: () => void;

  private pendingRecruitment: {
    sentinelTitle?: string;
    sentinelReason?: string;
    workers?: string[];
  } = {};

  private recruitedAgents = new Map<string, AgentRuntime>();

  constructor(options: SessionRuntimeOptions) {
    this.sessionId = options.sessionId;
    this.llmConfig = options.llmConfig;
    this.agentFactory = options.agentFactory ?? createOwleryAgentFactoryWithConfig(options.llmConfig!);
    this.port = options.port;
    this.agentExecutor = new AgentExecutor({
      sessionId: options.sessionId,
      messageBox: this.messageBox,
      crystalBall: this.crystalBall,
      onChunk: () => {},
      onStatus: () => this.emitStatus(),
    });
  }

  run(): void {
    this.unsubscribeCommand?.();
    this.unsubscribeCommand = this.port.onCommand((command) => {
      void this.handleCommand(command);
    });
  }

  dispose(): void {
    this.unsubscribeCommand?.();
    this.unsubscribeCommand = undefined;
    this.agentExecutor.stopAllAgents();
  }

  private async handleCommand(command: ControlCommand): Promise<void> {
    if (command.type === "start_chat") {
      this.startChat(command.userMessage, command.teammateMode);
      return;
    }
    if (command.type === "stop") {
      this.stop();
      return;
    }
    if (command.type === "activate") {
      this.visibility = "active";
      this.emitStatus();
      return;
    }
    if (command.type === "background") {
      this.visibility = "background";
      this.emitStatus();
      return;
    }
    if (command.type === "update_config") {
      // 数据库读写只在主线程，Worker 通过命令接收配置变更
      this.llmConfig = command.llmConfig;
      this.agentFactory = createOwleryAgentFactoryWithConfig(command.llmConfig);
      // 已创建的 elder 仍使用旧配置；下次 start_chat 会重新创建
      this.elder = undefined;
      this.emitStatus();
      return;
    }
    this.emitStatus();
  }

  private startChat(userMessage: string, teammateMode?: TeammateMode): void {
    void this.runChat(userMessage, teammateMode);
  }

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

  private async streamAgent(agent: AgentRuntime, userMessage: string): Promise<void> {
    this.currentAgent = agent;
    const message: AgentMessage<{ text: string }> = {
      id: `${this.sessionId}:${Date.now()}:${agent.role}`,
      from: "user",
      to: agent.id,
      sessionId: this.sessionId,
      kind: "request",
      payload: { text: userMessage },
      createdAt: Date.now(),
    };

    this.crystalBall.updateStatus(agent.id, "in_progress", userMessage);
    this.emitStatus();

    try {
      for await (const chunk of agent.streamChat({
        sessionId: this.sessionId,
        messages: [message],
        context: undefined,
      })) {
        if (chunk.type === "tool_event") {
          const event = chunk.event as Record<string, unknown>;
          const toolName = String(event?.toolName ?? event?.name ?? "");
          if (toolName === "recruit_sentinel" && agent.role === "elder") {
            const { title, reason } = this.extractRecruitArgs(event);
            if (title) {
              this.pendingRecruitment.sentinelTitle = title;
              this.pendingRecruitment.sentinelReason = reason;
            }
            // 不转发原始 tool_event；由 recruitSentinel 统一输出包含 sentinelId 的完整事件
            continue;
          }
          if (toolName === "recruit_workers" && agent.role === "sentinel") {
            const workers = this.extractWorkerTitles(event);
            if (workers) this.pendingRecruitment.workers = workers;
            // 不转发原始 tool_event；由 recruitWorkers 统一输出包含完整 workers 的事件
            continue;
          }
        }
        this.forwardChunk(agent, chunk);
      }
      this.crystalBall.updateStatus(agent.id, "completed");
    } catch (error) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.crystalBall.updateStatus(agent.id, "failed", errorText);
      this.port.postEvent({ type: "error", error: errorText });
    }

    this.emitStatus();
  }

  private forwardChunk(agent: AgentRuntime, chunk: AgentDriverChunk): void {
    // 仅将老板与主 Sentinel 的输出透传给前端；Worker 的原始输出由 Boss 收口
    if (agent.role === "elder" || agent.role === "sentinel") {
      this.port.postEvent({ type: "chunk", chunk });
    }
  }

  private stop(): void {
    this.currentAgent?.driver.abort?.();
    this.agentExecutor.stopAllAgents();
    this.runStatus = "cancelled";
    this.port.postEvent({ type: "done" });
    this.emitStatus();
  }

  private ensureElder(): AgentRuntime {
    if (this.elder) return this.elder;
    this.elder = this.agentFactory.createAgent({
      id: `${this.sessionId}:elder`,
      sessionId: this.sessionId,
      role: "elder",
      title: "boss",
    });
    this.agentExecutor.register(this.elder);
    return this.elder;
  }

  private recruitSentinel(elder: AgentRuntime, title: string): AgentRuntime {
    const id = `${this.sessionId}:sentinel:${this.getSanitizedId(title)}`;
    const existing = this.recruitedAgents.get(id);
    if (existing) return existing;

    const sentinel = this.agentFactory.createAgent({
      id,
      sessionId: this.sessionId,
      role: "sentinel",
      title,
      sentinelKind: "primary",
    });
    this.agentExecutor.register(sentinel);
    this.recruitedAgents.set(id, sentinel);

    this.messageBox.createChannel({
      sessionId: this.sessionId,
      endpointA: elder.id,
      endpointB: sentinel.id,
    });

    const reason = this.pendingRecruitment.sentinelReason;
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
          args: { title, reason },
          result: { title, reason, sentinelId: id },
        },
      },
    });

    this.emitStatus();
    return sentinel;
  }

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
        title,
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
          args: { workers: titles },
          result: { workers: titles },
        },
      },
    });

    this.emitStatus();
    return workers;
  }

  private getSanitizedId(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  private extractRecruitArgs(event: Record<string, unknown>): { title?: string; reason?: string } {
    const result = event?.result as Record<string, unknown> | undefined;
    const args = event?.args as Record<string, unknown> | undefined;
    const title = String(result?.title ?? args?.title ?? "");
    const reason = String(result?.reason ?? args?.reason ?? "");
    return {
      title: title || undefined,
      reason: reason || undefined,
    };
  }

  private extractWorkerTitles(event: Record<string, unknown>): string[] | undefined {
    const result = event?.result as Record<string, unknown> | undefined;
    const args = event?.args as Record<string, unknown> | undefined;
    const workers = (result?.workers ?? args?.workers ?? []) as string[];
    return workers.length > 0 ? workers : undefined;
  }

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

  private emitStatus(): void {
    this.port.postEvent({
      type: "status",
      status: this.createStatus(),
    });
  }

  private createStatus(): TeammateStatus & { visibility: SessionVisibility; runStatus: SessionRunStatus } {
    const snapshots = this.crystalBall.getSnapshot();
    const leaderSnapshot = snapshots.find((agent) => agent.role === "elder");
    return {
      sessionId: this.sessionId,
      teammateName: "默认团队",
      leader: leaderSnapshot ? this.toAgentStatus(leaderSnapshot) : undefined,
      members: snapshots.filter((agent) => agent.agentId !== leaderSnapshot?.agentId).map((agent) => this.toAgentStatus(agent)),
      visibility: this.visibility,
      runStatus: this.runStatus,
    };
  }

  private toAgentStatus(snapshot: AgentWorkSnapshot): TeammateStatus["members"][number] {
    return {
      agentId: snapshot.agentId,
      name: snapshot.name,
      title: snapshot.title,
      role: snapshot.role,
      status: snapshot.status,
      currentTask: snapshot.currentTask,
    };
  }
}
