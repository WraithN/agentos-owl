import type Database from "better-sqlite3";
import type { WorkflowTemplate } from "../types.js";
import { fromJson, toJson } from "../../utils/json.js";

const DEFAULT_VIEWPORT = { x: 0, y: 0, scale: 1 };

const SELECT_COLUMNS = `
  SELECT id, name, description,
         nodes_json, edges_json, viewport_json,
         created_at, updated_at, last_run
  FROM workflow_templates
`;

export function listWorkflows(db: Database.Database): WorkflowTemplate[] {
  const rows = db
    .prepare(`${SELECT_COLUMNS} ORDER BY updated_at DESC, created_at DESC`)
    .all() as Record<string, unknown>[];
  return rows.map(mapWorkflow);
}

export function upsertWorkflow(
  db: Database.Database,
  wf: WorkflowTemplate
): void {
  db.prepare(
    `INSERT INTO workflow_templates
       (id, name, description, nodes_json, edges_json, viewport_json,
        created_at, updated_at, last_run)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
        name          = excluded.name,
        description   = excluded.description,
        nodes_json    = excluded.nodes_json,
        edges_json    = excluded.edges_json,
        viewport_json = excluded.viewport_json,
        updated_at    = excluded.updated_at,
        last_run      = excluded.last_run`
  ).run(
    wf.id,
    wf.name,
    wf.description,
    toJson(wf.nodes),
    toJson(wf.edges),
    toJson(wf.viewport ?? DEFAULT_VIEWPORT),
    wf.createdAt,
    wf.updatedAt,
    wf.lastRun ?? null
  );
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
    edges: fromJson(String(row.edges_json ?? "[]"), []),
    viewport: fromJson(
      String(row.viewport_json ?? ""),
      DEFAULT_VIEWPORT
    ),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at ?? row.created_at ?? 0),
    lastRun: row.last_run ? Number(row.last_run) : undefined,
  };
}
