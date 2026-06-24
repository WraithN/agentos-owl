import { describe, expect, it, vi } from "vitest";
import type { AgentDriverChunk, AgentDriverInput, AgentMessage, AgentRuntime, AgentTask } from "@owl-os/core";
import { BaseAgentRunner } from "../base-agent-runner.js";
import { SessionChannel } from "../../session/session-channel.js";

class TestRunner extends BaseAgentRunner {
  handledMessages: AgentMessage[] = [];

  protected createMessage(task: AgentTask): AgentMessage {
    return {
      id: `${task.id}:test`,
      from: "system",
      to: this.id,
      sessionId: task.sessionId,
      kind: "request",
      payload: { task },
      createdAt: Date.now(),
    };
  }

  protected async handleMessage(message: AgentMessage): Promise<void> {
    this.handledMessages.push(message);
    this.output({ type: "text_delta", text: "ok" });
  }
}

function createAgent(): AgentRuntime {
  return {
    id: "agent-1",
    role: "worker",
    title: "tester",
    name: "Tester",
    locale: "zh-CN",
    driver: {
      streamChat: async function* (_input: AgentDriverInput): AsyncIterable<AgentDriverChunk> {
        yield { type: "done" };
      },
      send: async (_message: AgentMessage) => {},
      receive: async function* () {},
      abort: vi.fn(),
    },
    streamChat(input) {
      return this.driver.streamChat({ ...input, agentId: this.id });
    },
    send(_to, message) {
      return this.driver.send(message);
    },
    receive() {
      return this.driver.receive();
    },
  };
}

function createTask(taskId: string): AgentTask {
  return {
    id: taskId,
    sessionId: "session-a",
    instruction: "do something",
    createdAt: Date.now(),
  };
}

describe("BaseAgentRunner", () => {
  it("enqueues and processes tasks", async () => {
    const channel = new SessionChannel("session-a");
    const runner = new TestRunner(createAgent(), channel);
    runner.start();
    runner.enqueueTask(createTask("t1"));

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(runner.handledMessages.length).toBe(1);
    expect((runner.handledMessages[0]?.payload as { task?: { id: string } }).task?.id).toBe("t1");
    runner.destroy();
  });

  it("outputs content via session channel", async () => {
    const channel = new SessionChannel("session-a");
    const handler = vi.fn();
    channel.subscribe("output", handler);

    const runner = new TestRunner(createAgent(), channel);
    runner.start();
    runner.enqueueTask(createTask("t1"));

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(handler).toHaveBeenCalled();
    runner.destroy();
  });

  it("sleeps when no tasks and wakes on enqueue", async () => {
    const channel = new SessionChannel("session-a");
    const runner = new TestRunner(createAgent(), channel);
    runner.start();

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(runner.handledMessages.length).toBe(0);

    runner.enqueueTask(createTask("t2"));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(runner.handledMessages.length).toBe(1);

    runner.destroy();
  });
});
