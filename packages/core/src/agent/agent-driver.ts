import type { AgentDriverChunk, AgentDriverInput, AgentMessage } from "./types.js";

export interface AgentDriver {
  streamChat(input: AgentDriverInput): AsyncIterable<AgentDriverChunk>;
  send(message: AgentMessage): Promise<void>;
  receive(): AsyncIterable<AgentMessage>;
  abort?(): Promise<void>;
}
