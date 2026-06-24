import { SessionRunStatus, SessionVisibility } from "@owl-os/core";
import type { AgentDriverChunk, TeammateMode, TeammateStatus } from "@owl-os/core";
import { EventEmitter } from "events";
import { MessageChannel, type MessagePort, Worker } from "worker_threads";
import type { ControlCommand, SessionRuntimeEvent } from "../session/port-types.js";
import { readLlmConfig } from "../../agent-runtime/llm-config.js";
import type { LlmConfig } from "../../agent-runtime/llm-config.js";
import { getDatabase } from "../../db/connection.js";
import { updateConversationAgentNames } from "../../db/queries/conversations.js";
import { setSessionAgentNames } from "../../agent-runtime/agent-names.js";

export interface SessionSlotOptions {
  sessionId: string;
  threadEntryPath: string;
  /** 测试注入；生产环境由主线程读取数据库后传入 */
  llmConfig?: LlmConfig;
  /** 已持久化的 Agent 名字，主线程读取数据库后传入 Worker */
  agentNames?: Record<string, string>;

}

export interface SessionSlotEvents {
  chunk: [AgentDriverChunk];
  status: [TeammateStatus];
  done: [];
  error: [string];
}

export declare interface SessionSlot {
  on<EventName extends keyof SessionSlotEvents>(eventName: EventName, listener: (...args: SessionSlotEvents[EventName]) => void): this;
  off<EventName extends keyof SessionSlotEvents>(eventName: EventName, listener: (...args: SessionSlotEvents[EventName]) => void): this;
  emit<EventName extends keyof SessionSlotEvents>(eventName: EventName, ...args: SessionSlotEvents[EventName]): boolean;
}

export class SessionSlot extends EventEmitter {
  readonly sessionId: string;
  visibility: SessionVisibility = SessionVisibility.ACTIVE;
  runStatus: SessionRunStatus = SessionRunStatus.IDLE;
  outputBuffer: AgentDriverChunk[] = [];
  lastError?: string;
  private worker?: Worker;
  private runtimePort?: MessagePort;

  constructor(private readonly options: SessionSlotOptions) {
    super();
    this.sessionId = options.sessionId;
  }

  async spawn(): Promise<void> {
    if (this.worker) return;
    const worker = new Worker(this.options.threadEntryPath);
    const { port1, port2 } = new MessageChannel();
    this.worker = worker;
    this.runtimePort = port1;
    this.setupPortHandlers(port1);
    port1.start();
    worker.on("error", (error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[SessionSlot ${this.sessionId}] worker error:`, error);
      this.runStatus = SessionRunStatus.FAILED;
      this.lastError = message;
      this.emit("error", message);
    });
    worker.on("messageerror", (error) => {
      console.error(`[SessionSlot ${this.sessionId}] worker message error:`, error);
    });
    worker.on("exit", (code) => {
      this.worker = undefined;
      this.runtimePort = undefined;
      if (this.runStatus !== SessionRunStatus.RUNNING) return;
      const message = code === 0 ? "idle" : `Session thread exited with code ${code}`;
      console.error(`[SessionSlot ${this.sessionId}] ${message}`);
      this.runStatus = code === 0 ? SessionRunStatus.IDLE : SessionRunStatus.FAILED;
      if (code !== 0) this.emit("error", message);
    });
    worker.on("message", (message) => {
      if (message && typeof message === "object" && (message as { type?: string }).type === "worker_fatal") {
        const error = (message as { error?: string }).error ?? "unknown worker fatal error";
        console.error(`[SessionSlot ${this.sessionId}] worker fatal:`, error);
        this.runStatus = SessionRunStatus.FAILED;
        this.lastError = error;
        this.emit("error", error);
      }
    });
    const llmConfig = this.options.llmConfig ?? readLlmConfig();
    worker.postMessage(
      {
        sessionId: this.sessionId,
        port: port2,
        llmConfig,
        agentNames: this.options.agentNames,
      },
      [port2],
    );
  }

  start(userMessage: string, teammateMode?: TeammateMode): void {
    this.runStatus = SessionRunStatus.RUNNING;
    this.sendCommand({ type: "start_chat", userMessage, teammateMode });
  }

  activate(): void {
    this.visibility = SessionVisibility.ACTIVE;
    this.sendCommand({ type: "activate" });
  }

  background(): void {
    this.visibility = SessionVisibility.BACKGROUND;
    this.sendCommand({ type: "background" });
  }

  stop(): void {
    this.runStatus = SessionRunStatus.CANCELLED;
    this.sendCommand({ type: "stop" });
  }

  sendCommand(command: ControlCommand): void {
    this.runtimePort?.postMessage(command);
  }

  async terminate(): Promise<void> {
    this.runtimePort?.close();
    await this.worker?.terminate();
    this.worker = undefined;
    this.runtimePort = undefined;
    this.runStatus = SessionRunStatus.IDLE;
  }

  private setupPortHandlers(port: MessagePort): void {
    port.on("message", (event: SessionRuntimeEvent) => this.handleRuntimeEvent(event));
  }

  private handleRuntimeEvent(event: SessionRuntimeEvent): void {
    if (event.type === "chunk") {
      if (this.visibility === SessionVisibility.BACKGROUND) this.outputBuffer.push(event.chunk);
      this.emit("chunk", event.chunk);
      return;
    }
    if (event.type === "status") {
      this.emit("status", event.status);
      return;
    }
    if (event.type === "done") {
      if (this.runStatus === SessionRunStatus.RUNNING) this.runStatus = SessionRunStatus.COMPLETED;
      this.emit("done");
      return;
    }
    if (event.type === "persist_agent_names") {
      try {
        setSessionAgentNames(this.sessionId, event.names);
        updateConversationAgentNames(getDatabase(), this.sessionId, event.names);
      } catch (error) {
        console.error(`[SessionSlot ${this.sessionId}] failed to persist agent names:`, error);
      }
      return;
    }
    this.runStatus = SessionRunStatus.FAILED;
    this.lastError = event.error;
    this.emit("error", event.error);
  }
}
