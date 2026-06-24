import type { IncomingMessage } from "http";
import { WebSocket, WebSocketServer as WsServer } from "ws";

export interface WebSocketMessage {
  type: string;
  sessionId?: string;
  payload?: unknown;
}

export type WebSocketMessageHandler = (
  sessionId: string,
  streamType: string,
  message: WebSocketMessage,
) => void;

const DEFAULT_SESSION_ID = "default";

export class OwleryWebSocketServer {
  private readonly server: WsServer;
  private readonly clients = new Map<string, Map<string, Set<WebSocket>>>();
  onMessage?: WebSocketMessageHandler;

  constructor(port: number) {
    this.server = new WsServer({ port });
    this.server.on("connection", (socket, request) => this.handleConnection(socket, request));
  }

  broadcast(sessionId: string, streamType: string, message: WebSocketMessage): void {
    const payload = JSON.stringify({ ...message, sessionId });
    for (const socket of this.clients.get(sessionId)?.get(streamType) ?? []) {
      if (socket.readyState === WebSocket.OPEN) socket.send(payload);
    }
  }

  close(): void {
    for (const streamClients of this.clients.values()) {
      for (const sockets of streamClients.values()) {
        for (const socket of sockets) socket.close();
      }
    }
    this.clients.clear();
    this.server.close();
  }

  private handleConnection(socket: WebSocket, request: IncomingMessage): void {
    const { sessionId, streamType } = this.parseRequest(request);
    this.addClient(sessionId, streamType, socket);

    socket.on("message", (data) => {
      const message = this.parseMessage(data);
      if (!message) return;
      this.onMessage?.(sessionId, streamType, message);
    });

    socket.on("close", () => {
      this.clients.get(sessionId)?.get(streamType)?.delete(socket);
    });
  }

  private addClient(sessionId: string, streamType: string, socket: WebSocket): void {
    const sessionClients = this.clients.get(sessionId) ?? new Map<string, Set<WebSocket>>();
    const streamClients = sessionClients.get(streamType) ?? new Set<WebSocket>();
    streamClients.add(socket);
    sessionClients.set(streamType, streamClients);
    this.clients.set(sessionId, sessionClients);
  }

  private parseRequest(request: IncomingMessage): { sessionId: string; streamType: string } {
    const url = new URL(request.url ?? "/session", "http://localhost");
    const streamType = url.pathname.replace(/^\//, "") || "session";
    return {
      sessionId: url.searchParams.get("sessionId") ?? DEFAULT_SESSION_ID,
      streamType,
    };
  }

  private parseMessage(data: WebSocket.RawData): WebSocketMessage | null {
    try {
      const parsed = JSON.parse(data.toString()) as unknown;
      if (!parsed || typeof parsed !== "object") return null;
      const message = parsed as WebSocketMessage;
      return typeof message.type === "string" ? message : null;
    } catch {
      return null;
    }
  }
}

export { OwleryWebSocketServer as WebSocketServer };
