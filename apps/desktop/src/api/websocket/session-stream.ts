import type { AgentDriverChunk } from "@owl-os/core";
import type { OwleryWebSocketServer } from "./web-socket-server.js";

export function broadcastChunk(
  server: OwleryWebSocketServer,
  sessionId: string,
  chunk: AgentDriverChunk,
): void {
  server.broadcast(sessionId, "session", { type: "chunk", payload: chunk });
}
