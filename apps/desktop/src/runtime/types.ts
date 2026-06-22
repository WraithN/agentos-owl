import type { AgentDriverChunk, TeammateStatus } from "@owl-os/core";
import type { MessagePort } from "worker_threads";
import type { ControlCommand, SessionRuntimeEvent } from "../eventbus/types.js";

type RuntimePortMessage = SessionRuntimeEvent | ControlCommand;
const CONTROL_COMMAND_TYPES = new Set<ControlCommand["type"]>(["start_chat", "stop", "activate", "background", "get_status", "update_config"]);

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
