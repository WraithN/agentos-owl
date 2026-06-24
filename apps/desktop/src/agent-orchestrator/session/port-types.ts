import type { AgentDriverChunk, TeammateMode, TeammateStatus } from "@owl-os/core";
import type { MessagePort } from "worker_threads";
import type { LlmConfig } from "../../agent-runtime/llm-config.js";

export type ControlCommand =
  | { type: "start_chat"; userMessage: string; teammateMode?: TeammateMode }
  | { type: "stop" }
  | { type: "activate" }
  | { type: "background" }
  | { type: "get_status" }
  | { type: "update_config"; llmConfig: LlmConfig };

export type SessionRuntimeEvent =
  | { type: "chunk"; chunk: AgentDriverChunk }
  | { type: "status"; status: TeammateStatus }
  | { type: "done" }
  | { type: "error"; error: string }
  | { type: "persist_agent_names"; names: Record<string, string> };

/**
 * 主线程视角的会话端口。
 * 由 SessionSlot 通过 slot-port-adapter 实现，供 SessionEventBus 按 sessionId 路由事件。
 */
export interface SessionRuntimePort {
  postCommand(command: ControlCommand): void;
  onChunk(callback: (chunk: AgentDriverChunk) => void): () => void;
  onStatus(callback: (status: TeammateStatus) => void): () => void;
  onDone(callback: () => void): () => void;
  onError(callback: (error: string) => void): () => void;
}

type RuntimePortMessage = SessionRuntimeEvent | ControlCommand;
const CONTROL_COMMAND_TYPES = new Set<ControlCommand["type"]>(["start_chat", "stop", "activate", "background", "get_status", "update_config"]);

/**
 * Worker 线程视角的会话端口。
 * 由 MessagePort 实现，供 AgentOrchestrator / SessionRuntime 收发事件与命令。
 */
export interface RuntimePort {
  postCommand(command: ControlCommand): void;
  postEvent(event: SessionRuntimeEvent): void;
  onCommand(callback: (command: ControlCommand) => void): () => void;
  onChunk(callback: (chunk: AgentDriverChunk) => void): () => void;
  onStatus(callback: (status: TeammateStatus) => void): () => void;
  onDone(callback: () => void): () => void;
  onError(callback: (error: string) => void): () => void;
}

export function createRuntimePortFromMessagePort(port: MessagePort): RuntimePort {
  return {
    postCommand: (command) => port.postMessage(command),
    postEvent: (event) => port.postMessage(event),
    onCommand: (callback) => subscribeCommand(port, callback),
    onChunk: (callback) => subscribe(port, "chunk", (event) => {
      if (event.type === "chunk") callback(event.chunk);
    }),
    onStatus: (callback) => subscribe(port, "status", (event) => {
      if (event.type === "status") callback(event.status);
    }),
    onDone: (callback) => subscribe(port, "done", () => callback()),
    onError: (callback) => subscribe(port, "error", (event) => {
      if (event.type === "error") callback(event.error);
    }),
  };
}

function subscribe<T extends RuntimePortMessage>(
  port: MessagePort,
  type: T["type"],
  callback: (event: T) => void,
): () => void {
  const handler = (event: RuntimePortMessage) => {
    if (event.type === type) callback(event as T);
  };
  port.on("message", handler);
  return () => port.off("message", handler);
}

function subscribeCommand(port: MessagePort, callback: (command: ControlCommand) => void): () => void {
  const handler = (event: RuntimePortMessage) => {
    if (CONTROL_COMMAND_TYPES.has(event.type as ControlCommand["type"])) callback(event as ControlCommand);
  };
  port.on("message", handler);
  return () => port.off("message", handler);
}
