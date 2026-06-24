import { describe, expect, it, vi } from "vitest";
import { SessionChannel } from "../../session/session-channel.js";
import { PipelineStrategy } from "../pipeline-strategy.js";
import type { IStrategyExecutor } from "../strategy.js";
import { TaskStatus } from "../../task-board/task-status.js";

function createTask(taskId: string) {
  return {
    taskId,
    creatorAgentId: "elder",
    title: "根任务",
    description: "测试根任务",
    status: TaskStatus.PENDING,
    progress: 0,
    createdAt: Date.now(),
  };
}

describe("PipelineStrategy", () => {
  it("runs researcher -> writer pipeline and collects result", async () => {
    const channel = new SessionChannel("session-a");
    const strategy = new PipelineStrategy();
    const executor: IStrategyExecutor = {
      sessionId: "session-a",
      recruitWorkers: vi.fn().mockResolvedValue([]),
      dispatchTask: vi.fn().mockResolvedValueOnce("research-output").mockResolvedValueOnce("writer-output"),
      validateOutput: vi.fn().mockResolvedValue({ passed: true, feedback: "ok" }),
      submitToElder: vi.fn(),
    };

    strategy.init(channel, {}, executor);
    await strategy.dispatchTask(createTask("root"));
    const result = await strategy.collectResult("root");

    expect(executor.recruitWorkers).toHaveBeenCalledWith(["researcher", "writer"]);
    expect(executor.dispatchTask).toHaveBeenCalledTimes(2);
    expect(executor.submitToElder).toHaveBeenCalledWith("writer-output");
    expect(result).toBe("writer-output");

    strategy.destroy();
  });

  it("stops pipeline when validation fails", async () => {
    const channel = new SessionChannel("session-a");
    const strategy = new PipelineStrategy();
    const executor: IStrategyExecutor = {
      sessionId: "session-a",
      recruitWorkers: vi.fn().mockResolvedValue([]),
      dispatchTask: vi.fn().mockResolvedValueOnce("bad-output"),
      validateOutput: vi.fn().mockResolvedValue({ passed: false, feedback: "not enough detail" }),
      submitToElder: vi.fn(),
    };

    strategy.init(channel, {}, executor);
    await strategy.dispatchTask(createTask("root"));
    const result = await strategy.collectResult("root");

    expect(executor.dispatchTask).toHaveBeenCalledTimes(1);
    expect(executor.submitToElder).not.toHaveBeenCalled();
    expect(String(result)).toContain("校验未通过");

    strategy.destroy();
  });
});
