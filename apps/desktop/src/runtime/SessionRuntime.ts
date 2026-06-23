import type {
  AgentDriverChunk,
  AgentFactory,
  AgentId,
  AgentMessage,
  AgentRuntime,
  AgentWorkSnapshot,
  PipelineRound,
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
import { PlannerPipeline, MAX_REVIEW_ROUNDS } from "./PlannerPipeline.js";
import type { RuntimePort } from "./types.js";

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

function getAgentTitleLabel(role: string, title: string): string {
  if (role === "elder" || title === "boss") return "老板";
  if (role === "sentinel") return SENTINEL_TITLE_LABEL[title] ?? title;
  return WORKER_TITLE_LABEL[title] ?? title;
}

function getTeamName(title: string): string {
  return `${getAgentTitleLabel("sentinel", title)}团队`;
}

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
  private sessionRounds: PipelineRound[] = [];

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
      // 先让前端立即看到老板卡片，减少首字等待的空白感
      this.emitAgentStatusCard(elder, "正在工作");
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

      // Elder 已完成招募，进入等待 Sentinel/团队返回的阶段
      this.crystalBall.updateStatus(elder.id, "waiting", "等待团队返回");
      this.emitAgentStatusCard(elder, "等待团队返回");
      this.emitStatus();

      // Sentinel 第一阶段：制定计划并招募 Worker（不直接输出正文）
      this.emitAgentStatusCard(sentinel, "正在工作规划");
      const sentinelPlan = await this.streamAgent(sentinel, userMessage, { forwardText: false });
      const workerTitles = this.pendingRecruitment.workers;

      if (workerTitles && workerTitles.length > 0) {
        const workers = this.recruitWorkersIfNeeded(sentinel, workerTitles);

        if (sentinel.title === "planner") {
          await this.runPlannerPipeline(elder, sentinel, workers, userMessage);
        } else {
          // 其他 Sentinel 保持原有并行执行 + 收敛逻辑
          // Sentinel 已招募 Worker，进入等待 Worker 产出的阶段
          this.crystalBall.updateStatus(sentinel.id, "waiting", "等待Worker返回");
          this.emitAgentStatusCard(sentinel, "等待Worker返回");
          this.emitStatus();
          const workerOutputs: string[] = [];
          for (const worker of workers) {
            this.emitAgentStatusCard(worker, "工作中");
            const output = await this.streamAgent(worker, userMessage, { forwardText: false });
            this.emitAgentStatusCard(worker, "已完成");
            if (output) workerOutputs.push(output);
          }

          // Sentinel 第二阶段：基于 Worker 真实产出做收敛，生成供 Elder 评审的草案
          let draft = sentinelPlan;
          if (workerOutputs.length > 0) {
            this.emitAgentStatusCard(sentinel, "正在收敛Worker产出");
            const aggregatePrompt = [
              "你招募的 Worker 已经完成执行，以下是他们的原始产出。",
              "请对这些产出进行去重、校验、补全遗漏，并整合为一份可直接交付给用户的最终成果。",
              "不要暴露内部协调过程，直接给出最终答案。",
              "",
              workerOutputs.map((output, index) => `--- Worker ${index + 1} ---\n${output}`).join("\n\n"),
            ].join("\n");
            draft = await this.streamAgent(sentinel, aggregatePrompt, { forwardText: false });
            this.emitAgentStatusCard(sentinel, "已完成");
          }

          // Elder 最终评审并输出给用户的唯一答案
          this.emitAgentStatusCard(elder, "正在对工作进行评审");
          const finalPrompt = [
            "你是唯一面向用户的 Agent。请基于以下工作成果进行最终评审，直接输出给用户的最终答案，不要暴露内部协调过程。",
            "",
            draft || "（无额外工作成果）",
          ].join("\n");
          await this.streamAgent(elder, finalPrompt, { forwardText: true });
          this.emitAgentStatusCard(elder, "已完成");
        }
      } else if (sentinelPlan) {
        // 简单任务未招募 Worker，由 Elder 直接输出结论
        this.emitAgentStatusCard(elder, "正在对工作进行评审");
        const finalPrompt = [
          "你是唯一面向用户的 Agent。请直接输出以下结论给用户，不要暴露内部协调过程。",
          "",
          sentinelPlan,
        ].join("\n");
        await this.streamAgent(elder, finalPrompt, { forwardText: true });
        this.emitAgentStatusCard(elder, "已完成");
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

  private async runPlannerPipeline(
    elder: AgentRuntime,
    sentinel: AgentRuntime,
    workers: AgentRuntime[],
    userMessage: string,
  ): Promise<void> {
    const pipeline = new PlannerPipeline({
      sessionId: this.sessionId,
      streamAgent: (agent, text, options) => this.streamAgent(agent, text, options),
      runAgentTurn: (agent, text, options) => this.runAgentTurn(agent, text, options),
      emitAgentStatusCard: (agent, text) => this.emitAgentStatusCard(agent, text),
      emitTaskCard: (taskId, round, stage, instruction, requestedBy, assigneeAgentId) =>
        this.emitTaskCard(taskId, round, stage, instruction, requestedBy, assigneeAgentId),
      emitRoundCard: (round, summary) => this.emitRoundCard(round, summary),
    });

    this.sessionRounds = [];
    let draft = (await pipeline.run(sentinel, workers, userMessage, 1)).finalOutput;

    const roundHistories: string[] = [];
    for (let round = 1; round <= MAX_REVIEW_ROUNDS; round++) {
      this.emitAgentStatusCard(elder, `正在对工作进行评审（轮次 ${round}）`);
      const review = await pipeline.reviewWithElder(elder, userMessage, draft, round, roundHistories);

      if (review.satisfied || round === MAX_REVIEW_ROUNDS) {
        const finalText = review.satisfied
          ? review.finalText
          : `已尝试 ${MAX_REVIEW_ROUNDS} 轮仍无法完全满足需求。当前最佳结果：\n\n${review.finalText}`;
        this.emitAgentStatusCard(elder, "已完成");
        this.port.postEvent({ type: "chunk", chunk: { type: "text_delta", text: finalText } });
        this.sessionRounds.push({
          round,
          userRequest: round === 1 ? userMessage : roundHistories[round - 2] ?? userMessage,
          plannerOutput: draft,
          finalOutput: finalText,
          satisfied: review.satisfied,
        });
        break;
      }

      this.sessionRounds.push({
        round,
        userRequest: round === 1 ? userMessage : roundHistories[round - 2] ?? userMessage,
        plannerOutput: draft,
        elderFeedback: review.feedback,
        satisfied: false,
      });
      roundHistories.push(`轮次 ${round} 反馈：${review.feedback}`);
      this.emitAgentStatusCard(elder, `轮次 ${round} 未通过，准备修订`);
      const nextMessage = pipeline.buildRevisionPrompt(userMessage, review.feedback ?? "", round + 1, roundHistories);
      draft = (await pipeline.run(sentinel, workers, nextMessage, round + 1)).finalOutput;
    }
  }

  private async streamAgent(
    agent: AgentRuntime,
    payloadText: string,
    options: { forwardText?: boolean } = {},
  ): Promise<string> {
    const forwardText = options.forwardText ?? false;
    this.currentAgent = agent;
    const message: AgentMessage<{ text: string }> = {
      id: `${this.sessionId}:${Date.now()}:${agent.role}`,
      from: "user",
      to: agent.id,
      sessionId: this.sessionId,
      kind: "request",
      payload: { text: payloadText },
      createdAt: Date.now(),
    };

    this.crystalBall.updateStatus(agent.id, "in_progress", payloadText);
    this.emitStatus();

    const textParts: string[] = [];
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
            if (workers) {
              this.pendingRecruitment.workers = workers;
              this.recruitWorkersIfNeeded(agent, workers);
            }
            // 不转发原始 tool_event；由 recruitWorkers 统一输出包含完整 workers 的事件
            continue;
          }
          // 非招募类 tool_event 包装为 agent_chunk，前端折叠在对应 Agent 卡片下
          if (agent.role !== "elder") this.emitAgentChunk(agent, chunk);
          continue;
        }
        if (chunk.type === "text_delta") {
          textParts.push(chunk.text);
          if (forwardText && agent.role === "elder") {
            this.forwardChunk(agent, chunk);
          } else if (agent.role !== "elder") {
            this.emitAgentChunk(agent, chunk);
          }
          continue;
        }
        // reasoning_delta 等其他 chunk 也折叠在对应 Agent 卡片下
        if (agent.role !== "elder") this.emitAgentChunk(agent, chunk);
      }
      this.crystalBall.updateStatus(agent.id, "completed");
    } catch (error) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.crystalBall.updateStatus(agent.id, "failed", errorText);
      this.port.postEvent({ type: "error", error: errorText });
    }

    this.emitStatus();
    return textParts.join("");
  }

  private forwardChunk(agent: AgentRuntime, chunk: AgentDriverChunk): void {
    // 只有 Elder 的文本会直接透传给前端；Worker / Sentinel 的产出由 Elder 收敛后统一输出
    if (agent.role === "elder" && chunk.type === "text_delta") {
      this.port.postEvent({ type: "chunk", chunk });
    }
  }

  private async runAgentTurn(
    agent: AgentRuntime,
    promptText: string,
    options: { collectTools?: string[]; forwardText?: boolean } = {},
  ): Promise<{ text: string; reasoning: string; toolEvents: unknown[] }> {
    const textParts: string[] = [];
    const reasoningParts: string[] = [];
    const toolEvents: unknown[] = [];

    this.currentAgent = agent;
    const message: AgentMessage<{ text: string }> = {
      id: `${this.sessionId}:${Date.now()}:${agent.role}`,
      from: "user",
      to: agent.id,
      sessionId: this.sessionId,
      kind: "request",
      payload: { text: promptText },
      createdAt: Date.now(),
    };

    this.crystalBall.updateStatus(agent.id, "in_progress", promptText);
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
          if (options.collectTools?.includes(toolName)) {
            toolEvents.push(event);
          } else if (toolName === "recruit_sentinel" && agent.role === "elder") {
            const { title, reason } = this.extractRecruitArgs(event);
            if (title) {
              this.pendingRecruitment.sentinelTitle = title;
              this.pendingRecruitment.sentinelReason = reason;
            }
          } else if (toolName === "recruit_workers" && agent.role === "sentinel") {
            const workers = this.extractWorkerTitles(event);
            if (workers) {
              this.pendingRecruitment.workers = workers;
              this.recruitWorkersIfNeeded(agent, workers);
            }
          } else if (agent.role !== "elder") {
            this.emitAgentChunk(agent, chunk);
          }
          continue;
        }
        if (chunk.type === "text_delta") {
          textParts.push(chunk.text);
          if (options.forwardText && agent.role === "elder") {
            this.forwardChunk(agent, chunk);
          } else if (agent.role !== "elder") {
            this.emitAgentChunk(agent, chunk);
          }
          continue;
        }
        if (chunk.type === "reasoning_delta") {
          reasoningParts.push(chunk.text);
          if (agent.role !== "elder") this.emitAgentChunk(agent, chunk);
          continue;
        }
        if (chunk.type === "error") {
          this.port.postEvent({ type: "error", error: chunk.error });
        }
      }
      this.crystalBall.updateStatus(agent.id, "completed");
    } catch (error) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.crystalBall.updateStatus(agent.id, "failed", errorText);
      this.port.postEvent({ type: "error", error: errorText });
    }

    this.emitStatus();
    return { text: textParts.join(""), reasoning: reasoningParts.join(""), toolEvents };
  }

  private emitAgentChunk(agent: AgentRuntime, chunk: AgentDriverChunk): void {
    this.port.postEvent({
      type: "chunk",
      chunk: {
        type: "agent_chunk",
        agentId: agent.id,
        agentName: agent.name,
        agentTitle: agent.title,
        role: agent.role,
        chunk,
      },
    });
  }

  private emitStatusCard(text: string): void {
    this.port.postEvent({ type: "chunk", chunk: { type: "status_card", text } });
  }

  private emitAgentStatusCard(agent: AgentRuntime, text: string): void {
    this.port.postEvent({
      type: "chunk",
      chunk: {
        type: "status_card",
        text,
        agentId: agent.id,
        agentName: agent.name,
        agentTitle: agent.title,
        role: agent.role,
      },
    });
  }

  private emitTaskCard(
    taskId: string,
    round: number,
    stage: number,
    instruction: string,
    requestedBy: string,
    assigneeAgentId: AgentId,
  ): void {
    this.port.postEvent({
      type: "chunk",
      chunk: {
        type: "task_card",
        taskId,
        round,
        stage,
        instruction,
        requestedBy,
        assigneeAgentId,
      },
    });
  }

  private emitRoundCard(round: number, summary: string): void {
    this.port.postEvent({ type: "chunk", chunk: { type: "round_card", round, summary } });
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

    this.emitAgentStatusCard(elder, `正在招聘${getTeamName(title)}团队`);
    this.emitStatus();
    return sentinel;
  }

  private recruitWorkers(sentinel: AgentRuntime, titles: string[]): AgentRuntime[] {
    const workers: AgentRuntime[] = [];
    let created = 0;
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
      created++;
    }

    // 只有真正新建了 Worker 才发招聘卡片，避免 LLM 多次触发 recruit_workers 时重复展示
    if (created > 0) {
      const workerDescriptions = workers
        .map((worker) => `${getAgentTitleLabel("worker", worker.title)} ${worker.name}`)
        .join("、");
      this.emitAgentStatusCard(sentinel, `正在招聘 ${workerDescriptions}`);
      this.emitStatus();
    }
    return workers;
  }

  private recruitWorkersIfNeeded(sentinel: AgentRuntime, titles: string[]): AgentRuntime[] {
    // 每次都用最新的 titles 创建/复用 Worker，避免 LLM 先给 1 个后又给 3 个时只保留最早的 1 个
    return this.recruitWorkers(sentinel, titles);
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
    const sentinelSnapshot = snapshots.find((agent) => agent.role === "sentinel");
    const teammateName = sentinelSnapshot
      ? `${getAgentTitleLabel("sentinel", sentinelSnapshot.title)}团队`
      : "默认团队";
    return {
      sessionId: this.sessionId,
      teammateName,
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
