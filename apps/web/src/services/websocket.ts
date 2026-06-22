import type { AgentDriverChunk, TeammateStatus } from '@owl-os/core';
import type { TeammateMode } from '@/types';

export interface WebSocketClientOptions {
  sessionId: string;
  port?: number;
  onChunk?: (chunk: AgentDriverChunk) => void;
  onStatus?: (status: TeammateStatus) => void;
  onError?: (error: string, streamType: string) => void;
}

interface StreamMessage<T = unknown> {
  type: string;
  sessionId?: string;
  payload?: T;
}

const DEFAULT_OWLERY_WS_PORT = 8765;
const SESSION_STREAM = 'session';
const STATUS_STREAM = 'status';

export class WebSocketClient {
  private readonly sessionStream: WebSocket;
  private readonly statusStream: WebSocket;

  constructor(private readonly options: WebSocketClientOptions) {
    const port = options.port ?? DEFAULT_OWLERY_WS_PORT;
    this.sessionStream = new WebSocket(this.buildUrl(port, SESSION_STREAM, options.sessionId));
    this.statusStream = new WebSocket(this.buildUrl(port, STATUS_STREAM, options.sessionId));
    this.sessionStream.onmessage = (event) => this.handleSessionMessage(event);
    this.statusStream.onmessage = (event) => this.handleStatusMessage(event);
    this.sessionStream.onerror = () => options.onError?.('Owlery 会话流连接失败', SESSION_STREAM);
    this.statusStream.onerror = () => options.onError?.('Owlery 状态流连接失败', STATUS_STREAM);
  }

  isSessionReady(): boolean {
    return this.sessionStream.readyState === WebSocket.OPEN;
  }

  sendChat(userMessage: string, options?: { teammateMode?: TeammateMode; teamTemplateId?: string }): boolean {
    return this.send(this.sessionStream, {
      type: 'start_chat',
      payload: { userMessage, teammateMode: options?.teammateMode, teamTemplateId: options?.teamTemplateId },
    });
  }

  stop(): boolean {
    return this.send(this.sessionStream, { type: 'stop' });
  }

  close(): void {
    this.sessionStream.close();
    this.statusStream.close();
  }

  private buildUrl(port: number, streamType: string, sessionId: string): string {
    const host = window.location.hostname || '127.0.0.1';
    return `ws://${host}:${port}/${streamType}?sessionId=${encodeURIComponent(sessionId)}`;
  }

  private send<T>(socket: WebSocket, message: StreamMessage<T>): boolean {
    const payload = JSON.stringify(message);
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(payload);
      return true;
    }
    if (socket.readyState === WebSocket.CONNECTING) {
      socket.addEventListener('open', () => socket.send(payload), { once: true });
      return true;
    }
    return false;
  }

  private handleSessionMessage(event: MessageEvent<string>): void {
    const message = this.parseMessage<AgentDriverChunk | string>(event.data);
    if (!message) return;
    if (message.type === 'chunk') this.options.onChunk?.(message.payload as AgentDriverChunk);
    if (message.type === 'error') this.options.onError?.(String(message.payload ?? 'Owlery 会话流错误'), SESSION_STREAM);
  }

  private handleStatusMessage(event: MessageEvent<string>): void {
    const message = this.parseMessage<TeammateStatus>(event.data);
    if (!message || message.type !== 'status') return;
    if (message.payload) this.options.onStatus?.(message.payload);
  }

  private parseMessage<T>(raw: string): StreamMessage<T> | null {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object') return null;
      const message = parsed as StreamMessage<T>;
      return typeof message.type === 'string' ? message : null;
    } catch {
      return null;
    }
  }
}
