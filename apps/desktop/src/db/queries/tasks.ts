import type Database from "better-sqlite3";
import type { KanbanTask } from "../types.js";

const selectColumns = `
  SELECT id, title, assignee_id, status, priority, due_date, description, created_at, updated_at
  FROM kanban_tasks
`;

export function listTasks(db: Database.Database): KanbanTask[] {
  const rows = db
    .prepare(`${selectColumns} ORDER BY created_at`)
    .all() as Record<string, unknown>[];
  return rows.map(mapTask);
}

export function upsertTask(db: Database.Database, task: KanbanTask): void {
  db.prepare(
    `INSERT INTO kanban_tasks (id, title, assignee_id, status, priority, due_date, description, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
        title = excluded.title, assignee_id = excluded.assignee_id, status = excluded.status,
        priority = excluded.priority, due_date = excluded.due_date, description = excluded.description,
        updated_at = excluded.updated_at`
  ).run(
    task.id,
    task.title,
    task.assigneeId,
    task.status,
    task.priority,
    task.dueDate ?? null,
    task.description ?? null,
    task.createdAt,
    task.updatedAt
  );
}

export function deleteTask(db: Database.Database, id: string): void {
  db.prepare("DELETE FROM kanban_tasks WHERE id = ?").run(id);
}

function mapTask(row: Record<string, unknown>): KanbanTask {
  return {
    id: String(row.id),
    title: String(row.title),
    assigneeId: String(row.assignee_id),
    status: String(row.status),
    priority: String(row.priority),
    dueDate: row.due_date ? String(row.due_date) : undefined,
    description: row.description ? String(row.description) : undefined,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}
