import { describe, expect, it, vi } from "vitest";
import { SessionChannel } from "../../session/session-channel.js";
import { HierarchyStrategy } from "../hierarchy-strategy.js";
import type { IStrategyExecutor } from "../strategy.js";
import { TaskStatus } from "../../task-board/task-status.js";

function createTask(taskId: string) {
  return {
    taskId,
    creatorAgentId: "elder",
    title: "根任务",
    description: "测试层级",
    status: TaskStatus.PENDING,
    progress: 0,
    createdAt: Date.now(),
  };
}

describe("HierarchyStrategy", () => {
  it("runs architect -> developer cascade and submits aggregated result", async () => {
    const channel = new SessionChannel("session-a");
    const strategy = new HierarchyStrategy();
    const executor: IStrategyExecutor = {
      sessionId: "session-a",
      recruitWorkers: vi.fn().mockResolvedValue([]),
      dispatchTask: vi.fn().mockResolvedValueOnce("architecture").mockResolvedValueOnce("implementation"),
      validateOutput: vi.fn().mockResolvedValue({ passed: true, feedback: "ok" }),
      submitToElder: vi.fn(),
    };

    strategy.init(channel, {}, executor);
    await strategy.dispatchTask(createTask("root"));
    const result = await strategy.collectResult("root");

    expect(executor.recruitWorkers).toHaveBeenCalledWith(["architect", "developer"]);
    expect(executor.dispatchTask).toHaveBeenCalledTimes(2);
    expect(executor.submitToElder).toHaveBeenCalled();
    expect(String(result)).toContain("层级汇总");
    expect(String(result)).toContain("architecture");
    expect(String(result)).toContain("implementation");

    strategy.destroy();
  });
});
