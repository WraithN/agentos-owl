import type { AgentDriverChunk, TeammateMode, TeammateStatus } from "@owl-os/core";
import type { LlmConfig } from "../agent/llmConfig.js";

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
  | { type: "error"; error: string };

export interface SessionRuntimePort {
  postCommand(command: ControlCommand): void;
  onChunk(callback: (chunk: AgentDriverChunk) => void): () => void;
  onStatus(callback: (status: TeammateStatus) => void): () => void;
  onDone(callback: () => void): () => void;
  onError(callback: (error: string) => void): () => void;
}
