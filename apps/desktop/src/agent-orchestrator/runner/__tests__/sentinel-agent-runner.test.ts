import { describe, expect, it, vi } from "vitest";
import type { AgentDriverChunk, AgentDriverInput, AgentMessage, AgentRuntime, AgentTask } from "@owl-os/core";
import { MessageBox } from "@owl-os/core";
import { SentinelAgentRunner } from "../sentinel-agent-runner.js";
import { SessionChannel } from "../../session/session-channel.js";
import { PeerChannel } from ".././channel/peer-channel.js";
import { WorkerAgentRunner } from "../worker-agent-runner.js";
import type { SessionRuntimeEvent } from "../../session/port-types.js";
import { TaskBoard } from "../../task-board/task-board.js";

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
        yield { type: "text_delta", text: "满足" };
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

function createWorkerAgent(id: string, title: string, messageBox: MessageBox): AgentRuntime {
  return {
    id,
    role: "worker",
    title,
    name: title,
    locale: "zh-CN",
    tools: [],
    driver: {
      streamChat: vi.fn(async function* (_input: AgentDriverInput): AsyncIterable<AgentDriverChunk> {
        const instruction = String(
          (_input.messages[0]?.payload as Record<string, unknown> | undefined)?.text ?? "",
        );
        const output = instruction.includes("researcher") || title === "researcher" ? "research-output" : "writer-output";
        yield { type: "text_delta", text: output };
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

function createTask(id: string, context?: unknown): AgentTask {
  return {
    id,
    sessionId: "session-a",
    instruction: "write a doc",
    context,
    createdAt: Date.now(),
  };
}

describe("SentinelAgentRunner", () => {
  it("dispatches pipeline strategy and returns result to elder", async () => {
    const sessionChannel = new SessionChannel("session-a");
    const messageBox = new MessageBox();
    const sentinelAgent = createMockAgent("sentinel-1", "sentinel", "planner");

    const sentinelChannelFromElder = new PeerChannel(
      messageBox,
      "ch-elder-sentinel",
      "session-a",
      sentinelAgent.id,
      "elder-1",
    );
    const elderChannel = new PeerChannel(
      messageBox,
      "ch-elder-sentinel",
      "session-a",
      "elder-1",
      sentinelAgent.id,
    );

    const events: SessionRuntimeEvent[] = [];
    const taskBoard = new TaskBoard();
    const runner = new SentinelAgentRunner(sentinelAgent, sessionChannel, sentinelChannelFromElder, {
      createWorker: (workerTitle) => {
        const workerAgent = createWorkerAgent(`worker-${workerTitle}`, workerTitle, messageBox);
        const workerChannel = new PeerChannel(
          messageBox,
          `ch-sentinel-${workerTitle}`,
          "session-a",
          workerAgent.id,
          sentinelAgent.id,
        );
        const sentinelChannel = new PeerChannel(
          messageBox,
          `ch-sentinel-${workerTitle}`,
          "session-a",
          sentinelAgent.id,
          workerAgent.id,
        );
        const workerRunner = new WorkerAgentRunner(workerAgent, sessionChannel, workerChannel);
        workerRunner.start();
        return { runner: workerRunner, channel: sentinelChannel };
      },
      postEvent: (event) => events.push(event),
      taskBoard,
    });
    runner.start();

    const results: unknown[] = [];
    elderChannel.on("result", (payload) => results.push(payload));

    await elderChannel.send("task", { task: createTask("root", { teammateMode: "pipeline" }) });

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(expect.objectContaining({ taskId: "root", result: "writer-output" }));

    runner.destroy();
  });
});
