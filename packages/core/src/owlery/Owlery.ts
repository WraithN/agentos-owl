import type { ElderAgentRuntime } from "../agent/AgentRuntime.js";
import { AgentFactory } from "../agent/AgentFactory.js";
import type { AgentDriverChunk, AgentId, AgentMessage, AgentRole, AgentTask, AgentToolRegistration, AgentTitle, AgentWorkStatus, RecruitAgentSpec, RecruitInput, RecruitPlan, RecruitToolInput, SessionId, TeammateMode } from "../agent/types.js";
import { AgentPool } from "./AgentPool.js";
import { CrystalBall } from "./CrystalBall.js";
import { MessageBox } from "./MessageBox.js";
import { createBasicTeammates, type TeammateManager } from "./TeammateManager.js";

export type SessionVisibility = "active" | "background";
export type SessionRunStatus = "idle" | "running" | "completed" | "failed" | "cancelled";
export type SessionChunkListener = (chunk: AgentDriverChunk) => void;

export interface ChatLoopInput {
  sessionId: SessionId;
  userMessage: string;
  context?: unknown;
  teammateMode?: TeammateMode;
}

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

export interface SessionSummary {
  sessionId: SessionId;
  visibility: SessionVisibility;
  runStatus: SessionRunStatus;
  bufferedChunkCount: number;
  activeAgentCount: number;
}

export interface TeammateAgentStatus {
  agentId: AgentId;
  name: string;
  title: AgentTitle;
  role: AgentRole;
  status: AgentWorkStatus;
  currentTask?: string;
}

export interface TeammateStatus {
  sessionId: SessionId;
  teammateId?: string;
  teammateName: string;
  mode?: TeammateMode;
  leader?: TeammateAgentStatus;
  members: TeammateAgentStatus[];
}

const TEAM_NAME_MIN_LENGTH = 3;
const TEAM_NAME_RANGE = 3;
const TEAM_NAME_ALPHABET = "星云灵鹿松竹鲸鹤岚羽墨青白玄赤";

export type RecruitEvaluator = (input: RecruitInput) => Promise<RecruitPlan | TeammateMode>;
export type ModeEvaluator = RecruitEvaluator;

export class Owlery {
  private readonly slots = new Map<SessionId, SessionSlot>();
  private activeSessionSlotId?: SessionId;
  private readonly backgroundSessionSlotIds = new Set<SessionId>();
  readonly messageBox = new MessageBox();
  readonly agentFactory: AgentFactory;

  constructor(params: { agentFactory: AgentFactory; modeEvaluator?: ModeEvaluator }) {
    this.agentFactory = params.agentFactory;
    this.modeEvaluator = params.modeEvaluator ?? (async () => "supervisor");
  }

  private readonly modeEvaluator: ModeEvaluator;

  getOrCreateSlot(sessionId: SessionId): SessionSlot {
    const existing = this.slots.get(sessionId);
    if (existing) return existing;

    const elder = this.agentFactory.createAgent({
      id: `${sessionId}:elder`,
      sessionId,
      role: "elder",
      title: "boss",
    }) as ElderAgentRuntime;

    const slot: SessionSlot = {
      sessionId,
      elder,
      crystalBall: new CrystalBall(),
      visibility: "background",
      runStatus: "idle",
      outputBuffer: [],
      subscribers: new Set(),
    };
    slot.crystalBall.registerAgent(elder);
    this.slots.set(sessionId, slot);
    return slot;
  }

  getSlot(sessionId: SessionId): SessionSlot | undefined {
    return this.slots.get(sessionId);
  }

  listSlots(): SessionSlot[] {
    return [...this.slots.values()];
  }

  activateSession(sessionId: SessionId): SessionSlot {
    const next = this.getOrCreateSlot(sessionId);
    if (this.activeSessionSlotId && this.activeSessionSlotId !== sessionId) {
      this.moveToBackground(this.activeSessionSlotId);
    }
    next.visibility = "active";
    this.backgroundSessionSlotIds.delete(sessionId);
    this.activeSessionSlotId = sessionId;
    return next;
  }

