import type Database from "better-sqlite3";
import type { Agent } from "../types.js";
import { fromJson, toJson } from "./_json.js";

const selectColumns = `
  SELECT id, name, role, description, avatar, color, bg_color, text_color, border_color,
         tools_json, capabilities_json, model, trigger_rule, status, enabled, created_at, updated_at
  FROM agents
`;

export function listAgents(db: Database.Database): Agent[] {
  const rows = db.prepare(`${selectColumns} ORDER BY created_at`).all() as Record<string, unknown>[];
  return rows.map(mapAgent);
}

export function getAgent(
  db: Database.Database,
  id: string
): Agent | undefined {
  const row = db.prepare(`${selectColumns} WHERE id = ?`).get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? mapAgent(row) : undefined;
}

export function upsertAgent(db: Database.Database, agent: Agent): void {
  db.prepare(
    `INSERT INTO agents (id, name, role, description, avatar, color, bg_color, text_color, border_color,
                         tools_json, capabilities_json, model, trigger_rule, status, enabled, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, role = excluded.role, description = excluded.description,
        avatar = excluded.avatar, color = excluded.color, bg_color = excluded.bg_color,
        text_color = excluded.text_color, border_color = excluded.border_color,
        tools_json = excluded.tools_json, capabilities_json = excluded.capabilities_json,
        model = excluded.model, trigger_rule = excluded.trigger_rule, status = excluded.status,
        enabled = excluded.enabled, updated_at = excluded.updated_at`
  ).run(
    agent.id,
    agent.name,
    agent.role,
    agent.description,
    agent.avatar,
    agent.color,
    agent.bgColor,
    agent.textColor,
    agent.borderColor,
    toJson(agent.tools),
    toJson(agent.capabilities),
    agent.model,
    agent.triggerRule,
    agent.status,
    agent.enabled ? 1 : 0,
    agent.createdAt,
    agent.updatedAt
  );
}

export function deleteAgent(db: Database.Database, id: string): void {
  db.prepare("DELETE FROM agents WHERE id = ?").run(id);
}

function mapAgent(row: Record<string, unknown>): Agent {
  return {
    id: String(row.id),
    name: String(row.name),
    role: String(row.role),
    description: String(row.description),
    avatar: String(row.avatar),
    color: String(row.color),
    bgColor: String(row.bg_color),
    textColor: String(row.text_color),
    borderColor: String(row.border_color),
    tools: fromJson(String(row.tools_json), []),
    capabilities: fromJson(String(row.capabilities_json), []),
    model: String(row.model),
    triggerRule: String(row.trigger_rule),
    status: String(row.status),
    enabled: Number(row.enabled) !== 0,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}
