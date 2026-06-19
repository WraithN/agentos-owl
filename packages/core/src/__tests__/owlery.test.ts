import { describe, expect, it } from "vitest";
import {
  AgentFactory,
  AgentPool,
  CrystalBall,
  MessageBox,
  MockAgentDriver,
  Owlery,
  fixedNameGenerator,
  type AgentDriver,
  type AgentDriverChunk,
  type AgentDriverFactory,
  type AgentDriverInput,
  type AgentMessage,
  type BrainstormResult,
  type RecruitPlan,
} from "../index.js";

const driverFactory: AgentDriverFactory = () => new MockAgentDriver([{ type: "text_delta", text: "ok" }, { type: "done" }]);

function createFactory() {
  return new AgentFactory({ driverFactory, nameGenerator: fixedNameGenerator });
}

class DelayedDriver implements AgentDriver {
  constructor(private readonly chunks: AgentDriverChunk[], private readonly delayMs = 0) {}

  async *streamChat(_input: AgentDriverInput): AsyncIterable<AgentDriverChunk> {
    for (const chunk of this.chunks) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
      yield chunk;
    }
  }

  async send(_message: AgentMessage): Promise<void> {}

  async *receive(): AsyncIterable<AgentMessage> {}
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Owlery", () => {
  it("creates isolated session slots", () => {
    const owlery = new Owlery({ agentFactory: createFactory() });
    const slotA = owlery.getOrCreateSlot("session-a");
    const slotB = owlery.getOrCreateSlot("session-b");

    expect(slotA.sessionId).toBe("session-a");
    expect(slotB.sessionId).toBe("session-b");
    expect(slotA.elder.id).not.toBe(slotB.elder.id);
    expect(slotA.crystalBall).not.toBe(slotB.crystalBall);
  });

  it("respects user preferred teammate mode", async () => {
    const owlery = new Owlery({ agentFactory: createFactory(), modeEvaluator: async () => "pipeline" });
    const teammates = await owlery.recruitForSession({
      sessionId: "session-a",
      userPrompt: "用 brainstorm 模式想方案",
      userPreferredMode: "brainstorm",
      conversationContext: { messages: [] },
    });

    expect(teammates.mode).toBe("brainstorm");
  });

  it("falls back to evaluator mode", async () => {
    const owlery = new Owlery({ agentFactory: createFactory(), modeEvaluator: async () => "pipeline" });
    const teammates = await owlery.recruitForSession({
      sessionId: "session-a",
      userPrompt: "做一个页面",
      conversationContext: { messages: [] },
    });

    expect(teammates.mode).toBe("pipeline");
  });

  it("respects user preferred team spec", async () => {
    const owlery = new Owlery({ agentFactory: createFactory(), modeEvaluator: async () => "pipeline" });
    const teammates = await owlery.recruitForSession({
      sessionId: "session-a",
      userPrompt: "按我的团队来",
      conversationContext: { messages: [] },
      userPreferredTeam: {
        name: "自定义团队",
        mode: "hierarchy",
        agents: [
          { id: "main-sentinel", role: "sentinel", title: "cto", sentinelKind: "primary" },
          { id: "sub-sentinel", role: "sentinel", title: "planner", sentinelKind: "sub", parentSentinelId: "main-sentinel" },
          { id: "worker-a", role: "worker", title: "operator" },
        ],
      },
    });

    expect(teammates.name).toBe("自定义团队");
    expect(teammates.mode).toBe("hierarchy");
    expect(teammates.primarySentinelId).toBe("main-sentinel");
    expect(teammates.agentPool.listSubSentinels()).toHaveLength(1);
    expect(teammates.agentPool.listWorkers()).toHaveLength(1);
  });

  it("uses llm recruit plan when user does not specify team", async () => {
    const plan: RecruitPlan = {
      teammate: { id: "team-a", name: "LLM规划团队" },
      mode: "brainstorm",
      source: "llm",
      reason: "需要发散方案",
      primarySentinel: { id: "llm-sentinel", role: "sentinel", title: "supervisor", sentinelKind: "primary" },
      agents: [
        { id: "idea-worker", role: "worker", title: "planner" },
      ],
    };
    const owlery = new Owlery({ agentFactory: createFactory(), modeEvaluator: async () => plan });
    const teammates = await owlery.recruitForSession({
      sessionId: "session-a",
      userPrompt: "想几个方案",
      conversationContext: { messages: [] },
    });

    expect(teammates.name).toBe("LLM规划团队");
    expect(teammates.mode).toBe("brainstorm");
    expect(teammates.primarySentinelId).toBe("llm-sentinel");
    expect(teammates.agentPool.listWorkers()[0]?.id).toBe("idea-worker");
  });

  it("creates teammate metadata and lets primary sentinel recruit members", async () => {
    const factory = new AgentFactory({
      driverFactory,
      nameGenerator: fixedNameGenerator,
      toolFactory: ({ role }) => role === "sentinel" ? [{
        name: "recruit",
        description: "招募成员",
        execute: async (input) => [
          { id: `${input.teammateId}:worker:a`, role: "worker", title: "planner", parentSentinelId: input.parentAgentId },
          { id: `${input.teammateId}:worker:b`, role: "worker", title: "operator", parentSentinelId: input.parentAgentId },
        ],
      }] : [],
    });
    const owlery = new Owlery({ agentFactory: factory, modeEvaluator: async () => "supervisor" });
    const teammates = await owlery.recruitForSession({
      sessionId: "session-a",
      userPrompt: "组队完成任务",
      templateTeammateId: "template-a",
      conversationContext: { messages: [] },
    });

    expect(teammates.teammate.templateTeammateId).toBe("template-a");
    expect(teammates.name).toMatch(/^.{3,5}团队$/u);
    expect(teammates.agentPool.listSentinels()).toHaveLength(1);
    expect(teammates.agentPool.listWorkers().map((agent) => agent.id)).toEqual([`${teammates.id}:worker:a`, `${teammates.id}:worker:b`]);
  });

  it("runs brainstorm workers in fan-out and fan-in flow", async () => {
    const factory = new AgentFactory({
      driverFactory: ({ agentId }) => new MockAgentDriver([{ type: "text_delta", text: `方案来自${agentId}` }, { type: "done" }]),
      nameGenerator: fixedNameGenerator,
    });
    const owlery = new Owlery({ agentFactory: factory });
    const teammates = await owlery.recruitForSession({
      sessionId: "session-a",
      userPrompt: "给我三个方案",
      conversationContext: { messages: [] },
      userPreferredTeam: {
        mode: "brainstorm",
        agents: [
          { id: "primary", role: "sentinel", title: "supervisor", sentinelKind: "primary" },
          { id: "worker-1", role: "worker", title: "planner" },
          { id: "worker-2", role: "worker", title: "operator" },
          { id: "worker-3", role: "worker", title: "cto" },
        ],
      },
    });
    const result = await teammates.dispatch({
      id: "task-a",
      sessionId: "session-a",
      instruction: "生成候选方案",
      createdAt: 1,
    });
    const content = result.content as BrainstormResult;

    expect(content.mode).toBe("brainstorm");
    expect(content.ideas.map((idea) => idea.workerId)).toEqual(["worker-1", "worker-2", "worker-3"]);
    expect(content.summary).toContain("方案来自worker-1");
    expect(result.agentId).toBe("primary");
  });

  it("creates elder-primary-sentinel channel", async () => {
    const owlery = new Owlery({ agentFactory: createFactory() });
    const teammates = await owlery.recruitForSession({
      sessionId: "session-a",
      userPrompt: "做一个页面",
      conversationContext: { messages: [] },
    });
    const channel = owlery.messageBox.getChannel(teammates.elderPrimaryChannelId);

    expect(channel?.hasAgent(teammates.elderAgentId)).toBe(true);
    expect(channel?.hasAgent(teammates.primarySentinelId)).toBe(true);
  });

  it("keeps a single active session and moves previous session to background", () => {
    const owlery = new Owlery({ agentFactory: createFactory() });

    owlery.activateSession("session-a");
    owlery.activateSession("session-b");

    expect(owlery.getActiveSlot()?.sessionId).toBe("session-b");
    expect(owlery.getSlot("session-a")?.visibility).toBe("background");
    expect(owlery.listBackgroundSlots().map((slot) => slot.sessionId)).toContain("session-a");
  });

  it("buffers background session chunks without notifying subscribers", async () => {
    const factory = new AgentFactory({
      driverFactory: () => new DelayedDriver([{ type: "text_delta", text: "hidden" }, { type: "done" }], 5),
      nameGenerator: fixedNameGenerator,
    });
    const owlery = new Owlery({ agentFactory: factory });
    const visible: AgentDriverChunk[] = [];
    owlery.subscribeSession("session-a", (chunk) => visible.push(chunk));

    owlery.startChat({ sessionId: "session-a", userMessage: "run" });
    owlery.activateSession("session-b");
    await wait(50);

    expect(visible).toHaveLength(0);
    expect(owlery.getBufferedOutput("session-a")).toEqual([{ type: "text_delta", text: "hidden" }, { type: "done" }]);
    expect(owlery.getSlot("session-a")?.runStatus).toBe("completed");
  });

  it("chatLoop yields brainstorm aggregate when session has brainstorm teammates", async () => {
    const factory = new AgentFactory({
      driverFactory: ({ agentId }) => new MockAgentDriver([{ type: "text_delta", text: `${agentId}建议` }, { type: "done" }]),
      nameGenerator: fixedNameGenerator,
    });
    const owlery = new Owlery({ agentFactory: factory });
    await owlery.recruitForSession({
      sessionId: "session-a",
      userPrompt: "头脑风暴",
      conversationContext: { messages: [] },
      userPreferredTeam: {
        mode: "brainstorm",
        agents: [
          { id: "primary", role: "sentinel", title: "supervisor", sentinelKind: "primary" },
          { id: "worker-1", role: "worker", title: "planner" },
          { id: "worker-2", role: "worker", title: "operator" },
          { id: "worker-3", role: "worker", title: "cto" },
        ],
      },
    });
    const chunks: AgentDriverChunk[] = [];

    for await (const chunk of owlery.chatLoop({ sessionId: "session-a", userMessage: "给我方案" })) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual([{ type: "text_delta", text: "1. worker-1建议\n2. worker-2建议\n3. worker-3建议" }, { type: "done" }]);
  });

  it("chatLoop yields active session chunks", async () => {
    const factory = new AgentFactory({
      driverFactory: () => new DelayedDriver([{ type: "text_delta", text: "hello" }, { type: "done" }]),
      nameGenerator: fixedNameGenerator,
    });
    const owlery = new Owlery({ agentFactory: factory });
    const chunks: AgentDriverChunk[] = [];

    for await (const chunk of owlery.chatLoop({ sessionId: "session-a", userMessage: "hi" })) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual([{ type: "text_delta", text: "hello" }, { type: "done" }]);
    expect(owlery.getBufferedOutput("session-a")).toEqual(chunks);
  });
});

