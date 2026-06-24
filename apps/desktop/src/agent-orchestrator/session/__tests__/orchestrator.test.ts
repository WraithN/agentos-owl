import type { AgentDriverChunk, AgentDriverInput, AgentMessage, AgentRuntime, TeammateStatus } from "@owl-os/core";
import { AgentFactory, fixedNameGenerator } from "@owl-os/core";
import { describe, expect, it, vi } from "vitest";
import { AgentOrchestrator } from "../orchestrator.js";
import type { ControlCommand, SessionRuntimeEvent } from "../../session/port-types.js";
import type { RuntimePort } from "../../session/port-types.js";

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

  onStatus(_callback: (status: TeammateStatus) => void): () => void {
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
        yield { type: "text_delta", text: "ok" };
        yield { type: "done" };
      }),
      send: vi.fn(async (_message: AgentMessage) => {}),
      receive: vi.fn(async function* (): AsyncIterable<AgentMessage> {}),
      abort: vi.fn(async () => {}),
    }),
    nameGenerator: fixedNameGenerator,
  });
}

describe("AgentOrchestrator", () => {
  it("creates elder and exposes session channel / task board", () => {
    const port = new FakeRuntimePort();
    const orchestrator = new AgentOrchestrator({ sessionId: "session-a", agentFactory: createFactory(), port });

    expect(orchestrator.getElder()).toBeUndefined();
    const elder = orchestrator.createElder();
    expect(orchestrator.getElder()).toBe(elder);
    expect(orchestrator.getSessionChannel().sessionId).toBe("session-a");
    expect(orchestrator.getTaskBoard()).toBeDefined();

    orchestrator.dispose();
  });

  it("creates sentinel and worker with peer channels", () => {
    const port = new FakeRuntimePort();
    const orchestrator = new AgentOrchestrator({ sessionId: "session-a", agentFactory: createFactory(), port });

    const sentinel = orchestrator.createSentinel("planner");
    expect(sentinel).toBeDefined();
    expect(orchestrator.getAgent(sentinel.id)).toBe(sentinel);

    const { runner, channel } = orchestrator.createWorker("researcher", sentinel.id);
    expect(runner).toBeDefined();
    expect(channel).toBeDefined();
    expect(orchestrator.getAgent(runner.id)).toBe(runner);

    orchestrator.dispose();
  });
});
