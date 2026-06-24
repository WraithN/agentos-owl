import { describe, expect, it, vi } from "vitest";
import { SessionChannel } from "../../session/session-channel.js";
import { BrainstormStrategy } from "../brainstorm-strategy.js";
import type { IStrategyExecutor } from "../strategy.js";
import { TaskStatus } from "../../task-board/task-status.js";

function createTask(taskId: string) {
  return {
    taskId,
    creatorAgentId: "elder",
    title: "根任务",
    description: "测试头脑风暴",
    status: TaskStatus.PENDING,
    progress: 0,
    createdAt: Date.now(),
  };
}

describe("BrainstormStrategy", () => {
  it("recruits default roles, dispatches in parallel and aggregates outputs", async () => {
    const channel = new SessionChannel("session-a");
    const strategy = new BrainstormStrategy();
    const executor: IStrategyExecutor = {
      sessionId: "session-a",
      recruitWorkers: vi.fn().mockResolvedValue([]),
      dispatchTask: vi.fn().mockResolvedValue("idea"),
      validateOutput: vi.fn().mockResolvedValue({ passed: true, feedback: "ok" }),
      submitToElder: vi.fn(),
    };

    strategy.init(channel, {}, executor);
    await strategy.dispatchTask(createTask("root"));
    const result = await strategy.collectResult("root");

    expect(executor.recruitWorkers).toHaveBeenCalledWith(["researcher", "writer", "analyst"]);
    expect(executor.dispatchTask).toHaveBeenCalledTimes(3);
    expect(executor.submitToElder).toHaveBeenCalled();
    expect(String(result)).toContain("头脑风暴汇总");

    strategy.destroy();
  });

  it("uses custom roles from config", async () => {
    const channel = new SessionChannel("session-a");
    const strategy = new BrainstormStrategy();
    const executor: IStrategyExecutor = {
      sessionId: "session-a",
      recruitWorkers: vi.fn().mockResolvedValue([]),
      dispatchTask: vi.fn().mockResolvedValue("idea"),
      validateOutput: vi.fn().mockResolvedValue({ passed: true, feedback: "ok" }),
      submitToElder: vi.fn(),
    };

    strategy.init(channel, { roles: ["designer", "marketer"] }, executor);
    await strategy.dispatchTask(createTask("root"));

    expect(executor.recruitWorkers).toHaveBeenCalledWith(["designer", "marketer"]);
    expect(executor.dispatchTask).toHaveBeenCalledTimes(2);

    strategy.destroy();
  });
});
