import type { AgentDriverChunk, TeammateStatus } from "@owl-os/core";
import { describe, expect, it } from "vitest";
import { EventBus } from "../eventbus/EventBus.js";
import type { ControlCommand, SessionRuntimePort } from "../eventbus/types.js";

class FakeRuntimePort implements SessionRuntimePort {
  readonly commands: ControlCommand[] = [];
  private readonly chunkListeners = new Set<(chunk: AgentDriverChunk) => void>();
  private readonly statusListeners = new Set<(status: TeammateStatus) => void>();
  private readonly doneListeners = new Set<() => void>();
  private readonly errorListeners = new Set<(error: string) => void>();

  postCommand(command: ControlCommand): void {
    this.commands.push(command);
  }

  onChunk(callback: (chunk: AgentDriverChunk) => void): () => void {
    return this.add(this.chunkListeners, callback);
  }

  onStatus(callback: (status: TeammateStatus) => void): () => void {
    return this.add(this.statusListeners, callback);
  }

  onDone(callback: () => void): () => void {
    return this.add(this.doneListeners, callback);
  }

  onError(callback: (error: string) => void): () => void {
    return this.add(this.errorListeners, callback);
  }

  emitChunk(chunk: AgentDriverChunk): void {
    this.chunkListeners.forEach((callback) => callback(chunk));
  }

  emitDone(): void {
    this.doneListeners.forEach((callback) => callback());
  }

  private add<T>(listeners: Set<T>, callback: T): () => void {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  }
}

describe("EventBus", () => {
  it("routes commands and runtime events by session", () => {
    const bus = new EventBus();
    const port = new FakeRuntimePort();
    const chunks: AgentDriverChunk[] = [];
    let doneCount = 0;

    bus.registerSession("session-a", port);
    bus.onChunk("session-a", (chunk) => chunks.push(chunk));
    bus.onDone("session-a", () => {
      doneCount += 1;
    });

    bus.sendCommand("session-a", { type: "start_chat", userMessage: "hi", teammateMode: "brainstorm" });
    port.emitChunk({ type: "text_delta", text: "hello" });
    port.emitDone();

    expect(port.commands).toEqual([{ type: "start_chat", userMessage: "hi", teammateMode: "brainstorm" }]);
    expect(chunks).toEqual([{ type: "text_delta", text: "hello" }]);
    expect(doneCount).toBe(1);
  });
});
