import { describe, expect, it, vi } from "vitest";
import type { AgentDriverChunk, AgentDriverInput, AgentMessage, AgentRuntime, AgentTask } from "@owl-os/core";
import { MessageBox } from "@owl-os/core";
import { ElderAgentRunner } from "../elder-agent-runner.js";
import { SessionChannel } from "../../session/session-channel.js";
import { PeerChannel } from ".././channel/peer-channel.js";
import type { SentinelAgentRunner } from "../sentinel-agent-runner.js";

function createMockAgent(id: string, role: "elder" | "sentinel" | "worker", title: string): AgentRuntime {
  let reviewCount = 0;
  return {
    id,
    role,
    title,
    name: title,
    locale: "zh-CN",
    tools: [],
    driver: {
      streamChat: vi.fn(async function* (input: AgentDriverInput): AsyncIterable<AgentDriverChunk> {
        const prompt = String((input.messages[0]?.payload as Record<string, unknown> | undefined)?.text ?? "");

        if (prompt.includes("是否需要调用专业Agent团队")) {
          const userInstruction = prompt.split("\n").pop() ?? "";
          if (userInstruction === "hello") {
            yield { type: "text_delta", text: "你好，有什么可以帮您？" };
            yield { type: "done" };
            return;
          }
          yield {
            type: "tool_event",
            event: { toolName: "recruit_sentinel", args: { title: "planner" } },
          };
          yield { type: "text_delta", text: "该任务需要多步骤专业处理，已转交团队。" };
          yield { type: "done" };
          return;
        }

        if (prompt.includes("最终评审")) {
          reviewCount += 1;
          if (reviewCount === 1) {
            yield { type: "text_delta", text: "[[评审：不满足，修改意见：增加细节]]" };
          } else {
            yield { type: "text_delta", text: "[[评审：满足]]\n\n最终版本" };
          }
          yield { type: "done" };
          return;
        }

        yield { type: "text_delta", text: "ok" };
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
    instruction: "write a report",
    context,
    createdAt: Date.now(),
  };
}

describe("ElderAgentRunner", () => {
  it("recruits sentinel and delegates task when Elder decides team is needed", async () => {
    const sessionChannel = new SessionChannel("session-a");
    const messageBox = new MessageBox();
    const elderAgent = createMockAgent("elder-1", "elder", "boss");

    const mockSentinel = {
      id: "sentinel-planner",
      runStrategy: vi.fn().mockResolvedValue("draft-output"),
      parentChannel: new PeerChannel(messageBox, "ch-elder-sentinel", "session-a", "sentinel-planner", elderAgent.id),
    } as unknown as SentinelAgentRunner;

    const outputs: unknown[] = [];
    sessionChannel.subscribe("output", (payload) => outputs.push(payload));

    const runner = new ElderAgentRunner(elderAgent, sessionChannel, {
      createSentinel: () => mockSentinel,
      postEvent: () => {},
    });
    runner.start();

    runner.enqueueTask(createTask("root"));

    await new Promise((resolve) => setTimeout(resolve, 120));

    expect(mockSentinel.runStrategy).toHaveBeenCalledTimes(2);
    expect(outputs.length).toBeGreaterThan(0);

    runner.destroy();
  });

  it("handles simple task directly when Elder decides no team is needed", async () => {
    const sessionChannel = new SessionChannel("session-a");
    const elderAgent = createMockAgent("elder-1", "elder", "boss");

    const createSentinel = vi.fn();

    const outputs: unknown[] = [];
    sessionChannel.subscribe("output", (payload) => outputs.push(payload));

    const runner = new ElderAgentRunner(elderAgent, sessionChannel, {
      createSentinel,
      postEvent: () => {},
    });
    runner.start();

    // 使用一个明显是简单问候的 instruction，mock agent 对非路由 prompt 返回 ok
    runner.enqueueTask({ ...createTask("root"), instruction: "hello" });

    await new Promise((resolve) => setTimeout(resolve, 120));

    expect(createSentinel).not.toHaveBeenCalled();
    expect(outputs.length).toBeGreaterThan(0);

    runner.destroy();
  });
});
