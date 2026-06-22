import type { AgentDriverChunk, TeammateMode, TeammateStatus } from "@owl-os/core";
import { EventEmitter } from "events";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDatabase } from "../db/connection.js";
import * as queries from "../db/queries/index.js";
import { EventBus } from "../eventbus/EventBus.js";
import { createSessionRuntimePortForSlot } from "../eventbus/SlotPortAdapter.js";
import type { ControlCommand } from "../eventbus/types.js";
import { getAuditLogger, type AuditLogger } from "../services/AuditLogger.js";
import { publishAgentStatus } from "../ipc/teammateStatus.js";
import { broadcastChunk } from "../websocket/sessionStream.js";
import { broadcastStatus } from "../websocket/statusStream.js";
import { OwleryWebSocketServer, type WebSocketMessage } from "../websocket/WebSocketServer.js";
import { readLlmConfig } from "../agent/llmConfig.js";
import type { LlmConfig } from "../agent/llmConfig.js";
import { SessionSlot } from "./SessionSlot.js";

const DEFAULT_WEBSOCKET_PORT = 8765;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface OwleryOptions {
  webSocketPort?: number;
  threadEntryPath?: string;
  /** 测试注入；生产环境由 Owlery 从数据库读取 */
  llmConfig?: LlmConfig;
}

interface SessionLogContext {
  logger: AuditLogger;
  title: string;
  mode: string;
  model: string;
  startTime: number;
}

export class Owlery extends EventEmitter {
  private readonly slots = new Map<string, SessionSlot>();
  private readonly eventBus = new EventBus();
  private readonly webSocketServer: OwleryWebSocketServer;
  private readonly threadEntryPath: string;
  private readonly llmConfig?: LlmConfig;
  private activeSessionId?: string;
  private readonly sessionLogContexts = new Map<string, SessionLogContext>();

  constructor(options: OwleryOptions = {}) {
    super();
    this.threadEntryPath = options.threadEntryPath ?? path.resolve(__dirname, "runtime/SessionThreadEntry.cjs");
    this.llmConfig = options.llmConfig;
    this.webSocketServer = new OwleryWebSocketServer(options.webSocketPort ?? DEFAULT_WEBSOCKET_PORT);
    this.webSocketServer.onMessage = (sessionId, streamType, message) => {
      void this.handleFrontendMessage(sessionId, streamType, message);
    };
  }

