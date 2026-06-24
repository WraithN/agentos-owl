import type Database from "better-sqlite3";
import * as queries from "../queries/index.js";
import type { KanbanTask } from "../types.js";
import { daysAgo } from "../../utils/time.js";

export function seedTasks(db: Database.Database): void {
  const count = db.prepare("SELECT COUNT(*) FROM kanban_tasks").pluck().get() as number;
  if (count > 0) return;

  const tasks: KanbanTask[] = [
    { id: "task-1", title: "用户漏斗数据分析报告", assigneeId: "analyst", status: "done", priority: "P0", dueDate: "2026-06-10", createdAt: daysAgo(14), updatedAt: daysAgo(5) },
    { id: "task-2", title: "竞品 UI 调研报告", assigneeId: "muse", status: "done", priority: "P1", dueDate: "2026-06-11", createdAt: daysAgo(14), updatedAt: daysAgo(4) },
    { id: "task-3", title: "手机验证优化方案", assigneeId: "coder", status: "in-progress", priority: "P0", dueDate: "2026-06-14", createdAt: daysAgo(10), updatedAt: daysAgo(1) },
    { id: "task-4", title: "渐进式注册原型设计", assigneeId: "muse", status: "in-progress", priority: "P1", dueDate: "2026-06-18", createdAt: daysAgo(8), updatedAt: daysAgo(2) },
    { id: "task-5", title: "项目总结文档", assigneeId: "aria", status: "review", priority: "P1", dueDate: "2026-06-20", createdAt: daysAgo(7), updatedAt: daysAgo(1) },
    { id: "task-6", title: "Push 通知策略优化", assigneeId: "analyst", status: "todo", priority: "P2", dueDate: "2026-07-05", createdAt: daysAgo(3), updatedAt: daysAgo(3) },
  ];

  for (const task of tasks) {
    queries.upsertTask(db, task);
  }
}
