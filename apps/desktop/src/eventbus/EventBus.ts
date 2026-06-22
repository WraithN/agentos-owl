import type { AgentDriverChunk, TeammateStatus } from "@owl-os/core";
import type { ControlCommand, SessionRuntimePort } from "./types.js";

export class EventBus {
  private readonly ports = new Map<string, SessionRuntimePort>();
  private readonly unsubscribers = new Map<string, Array<() => void>>();
  private readonly chunkListeners = new Map<string, Set<(chunk: AgentDriverChunk) => void>>();
  private readonly statusListeners = new Map<string, Set<(status: TeammateStatus) => void>>();
  private readonly doneListeners = new Map<string, Set<() => void>>();
  private readonly errorListeners = new Map<string, Set<(error: string) => void>>();

  registerSession(sessionId: string, port: SessionRuntimePort): void {
    this.unregisterSession(sessionId);
    this.ports.set(sessionId, port);
    this.unsubscribers.set(sessionId, [
      port.onChunk((chunk) => this.emit(this.chunkListeners, sessionId, chunk)),
      port.onStatus((status) => this.emit(this.statusListeners, sessionId, status)),
      port.onDone(() => this.doneListeners.get(sessionId)?.forEach((callback) => callback())),
      port.onError((error) => this.emit(this.errorListeners, sessionId, error)),
    ]);
  }

  unregisterSession(sessionId: string): void {
    this.unsubscribers.get(sessionId)?.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers.delete(sessionId);
    this.ports.delete(sessionId);
  }

  sendCommand(sessionId: string, command: ControlCommand): void {
    this.ports.get(sessionId)?.postCommand(command);
  }

  onChunk(sessionId: string, callback: (chunk: AgentDriverChunk) => void): () => void {
    return this.addListener(this.chunkListeners, sessionId, callback);
  }

  onStatus(sessionId: string, callback: (status: TeammateStatus) => void): () => void {
    return this.addListener(this.statusListeners, sessionId, callback);
  }

  onDone(sessionId: string, callback: () => void): () => void {
    const listeners = this.doneListeners.get(sessionId) ?? new Set<() => void>();
    listeners.add(callback);
    this.doneListeners.set(sessionId, listeners);
    return () => {
      listeners.delete(callback);
    };
  }

  onError(sessionId: string, callback: (error: string) => void): () => void {
    return this.addListener(this.errorListeners, sessionId, callback);
  }

  private addListener<T>(
    map: Map<string, Set<(value: T) => void>>,
    sessionId: string,
    callback: (value: T) => void,
  ): () => void {
    const listeners = map.get(sessionId) ?? new Set<(value: T) => void>();
    listeners.add(callback);
    map.set(sessionId, listeners);
    return () => {
      listeners.delete(callback);
    };
  }

  private emit<T>(map: Map<string, Set<(value: T) => void>>, sessionId: string, value: T): void {
    map.get(sessionId)?.forEach((callback) => callback(value));
  }
}
