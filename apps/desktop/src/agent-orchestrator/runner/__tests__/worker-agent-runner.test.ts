import { describe, expect, it, vi } from "vitest";
import type { AgentDriverChunk, AgentDriverInput, AgentMessage, AgentRuntime, AgentTask } from "@owl-os/core";
import { MessageBox } from "@owl-os/core";
import { WorkerAgentRunner } from "../worker-agent-runner.js";
import { SessionChannel } from "../../session/session-channel.js";
import { PeerChannel } from ".././channel/peer-channel.js";

function createMockAgent(id: string, role: "elder" | "sentinel" | "worker", title: string): AgentRuntime {
  return {
    id,
    role,
    title,
    name: title,
    locale: "zh-CN",
    tools: [],
    driver: {
      streamChat: vi.fn(async function* (_input: AgentDriverInput): AsyncIterable<AgentDriverChunk> {
        yield { type: "text_delta", text: "worker-output" };
        yield { type: "done" };
      }),
      send: vi.fn(async (_message: AgentMessage) => {}),
      receive: vi.fn(async function* () {}),
      abort: vi.fn(),
    },
    streamChat(input: Omit<AgentDriverInput, "agentId">) {
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

function createTask(id: string): AgentTask {
  return {
    id,
    sessionId: "session-a",
    instruction: "do something",
    createdAt: Date.now(),
  };
}

describe("WorkerAgentRunner", () => {
  it("executes task and returns result via parent channel", async () => {
    const sessionChannel = new SessionChannel("session-a");
    const messageBox = new MessageBox();
    const agent = createMockAgent("worker-1", "worker", "researcher");

    const workerChannel = new PeerChannel(messageBox, "ch-1", "session-a", agent.id, "sentinel-1");
    const sentinelChannel = new PeerChannel(messageBox, "ch-1", "session-a", "sentinel-1", agent.id);

    const runner = new WorkerAgentRunner(agent, sessionChannel, workerChannel);
    runner.start();

    const results: unknown[] = [];
    sentinelChannel.on("result", (payload) => results.push(payload));

    await sentinelChannel.send("task", { task: createTask("t1") });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(expect.objectContaining({ taskId: "t1", result: "worker-output" }));

    runner.destroy();
  });

  it("exposes execute() for direct invocation", async () => {
    const sessionChannel = new SessionChannel("session-a");
    const messageBox = new MessageBox();
    const agent = createMockAgent("worker-2", "worker", "writer");

    const workerChannel = new PeerChannel(messageBox, "ch-2", "session-a", agent.id, "sentinel-1");

    const runner = new WorkerAgentRunner(agent, sessionChannel, workerChannel);
    runner.start();

    const result = await runner.execute(createTask("t2"));

    expect(result).toBe("worker-output");
    runner.destroy();
  });
});