describe("MessageBox", () => {
  it("routes messages only between channel endpoints", async () => {
    const box = new MessageBox();
    const channel = box.createChannel({ sessionId: "s", endpointA: "elder", endpointB: "sentinel" });
    await box.send(channel.id, "elder", {
      id: "m1",
      from: "elder",
      to: "sentinel",
      sessionId: "s",
      kind: "request",
      payload: { hello: true },
      createdAt: 1,
    });

    const received = [];
    for await (const message of box.receive(channel.id, "sentinel")) received.push(message);

    expect(received).toHaveLength(1);
    expect(received[0]?.from).toBe("elder");
    await expect(box.send(channel.id, "worker", received[0]!)).rejects.toThrow("Sender is not a channel endpoint");
  });
});

describe("AgentPool", () => {
  it("supports primary sentinel, sub sentinels and workers", () => {
    const factory = createFactory();
    const primary = factory.createAgent({ id: "primary", sessionId: "s", role: "sentinel", title: "supervisor", sentinelKind: "primary" });
    const sub = factory.createAgent({ id: "sub", sessionId: "s", role: "sentinel", title: "planner", sentinelKind: "sub", parentSentinelId: "primary" });
    const worker = factory.createAgent({ id: "worker", sessionId: "s", role: "worker", title: "operator" });
    const pool = new AgentPool("primary");
    pool.addAgent(primary);
    pool.addAgent(sub);
    pool.addAgent(worker);

    expect(pool.getPrimarySentinel().id).toBe("primary");
    expect(pool.listSubSentinels()).toHaveLength(1);
    expect(pool.listWorkers()).toHaveLength(1);
  });
});

describe("CrystalBall", () => {
  it("tracks agent work status", () => {
    const factory = createFactory();
    const elder = factory.createAgent({ id: "elder", sessionId: "s", role: "elder", title: "boss" });
    const crystalBall = new CrystalBall();
    const snapshots = [];
    crystalBall.subscribe((snapshot) => snapshots.push(snapshot));

    crystalBall.registerAgent(elder);
    crystalBall.updateStatus(elder.id, "in_progress", "正在处理");
    crystalBall.updateStatus(elder.id, "completed");

    expect(crystalBall.getSnapshot()[0]?.status).toBe("completed");
    expect(snapshots.length).toBeGreaterThanOrEqual(3);
  });
});
