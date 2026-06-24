import type { Task } from "./task.js";
import { TaskStatus } from "./task-status.js";

/**
 * 会话级任务看板。
 * 统一管理会话内所有 Task 的增删改查，保证任务树状态一致性。
 * 后续由 SessionChannel 事件驱动更新，当前 Phase 1 先提供直接操作 API。
 */
export class TaskBoard {
  private readonly tasks = new Map<string, Task>();

  /**
   * 创建任务。若任务 ID 已存在则抛出异常。
   */
  createTask(task: Task): Task {
    if (this.tasks.has(task.taskId)) {
      throw new Error(`任务 ${task.taskId} 已存在`);
    }
    this.tasks.set(task.taskId, task);
    return task;
  }

  /**
   * 更新任务指定字段。若任务不存在则抛出异常。
   */
  updateTask(taskId: string, patch: Partial<Omit<Task, "taskId">>): Task {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`任务 ${taskId} 不存在`);
    }
    const updated = { ...task, ...patch };
    this.tasks.set(taskId, updated);
    return updated;
  }

  /**
   * 根据 ID 获取任务。
   */
  getTaskById(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * 获取指定父任务下的所有子任务。
   */
  getSubTasks(parentTaskId: string): Task[] {
    return [...this.tasks.values()].filter((task) => task.parentTaskId === parentTaskId);
  }

  /**
   * 获取所有根任务（无父任务）。
   */
  getRootTasks(): Task[] {
    return [...this.tasks.values()].filter((task) => !task.parentTaskId);
  }

  /**
   * 获取所有任务列表。
   */
  listTasks(): Task[] {
    return [...this.tasks.values()];
  }

  /**
   * 将任务标记为已完成。
   */
  completeTask(taskId: string, result?: unknown): Task {
    return this.updateTask(taskId, {
      status: TaskStatus.COMPLETED,
      progress: 100,
      result,
      finishedAt: Date.now(),
    });
  }

  /**
   * 将任务标记为失败。
   */
  failTask(taskId: string, result?: unknown): Task {
    return this.updateTask(taskId, {
      status: TaskStatus.FAILED,
      result,
      finishedAt: Date.now(),
    });
  }

  /**
   * 清空看板，通常用于会话销毁时释放资源。
   */
  clear(): void {
    this.tasks.clear();
  }
}
