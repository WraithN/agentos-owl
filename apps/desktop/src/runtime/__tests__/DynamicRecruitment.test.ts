import { describe, expect, it } from "vitest";
import type { AgentDriverChunk, AgentDriverInput, AgentMessage } from "@owl-os/core";
import { AgentFactory, fixedNameGenerator } from "@owl-os/core";
import type { ControlCommand, SessionRuntimeEvent } from "../../eventbus/types.js";
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

  onChunk(_callback: (chunk: AgentDriverChunk) => void): () => void { return () => {}; }
  onStatus(_callback: (status: import("@owl-os/core").TeammateStatus) => void): () => void { return () => {}; }
  onDone(_callback: () => void): () => void { return () => {}; }
  onError(_callback: (error: string) => void): () => void { return () => {}; }
}

function createFactory() {
  return new AgentFactory({
    driverFactory: ({ role }) => ({
      streamChat: async function* (_input: AgentDriverInput): AsyncIterable<AgentDriverChunk> {
        if (role === "elder") {
          yield {
            type: "tool_event",
            event: {
              type: "tool_execution_end",
              toolName: "recruit_sentinel",
              result: { title: "planner" },
            },
          };
          yield { type: "text_delta", text: "已交给专业团队" };
          yield { type: "done" };
        } else if (role === "sentinel") {
          yield {
            type: "tool_event",
            event: {
              type: "tool_execution_end",
              toolName: "recruit_workers",
              result: { workers: ["developer", "tester"] },
            },
          };
          yield { type: "text_delta", text: "开始执行" };
          yield { type: "done" };
        } else {
          yield { type: "text_delta", text: `${role}:done` };
          yield { type: "done" };
        }
      },
      send: async (_message: AgentMessage) => {},
      receive: async function* () {},
      abort: async () => {},
    }),
    nameGenerator: fixedNameGenerator,
  });
}

describe("SessionRuntime dynamic recruitment", () => {
  it("creates sentinel and workers from tool events", async () => {
    const port = new FakeRuntimePort();
    const runtime = new SessionRuntime({ sessionId: "session-a", agentFactory: createFactory(), port });
    runtime.run();

    port.postCommand({ type: "start_chat", userMessage: "写个登录页面" });
    await new Promise((resolve) => setTimeout(resolve, 200));
    runtime.dispose();

    const toolEvents = port.events
      .filter((e) => e.type === "chunk" && e.chunk.type === "tool_event")
      .map((e) => (e as { chunk: { event: { toolName: string } } }).chunk.event.toolName);

    expect(toolEvents).toContain("recruit_sentinel");
    expect(toolEvents).toContain("recruit_workers");
  });
});