  async startChat(
    sessionId: string,
    userMessage: string,
    options?: { teamTemplateId?: string; teammateMode?: TeammateMode },
  ): Promise<void> {
    if (this.activeSessionId && this.activeSessionId !== sessionId) {
      await this.backgroundSession(this.activeSessionId);
    }
    const slot = await this.getOrCreateSlot(sessionId);
    this.activeSessionId = sessionId;
    slot.activate();

    const ctx = this.ensureSessionLogContext(sessionId);
    ctx.startTime = Date.now();
    ctx.logger.logMessageSent(sessionId, ctx.title, ctx.mode, userMessage.length);
    ctx.logger.logAgentInvokeStart(sessionId, ctx.title, ctx.mode, "Boss Agent", ctx.model);

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

  async activateSession(sessionId: string): Promise<void> {
    if (this.activeSessionId && this.activeSessionId !== sessionId) {
      await this.backgroundSession(this.activeSessionId);
    }
    const slot = await this.getOrCreateSlot(sessionId);
    this.activeSessionId = sessionId;
    slot.activate();
    this.flushBufferedOutput(slot);
  }

  async backgroundSession(sessionId: string): Promise<void> {
    const slot = this.slots.get(sessionId);
    if (!slot) return;
    slot.background();
  }

  stopSession(sessionId: string): void {
    this.slots.get(sessionId)?.stop();
  }

  async close(): Promise<void> {
    this.webSocketServer.close();
    await Promise.all([...this.slots.values()].map((slot) => slot.terminate()));
    this.slots.clear();
  }

  private async getOrCreateSlot(sessionId: string): Promise<SessionSlot> {
    const existing = this.slots.get(sessionId);
    if (existing) return existing;

    const slot = new SessionSlot({ sessionId, threadEntryPath: this.threadEntryPath, llmConfig: this.llmConfig });
    await slot.spawn();
    this.bindSlot(slot);
    this.eventBus.registerSession(sessionId, createSessionRuntimePortForSlot(slot));
    this.slots.set(sessionId, slot);
    return slot;
  }

  private bindSlot(slot: SessionSlot): void {
    slot.on("chunk", (chunk) => {
      if (slot.visibility !== "active") slot.outputBuffer.push(chunk);
      this.broadcastChunk(slot.sessionId, chunk);
      this.logChunk(slot.sessionId, chunk);
    });
    slot.on("status", (status) => {
      this.broadcastStatus(slot.sessionId, status);
      publishAgentStatus(slot.sessionId, status);
    });
    slot.on("done", () => {
      this.logAgentComplete(slot.sessionId, true);
      this.broadcastChunk(slot.sessionId, { type: "done" });
      this.emit("done", slot.sessionId);
    });
    slot.on("error", (error) => {
      this.logAgentComplete(slot.sessionId, false, error);
      this.broadcastChunk(slot.sessionId, { type: "error", error });
      this.emit("error", slot.sessionId, error);
    });
  }

  private flushBufferedOutput(slot: SessionSlot): void {
    for (const chunk of slot.outputBuffer) {
      this.broadcastChunk(slot.sessionId, chunk);
    }
    slot.outputBuffer = [];
  }

  private broadcastChunk(sessionId: string, chunk: AgentDriverChunk): void {
    broadcastChunk(this.webSocketServer, sessionId, chunk);
  }

  private broadcastStatus(sessionId: string, status: TeammateStatus): void {
    broadcastStatus(this.webSocketServer, sessionId, status);
  }

  private async handleFrontendMessage(sessionId: string, streamType: string, message: WebSocketMessage): Promise<void> {
    if (streamType !== "session") return;
    if (message.type === "start_chat") {
      const payload = message.payload as { userMessage?: string; teammateMode?: TeammateMode; teamTemplateId?: string };
      if (!payload.userMessage) return;
      await this.startChat(sessionId, payload.userMessage, { teamTemplateId: payload.teamTemplateId, teammateMode: payload.teammateMode });
      return;
    }
    if (message.type === "stop") {
      this.stopSession(sessionId);
    }
  }

  sendCommand(sessionId: string, command: ControlCommand): void {
    this.eventBus.sendCommand(sessionId, command);
  }

  /** 主线程读取最新 LLM 配置并同步给所有 Worker */
  updateLlmConfig(): void {
    const llmConfig = readLlmConfig();
    const command: ControlCommand = { type: "update_config", llmConfig };
    for (const slot of this.slots.values()) {
      slot.sendCommand(command);
    }
  }

  private ensureSessionLogContext(sessionId: string): SessionLogContext {
    const existing = this.sessionLogContexts.get(sessionId);
    if (existing) return existing;

    let title = "新会话";
    let mode = "chat";
    try {
      const conversation = queries.getConversation(getDatabase(), sessionId);
      title = conversation?.title ?? title;
      mode = conversation?.mode ?? mode;
    } catch {
      // 数据库未初始化时（如测试环境）使用默认值，不阻塞会话启动
    }

    const context: SessionLogContext = {
      logger: this.safeGetAuditLogger(),
      title,
      mode,
      model: "",
      startTime: Date.now(),
    };
    this.sessionLogContexts.set(sessionId, context);
    return context;
  }

  private safeGetAuditLogger(): AuditLogger {
    try {
      return getAuditLogger();
    } catch {
      // 数据库未初始化时返回空实现，避免测试/早期启动阶段抛错
      return createNoOpAuditLogger();
    }
  }

  private logChunk(sessionId: string, chunk: AgentDriverChunk): void {
    if (chunk.type !== "tool_event") return;
    const ctx = this.sessionLogContexts.get(sessionId);
    if (!ctx) return;

    const event = chunk.event as Record<string, unknown>;
    const toolName = String(event?.toolName ?? event?.name ?? "unknown");
    const success = event?.type === "tool_execution_end" ? event?.isError !== true : true;
    const startedAt = typeof event?.startedAt === "number" ? event.startedAt : ctx.startTime;
    const endedAt = typeof event?.endedAt === "number" ? event.endedAt : Date.now();
    const durationMs = typeof event?.durationMs === "number"
      ? event.durationMs
      : Math.max(0, endedAt - startedAt);

    ctx.logger.logToolCall(sessionId, ctx.title, ctx.mode, "Agent", toolName, durationMs, success);
  }

  private logAgentComplete(sessionId: string, success: boolean, error?: string): void {
    const ctx = this.sessionLogContexts.get(sessionId);
    if (!ctx) return;

    const durationMs = Math.max(0, Date.now() - ctx.startTime);
    if (success) {
      ctx.logger.logAgentInvokeComplete(sessionId, ctx.title, ctx.mode, "Boss Agent", ctx.model, 0, durationMs);
    } else {
      ctx.logger.logAgentInvokeFailed(sessionId, ctx.title, ctx.mode, "Boss Agent", ctx.model, error ?? "未知错误");
    }
  }
}

function createNoOpAuditLogger(): AuditLogger {
  const noop = () => {};
  return {
    log: noop,
    success: noop,
    failed: noop,
    logLlmConfig: noop,
    logDefaultLlmChanged: noop,
    logAgentAction: noop,
    logTeamAction: noop,
    logExtensionAction: noop,
    logKnowledgeAction: noop,
    logSession: noop,
    logConversationCreated: noop,
    logMessageSent: noop,
    logAgentInvokeStart: noop,
    logAgentInvokeComplete: noop,
    logAgentInvokeFailed: noop,
    logToolCall: noop,
    clearAuditLogs: noop,
    clearSessionLogs: noop,
  } as unknown as AuditLogger;
}
