import type Database from "better-sqlite3";
import type { WorkflowTemplate } from "../types.js";
import { fromJson, toJson } from "./_json.js";

const selectColumns = `
  SELECT id, name, description, nodes_json, created_at, last_run
  FROM workflow_templates
`;

export function listWorkflows(db: Database.Database): WorkflowTemplate[] {
  const rows = db
    .prepare(`${selectColumns} ORDER BY created_at`)
    .all() as Record<string, unknown>[];
  return rows.map(mapWorkflow);
}

export function upsertWorkflow(
  db: Database.Database,
  wf: WorkflowTemplate
): void {
  db.prepare(
    `INSERT INTO workflow_templates (id, name, description, nodes_json, created_at, last_run)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, description = excluded.description, nodes_json = excluded.nodes_json,
        last_run = excluded.last_run`
  ).run(wf.id, wf.name, wf.description, toJson(wf.nodes), wf.createdAt, wf.lastRun ?? null);
}

export function deleteWorkflow(db: Database.Database, id: string): void {
  db.prepare("DELETE FROM workflow_templates WHERE id = ?").run(id);
}

function mapWorkflow(row: Record<string, unknown>): WorkflowTemplate {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description),
    nodes: fromJson(String(row.nodes_json), []),
    createdAt: Number(row.created_at),
    lastRun: row.last_run ? Number(row.last_run) : undefined,
  };
}
