import { describe, expect, it, vi } from "vitest";
import { SessionChannel } from "../../session/session-channel.js";
import { TaskStatus } from "../../task-board/task-status.js";
import { defaultStrategyRegistry } from "../strategy.js";
import type { Task } from "../../task-board/task.js";

function createTask(taskId: string): Task {
  return {
    taskId,
    creatorAgentId: "elder",
    title: "测试任务",
    description: "测试描述",
    status: TaskStatus.PENDING,
    progress: 0,
    createdAt: Date.now(),
  };
}

describe("StrategyRegistry", () => {
  it("registers all four modes by default", () => {
    expect(defaultStrategyRegistry.has("pipeline")).toBe(true);
    expect(defaultStrategyRegistry.has("brainstorm")).toBe(true);
    expect(defaultStrategyRegistry.has("supervisor")).toBe(true);
    expect(defaultStrategyRegistry.has("hierarchy")).toBe(true);
  });

  it("returns strategy instances with correct mode", () => {
    const pipeline = defaultStrategyRegistry.get("pipeline");
    expect(pipeline?.mode).toBe("pipeline");
  });

  it("strategies emit dispatch events via session channel", async () => {
    const strategy = defaultStrategyRegistry.get("pipeline");
    if (!strategy) throw new Error("strategy not found");

    const channel = new SessionChannel("session-a");
    const handler = vi.fn();
    channel.subscribe("task_event", handler);

    strategy.init(channel, {}, {
      sessionId: "session-a",
      recruitWorkers: async () => [],
      dispatchTask: async () => "",
      validateOutput: async () => ({ passed: true, feedback: "" }),
      submitToElder: () => {},
    });
    await strategy.dispatchTask(createTask("t1"));

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ type: "strategy_dispatch", taskId: "t1" }));
  });
});
