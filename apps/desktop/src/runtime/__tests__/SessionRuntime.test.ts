import type { AgentDriverChunk, AgentDriverInput, AgentMessage } from "@owl-os/core";
import { AgentFactory, fixedNameGenerator } from "@owl-os/core";
import type { ControlCommand, SessionRuntimeEvent } from "../../eventbus/types.js";
import { describe, expect, it, vi } from "vitest";
import { SessionRuntime } from "../SessionRuntime.js";
import type { RuntimePort } from "../types.js";

class FakeRuntimePort implements RuntimePort {
  readonly commands: ControlCommand[] = [];
  readonly events: SessionRuntimeEvent[] = [];
  private readonly commandListeners = new Set<(command: ControlCommand) => void>();

  postCommand(command: ControlCommand): void {
    this.commands.push(command);
    this.commandListeners.forEach((callback) => callback(command));
  }

  postEvent(event: SessionRuntimeEvent): void {
    this.events.push(event);
  }

  onCommand(callback: (command: ControlCommand) => void): () => void {
    this.commandListeners.add(callback);
    return () => this.commandListeners.delete(callback);
  }

  onChunk(_callback: (chunk: AgentDriverChunk) => void): () => void {
    return () => {};
  }

  onStatus(_callback: (status: import("@owl-os/core").TeammateStatus) => void): () => void {
    return () => {};
  }

  onDone(_callback: () => void): () => void {
    return () => {};
  }

  onError(_callback: (error: string) => void): () => void {
    return () => {};
  }
}

function createFactory() {
  return new AgentFactory({
    driverFactory: () => ({
      streamChat: vi.fn(async function* (_input: AgentDriverInput): AsyncIterable<AgentDriverChunk> {
        yield { type: "text_delta", text: "hello" };
        yield { type: "done" };
      }),
      send: vi.fn(async (_message: AgentMessage) => {}),
      receive: vi.fn(async function* (): AsyncIterable<AgentMessage> {}),
      abort: vi.fn(async () => {}),
    }),
    nameGenerator: fixedNameGenerator,
  });
}

describe("SessionRuntime", () => {
  it("handles start_chat command and emits chunks, status and done", async () => {
    const port = new FakeRuntimePort();
    const runtime = new SessionRuntime({ sessionId: "session-a", agentFactory: createFactory(), port });
    runtime.run();

    port.postCommand({ type: "start_chat", userMessage: "hi", teammateMode: "brainstorm" });
    await new Promise((resolve) => setTimeout(resolve, 100));
    port.postCommand({ type: "stop" });
    await new Promise((resolve) => setTimeout(resolve, 20));
    runtime.dispose();

    expect(port.events.some((event) => event.type === "chunk" && event.chunk.type === "text_delta")).toBe(true);
    expect(port.events.some((event) => event.type === "status")).toBe(true);
    expect(port.events.some((event) => event.type === "done")).toBe(true);
  });

  it("updates visibility and run status on control commands", () => {
    const port = new FakeRuntimePort();
    const runtime = new SessionRuntime({ sessionId: "session-a", agentFactory: createFactory(), port });
    runtime.run();

    port.postCommand({ type: "background" });
    port.postCommand({ type: "get_status" });
    runtime.dispose();

    const statuses = port.events.filter((event) => event.type === "status");
    expect(statuses.some((event) => event.type === "status" && event.status.sessionId === "session-a")).toBe(true);
  });
});