  moveToBackground(sessionId: SessionId): void {
    const slot = this.getOrCreateSlot(sessionId);
    slot.visibility = "background";
    this.backgroundSessionSlotIds.add(sessionId);
    if (this.activeSessionSlotId === sessionId) this.activeSessionSlotId = undefined;
  }

  getActiveSlot(): SessionSlot | undefined {
    return this.activeSessionSlotId ? this.slots.get(this.activeSessionSlotId) : undefined;
  }

  listBackgroundSlots(): SessionSlot[] {
    return [...this.backgroundSessionSlotIds].map((sessionId) => this.getOrCreateSlot(sessionId));
  }

  getBufferedOutput(sessionId: SessionId): AgentDriverChunk[] {
    return [...this.getOrCreateSlot(sessionId).outputBuffer];
  }

  getCrystalBallSnapshot(sessionId: SessionId) {
    return this.getOrCreateSlot(sessionId).crystalBall.getSnapshot();
  }

  getTeammateStatus(sessionId: SessionId): TeammateStatus {
    const slot = this.getOrCreateSlot(sessionId);
    const snapshots = slot.crystalBall.getSnapshot();
    const primaryId = slot.teammates?.primarySentinelId;
    const leaderSnapshot = snapshots.find((agent) => agent.agentId === primaryId) ?? snapshots.find((agent) => agent.role === "elder");
    const members = snapshots
      .filter((agent) => agent.agentId !== leaderSnapshot?.agentId)
      .map((agent) => ({
        agentId: agent.agentId,
        name: agent.name,
        title: agent.title,
        role: agent.role,
        status: agent.status,
        currentTask: agent.currentTask,
      }));
    return {
      sessionId,
      teammateId: slot.teammates?.teammate.id,
      teammateName: slot.teammates?.name ?? "默认团队",
      mode: slot.teammates?.mode,
      leader: leaderSnapshot ? {
        agentId: leaderSnapshot.agentId,
        name: leaderSnapshot.name,
        title: leaderSnapshot.title,
        role: leaderSnapshot.role,
        status: leaderSnapshot.status,
        currentTask: leaderSnapshot.currentTask,
      } : undefined,
      members,
    };
  }

  subscribeSession(sessionId: SessionId, listener: SessionChunkListener): () => void {
    const slot = this.getOrCreateSlot(sessionId);
    slot.subscribers.add(listener);
    return () => {
      slot.subscribers.delete(listener);
    };
  }

  startChat(input: ChatLoopInput): void {
    const slot = this.activateSession(input.sessionId);
    void this.runSession(slot, input);
  }

  async *chatLoop(input: ChatLoopInput): AsyncIterable<AgentDriverChunk> {
    const queue: AgentDriverChunk[] = [];
    let notify: (() => void) | undefined;
    const unsubscribe = this.subscribeSession(input.sessionId, (chunk) => {
      queue.push(chunk);
      notify?.();
    });
    this.startChat(input);

    try {
      while (true) {
        const chunk = queue.shift();
        if (chunk) {
          yield chunk;
          if (chunk.type === "done" || chunk.type === "error") return;
          continue;
        }
        await new Promise<void>((resolve) => {
          notify = resolve;
        });
      }
    } finally {
      unsubscribe();
    }
  }

  listSessionSummaries(): SessionSummary[] {
    return this.listSlots().map((slot) => ({
      sessionId: slot.sessionId,
      visibility: slot.visibility,
      runStatus: slot.runStatus,
      bufferedChunkCount: slot.outputBuffer.length,
      activeAgentCount: slot.crystalBall.getSnapshot().filter((agent) => agent.status === "in_progress").length,
    }));
  }

  async recruitForSession(input: RecruitInput): Promise<TeammateManager> {
    const slot = this.getOrCreateSlot(input.sessionId);
    const plan = await this.resolveRecruitPlan(input);
    const primarySpec = plan.primarySentinel;
    const primarySentinelId = primarySpec.id ?? `${input.sessionId}:sentinel:primary`;
    const pool = new AgentPool(primarySentinelId);
    const primaryAgent = this.createAgentFromSpec(input.sessionId, { ...primarySpec, id: primarySentinelId });
    pool.addAgent(primaryAgent);

    for (const spec of await this.recruitMembersByPrimary(input, plan, primarySentinelId, primaryAgent.tools ?? [])) {
      pool.addAgent(this.createAgentFromSpec(input.sessionId, spec));
    }

    const teammates = await createBasicTeammates({
      elder: slot.elder,
      mode: plan.mode,
      sessionId: input.sessionId,
      messageBox: this.messageBox,
      pool,
      teammate: plan.teammate,
    });

    slot.teammates = teammates;
    for (const agent of teammates.agentPool.listAgents()) {
      slot.crystalBall.registerAgent(agent);
    }
    return teammates;
  }

