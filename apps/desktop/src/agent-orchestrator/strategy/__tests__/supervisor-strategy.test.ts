import { describe, expect, it, vi } from "vitest";
import { SessionChannel } from "../../session/session-channel.js";
import { SupervisorStrategy } from "../supervisor-strategy.js";
import type { IStrategyExecutor } from "../strategy.js";
import { TaskStatus } from "../../task-board/task-status.js";

function createTask(taskId: string) {
  return {
    taskId,
    creatorAgentId: "elder",
    title: "根任务",
    description: "测试监督者",
    status: TaskStatus.PENDING,
    progress: 0,
    createdAt: Date.now(),
  };
}

describe("SupervisorStrategy", () => {
  it("dispatches tasks to default workers and aggregates outputs", async () => {
    const channel = new SessionChannel("session-a");
    const strategy = new SupervisorStrategy();
    const executor: IStrategyExecutor = {
      sessionId: "session-a",
      recruitWorkers: vi.fn().mockResolvedValue([]),
      dispatchTask: vi.fn().mockResolvedValue("output"),
      validateOutput: vi.fn().mockResolvedValue({ passed: true, feedback: "ok" }),
      submitToElder: vi.fn(),
    };

    strategy.init(channel, {}, executor);
    await strategy.dispatchTask(createTask("root"));
    const result = await strategy.collectResult("root");

    expect(executor.recruitWorkers).toHaveBeenCalledWith(["developer", "tester"]);
    expect(executor.dispatchTask).toHaveBeenCalledTimes(2);
    expect(executor.submitToElder).toHaveBeenCalled();
    expect(String(result)).toContain("监督者汇总");

    strategy.destroy();
  });
});
