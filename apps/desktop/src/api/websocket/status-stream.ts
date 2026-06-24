import type { TeammateStatus } from "@owl-os/core";
import type { OwleryWebSocketServer } from "./web-socket-server.js";

export function broadcastStatus(
  server: OwleryWebSocketServer,
  sessionId: string,
  status: TeammateStatus,
): void {
  server.broadcast(sessionId, "status", { type: "status", payload: status });
}
