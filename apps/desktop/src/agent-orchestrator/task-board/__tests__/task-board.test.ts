import { describe, expect, it } from "vitest";
import { TaskBoard } from "../task-board.js";
import { TaskStatus } from "../task-status.js";
import type { Task } from "../task.js";

function createTask(taskId: string, overrides: Partial<Task> = {}): Task {
  return {
    taskId,
    creatorAgentId: "elder",
    title: "测试任务",
    description: "测试描述",
    status: TaskStatus.PENDING,
    progress: 0,
    createdAt: Date.now(),
    ...overrides,
  };
}

describe("TaskBoard", () => {
  it("creates and retrieves tasks", () => {
    const board = new TaskBoard();
    const task = createTask("t1");
    board.createTask(task);
    expect(board.getTaskById("t1")?.taskId).toBe("t1");
  });

  it("throws when creating duplicate task", () => {
    const board = new TaskBoard();
    board.createTask(createTask("t1"));
    expect(() => board.createTask(createTask("t1"))).toThrow("已存在");
  });

  it("updates task fields", () => {
    const board = new TaskBoard();
    board.createTask(createTask("t1"));
    const updated = board.updateTask("t1", { status: TaskStatus.RUNNING, progress: 50 });
    expect(updated.status).toBe(TaskStatus.RUNNING);
    expect(updated.progress).toBe(50);
  });

  it("returns sub tasks by parent", () => {
    const board = new TaskBoard();
    board.createTask(createTask("root"));
    board.createTask(createTask("child1", { parentTaskId: "root" }));
    board.createTask(createTask("child2", { parentTaskId: "root" }));
    expect(board.getSubTasks("root").length).toBe(2);
    expect(board.getRootTasks().length).toBe(1);
  });

  it("completes and fails tasks", () => {
    const board = new TaskBoard();
    board.createTask(createTask("t1"));
    const completed = board.completeTask("t1", "done");
    expect(completed.status).toBe(TaskStatus.COMPLETED);
    expect(completed.progress).toBe(100);
    expect(completed.result).toBe("done");

    board.createTask(createTask("t2"));
    const failed = board.failTask("t2", "error");
    expect(failed.status).toBe(TaskStatus.FAILED);
    expect(failed.result).toBe("error");
  });
});
