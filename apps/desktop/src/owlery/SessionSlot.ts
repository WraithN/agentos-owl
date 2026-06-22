import type { AgentDriverChunk, SessionRunStatus, SessionVisibility, TeammateMode, TeammateStatus } from "@owl-os/core";
import { EventEmitter } from "events";
import { MessageChannel, type MessagePort, Worker } from "worker_threads";
import type { ControlCommand, SessionRuntimeEvent } from "../eventbus/types.js";
import { readLlmConfig } from "../agent/llmConfig.js";
import type { LlmConfig } from "../agent/llmConfig.js";

export interface SessionSlotOptions {
  sessionId: string;
  threadEntryPath: string;
  /** 测试注入；生产环境由主线程读取数据库后传入 */
  llmConfig?: LlmConfig;
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
  visibility: SessionVisibility = "active";
  runStatus: SessionRunStatus = "idle";
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
      this.runStatus = "failed";
      this.lastError = message;
      this.emit("error", message);
    });
    worker.on("messageerror", (error) => {
      console.error(`[SessionSlot ${this.sessionId}] worker message error:`, error);
    });
    worker.on("exit", (code) => {
      this.worker = undefined;
      this.runtimePort = undefined;
      if (this.runStatus !== "running") return;
      const message = code === 0 ? "idle" : `Session thread exited with code ${code}`;
      console.error(`[SessionSlot ${this.sessionId}] ${message}`);
      this.runStatus = code === 0 ? "idle" : "failed";
      if (code !== 0) this.emit("error", message);
    });
    worker.on("message", (message) => {
      if (message && typeof message === "object" && (message as { type?: string }).type === "worker_fatal") {
        const error = (message as { error?: string }).error ?? "unknown worker fatal error";
        console.error(`[SessionSlot ${this.sessionId}] worker fatal:`, error);
        this.runStatus = "failed";
        this.lastError = error;
        this.emit("error", error);
      }
    });
    const llmConfig = this.options.llmConfig ?? readLlmConfig();
    worker.postMessage({ sessionId: this.sessionId, port: port2, llmConfig }, [port2]);
  }

  start(userMessage: string, teammateMode?: TeammateMode): void {
    this.runStatus = "running";
    this.sendCommand({ type: "start_chat", userMessage, teammateMode });
  }

  activate(): void {
    this.visibility = "active";
    this.sendCommand({ type: "activate" });
  }

  background(): void {
    this.visibility = "background";
    this.sendCommand({ type: "background" });
  }

  stop(): void {
    this.runStatus = "cancelled";
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
    this.runStatus = "idle";
  }

  private setupPortHandlers(port: MessagePort): void {
    port.on("message", (event: SessionRuntimeEvent) => this.handleRuntimeEvent(event));
  }

  private handleRuntimeEvent(event: SessionRuntimeEvent): void {
    if (event.type === "chunk") {
      if (this.visibility === "background") this.outputBuffer.push(event.chunk);
      this.emit("chunk", event.chunk);
      return;
    }
    if (event.type === "status") {
      this.emit("status", event.status);
      return;
    }
    if (event.type === "done") {
      if (this.runStatus === "running") this.runStatus = "completed";
      this.emit("done");
      return;
    }
    this.runStatus = "failed";
    this.lastError = event.error;
    this.emit("error", event.error);
  }
}