  private async resolveRecruitPlan(input: RecruitInput): Promise<RecruitPlan> {
    if (input.userPreferredTeam) return this.createPlanFromTeamSpec(input);
    if (input.userPreferredMode) return this.createDefaultPlan(input.sessionId, input.userPreferredMode, "user", input.templateTeammateId);
    const evaluated = await this.modeEvaluator(input);
    if (typeof evaluated === "string") return this.createDefaultPlan(input.sessionId, evaluated, "llm", input.templateTeammateId);
    return evaluated;
  }

  private createPlanFromTeamSpec(input: RecruitInput): RecruitPlan {
    const team = input.userPreferredTeam;
    if (!team) return this.createDefaultPlan(input.sessionId, "supervisor", "default", input.templateTeammateId);
    const primarySentinel = team.agents.find((agent) => agent.role === "sentinel" && agent.sentinelKind !== "sub") ?? {
      id: `${input.sessionId}:sentinel:primary`,
      role: "sentinel" as const,
      title: "supervisor" as const,
      sentinelKind: "primary" as const,
    };
    return {
      teammate: {
        id: team.id ?? this.createTeammateId(input.sessionId),
        templateTeammateId: team.templateTeammateId ?? input.templateTeammateId,
        name: team.name ?? this.createTeamName(),
      },
      mode: team.mode,
      primarySentinel,
      agents: team.agents.filter((agent) => agent !== primarySentinel),
      source: "user",
    };
  }

  private createDefaultPlan(sessionId: SessionId, mode: TeammateMode, source: RecruitPlan["source"], templateTeammateId?: string): RecruitPlan {
    return {
      teammate: {
        id: this.createTeammateId(sessionId),
        templateTeammateId,
        name: this.createTeamName(),
      },
      mode,
      source,
      primarySentinel: { id: `${sessionId}:sentinel:primary`, role: "sentinel", title: "supervisor", sentinelKind: "primary" },
      agents: [],
    };
  }

  private async recruitMembersByPrimary(input: RecruitInput, plan: RecruitPlan, primarySentinelId: AgentId, tools: AgentToolRegistration[]): Promise<RecruitAgentSpec[]> {
    if (plan.agents.length > 0) return plan.agents;
    const recruitTool = tools.find((tool) => tool.name === "recruit");
    if (recruitTool?.execute) {
      const toolInput: RecruitToolInput = {
        sessionId: input.sessionId,
        teammateId: plan.teammate.id,
        parentAgentId: primarySentinelId,
        userPrompt: input.userPrompt,
        mode: plan.mode,
        conversationContext: input.conversationContext,
        existingAgentIds: [primarySentinelId],
      };
      return recruitTool.execute(toolInput);
    }
    return this.createDefaultMemberSpecs(input.sessionId, primarySentinelId);
  }

  private createDefaultMemberSpecs(sessionId: SessionId, primarySentinelId: AgentId): RecruitAgentSpec[] {
    return [
      { id: `${sessionId}:worker:planner`, role: "worker", title: "planner", parentSentinelId: primarySentinelId },
      { id: `${sessionId}:worker:operator`, role: "worker", title: "operator", parentSentinelId: primarySentinelId },
      { id: `${sessionId}:worker:cto`, role: "worker", title: "cto", parentSentinelId: primarySentinelId },
    ];
  }

  private createAgentFromSpec(sessionId: SessionId, spec: RecruitAgentSpec) {
    return this.agentFactory.createAgent({
      id: spec.id ?? this.createAgentId(sessionId, spec),
      sessionId,
      role: spec.role,
      title: spec.title,
      sentinelKind: spec.sentinelKind,
      parentSentinelId: spec.parentSentinelId,
      childAgentIds: spec.childAgentIds,
    });
  }

