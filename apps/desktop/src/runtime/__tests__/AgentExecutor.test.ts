import type { AgentDriverChunk, AgentDriverInput, AgentMessage, AgentRuntime, AgentTitle, ChannelId } from "@owl-os/core";
import { CrystalBall, MessageBox } from "@owl-os/core";
import { describe, expect, it, vi } from "vitest";
import { AgentExecutor } from "../AgentExecutor.js";

type MockRole = "elder" | "sentinel" | "worker";

function createMockAgent(id: string, role: MockRole, channelIds: ChannelId[] = []): AgentRuntime & { channelIds: Set<ChannelId> } {
  return {
    id,
    role,
    name: id,
    title: "boss" as AgentTitle,
    locale: "zh-CN",
    channelIds: new Set(channelIds),
    driver: {
      streamChat: vi.fn(async function* (_input: AgentDriverInput): AsyncIterable<AgentDriverChunk> {
        yield { type: "text_delta", text: `${id}:hello` };
        yield { type: "done" };
      }),
      send: vi.fn(async (_message: AgentMessage) => {}),
      receive: vi.fn(async function* (): AsyncIterable<AgentMessage> {}),
      abort: vi.fn(async () => {}),
    },
    streamChat(input) {
      return this.driver.streamChat({ ...input, agentId: this.id });
    },
    send(_toAgentId, message) {
      return this.driver.send(message);
    },
    receive() {
      return this.driver.receive();
    },
  };
}

function createMessage(to: string): AgentMessage<{ text: string }> {
  return {
    id: `message:${to}`,
    from: "user",
    to,
    sessionId: "session-a",
    kind: "request",
    payload: { text: "hi" },
    createdAt: Date.now(),
  };
}

describe("AgentExecutor", () => {
  it("emits only elder chunks and updates CrystalBall", async () => {
    const messageBox = new MessageBox();
    const crystalBall = new CrystalBall();
    const chunks: AgentDriverChunk[] = [];
    const executor = new AgentExecutor({
      sessionId: "session-a",
      messageBox,
      crystalBall,
      onChunk: (chunk) => chunks.push(chunk),
      onStatus: () => {},
    });
    const elder = createMockAgent("elder", "elder");
    const worker = createMockAgent("worker", "worker");

    executor.register(elder);
    executor.register(worker);
    executor.dispatchToAgent(elder.id, createMessage(elder.id));
    executor.dispatchToAgent(worker.id, createMessage(worker.id));
    const running = executor.execute();
    await new Promise((resolve) => setTimeout(resolve, 100));
    executor.stopAllAgents();
    await running;

    expect(chunks).toEqual([{ type: "text_delta", text: "elder:hello" }, { type: "done" }]);
    expect(crystalBall.getSnapshot().find((agent) => agent.agentId === elder.id)?.status).toBe("completed");
    expect(crystalBall.getSnapshot().find((agent) => agent.agentId === worker.id)?.status).toBe("completed");
  });

  it("dispatches MessageBox subscription messages to channel-aware agents", async () => {
    const messageBox = new MessageBox();
    const channel = messageBox.createChannel({ sessionId: "session-a", endpointA: "elder", endpointB: "worker" });
    const crystalBall = new CrystalBall();
    const executor = new AgentExecutor({
      sessionId: "session-a",
      messageBox,
      crystalBall,
      onChunk: () => {},
      onStatus: () => {},
    });
    const worker = createMockAgent("worker", "worker", [channel.id]);

    executor.register(worker);
    const running = executor.execute();
    await messageBox.send(channel.id, "elder", createMessage(worker.id));
    await new Promise((resolve) => setTimeout(resolve, 100));
    executor.stopAllAgents();
    await running;

    expect(worker.driver.streamChat).toHaveBeenCalledTimes(1);
  });
});