  private createTeammateId(sessionId: SessionId): string {
    return `${sessionId}:teammate:${Date.now()}`;
  }

  private createTeamName(): string {
    const length = TEAM_NAME_MIN_LENGTH + Math.floor(Math.random() * TEAM_NAME_RANGE);
    let name = "";
    for (let index = 0; index < length; index += 1) {
      name += TEAM_NAME_ALPHABET[Math.floor(Math.random() * TEAM_NAME_ALPHABET.length)];
    }
    return `${name}团队`;
  }

  private createAgentId(sessionId: SessionId, spec: RecruitAgentSpec): string {
    if (spec.role === "sentinel") return `${sessionId}:sentinel:${spec.sentinelKind ?? "primary"}:${spec.title}`;
    return `${sessionId}:worker:${spec.title}`;
  }

  private async runSession(slot: SessionSlot, input: ChatLoopInput): Promise<void> {
    slot.runStatus = "running";
    slot.lastError = undefined;
    if (!slot.teammates || (input.teammateMode && slot.teammates.mode !== input.teammateMode)) {
      await this.recruitForSession({
        sessionId: input.sessionId,
        userPrompt: input.userMessage,
        conversationContext: { messages: [] },
        userPreferredMode: input.teammateMode,
      });
    }
    slot.crystalBall.updateStatus(slot.elder.id, "in_progress", input.userMessage);
    const message: AgentMessage<{ text: string }> = {
      id: `${input.sessionId}:${Date.now()}:user`,
      from: "user",
      to: slot.elder.id,
      sessionId: input.sessionId,
      kind: "request",
      payload: { text: input.userMessage },
      createdAt: Date.now(),
    };

    try {
      if (slot.teammates?.mode === "brainstorm") {
        const task: AgentTask = {
          id: `${input.sessionId}:${Date.now()}:task`,
          sessionId: input.sessionId,
          instruction: input.userMessage,
          context: input.context,
          createdAt: Date.now(),
        };
        const result = await slot.teammates.dispatch(task);
        this.publishChunk(slot, { type: "text_delta", text: this.formatTeammateResult(result.content) });
        this.publishChunk(slot, { type: "done" });
        slot.runStatus = "completed";
        slot.crystalBall.updateStatus(slot.elder.id, "completed");
        return;
      }

      let receivedDone = false;
      for await (const chunk of slot.elder.streamChat({ sessionId: input.sessionId, messages: [message], context: input.context })) {
        this.publishChunk(slot, chunk);
        if (chunk.type === "error") {
          slot.runStatus = "failed";
          slot.lastError = chunk.error;
          slot.crystalBall.updateStatus(slot.elder.id, "failed", chunk.error);
        }
        if (chunk.type === "done") receivedDone = true;
      }
      if (slot.runStatus === "running") {
        slot.runStatus = "completed";
        slot.crystalBall.updateStatus(slot.elder.id, "completed");
      }
      // 部分 Driver 在流结束后不会主动发送 done，统一补发完成信号，避免前端一直停留在“思考中”
      if (!receivedDone) this.publishChunk(slot, { type: "done" });
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      const chunk: AgentDriverChunk = { type: "error", error: messageText };
      this.publishChunk(slot, chunk);
      slot.runStatus = "failed";
      slot.lastError = messageText;
      slot.crystalBall.updateStatus(slot.elder.id, "failed", messageText);
    }
  }

  private publishChunk(slot: SessionSlot, chunk: AgentDriverChunk): void {
    slot.outputBuffer.push(chunk);
    if (slot.visibility === "active") {
      for (const subscriber of slot.subscribers) subscriber(chunk);
    }
  }

  private formatTeammateResult(content: unknown): string {
    if (this.hasSummary(content)) return content.summary;
    if (typeof content === "string") return content;
    return JSON.stringify(content);
  }

  private hasSummary(content: unknown): content is { summary: string } {
    if (typeof content !== "object" || content === null || !("summary" in content)) return false;
    return typeof (content as { summary: unknown }).summary === "string";
  }
}
