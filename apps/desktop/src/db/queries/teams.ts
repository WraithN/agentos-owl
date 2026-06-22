import type Database from "better-sqlite3";
import type { TeamTemplate } from "../types.js";
import { fromJson, toJson } from "./_json.js";

const selectColumns = `
  SELECT id, name, description, member_ids_json, coordinator_id, trigger_rule, mode, enabled, created_at, updated_at
  FROM team_templates
`;

export function listTeams(db: Database.Database): TeamTemplate[] {
  const rows = db
    .prepare(`${selectColumns} ORDER BY created_at`)
    .all() as Record<string, unknown>[];
  return rows.map(mapTeam);
}

export function getTeam(db: Database.Database, id: string): TeamTemplate | undefined {
  const row = db.prepare(`${selectColumns} WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  return row ? mapTeam(row) : undefined;
}

export function upsertTeam(db: Database.Database, team: TeamTemplate): void {
  db.prepare(
    `INSERT INTO team_templates (id, name, description, member_ids_json, coordinator_id, trigger_rule,
                                 mode, enabled, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, description = excluded.description, member_ids_json = excluded.member_ids_json,
        coordinator_id = excluded.coordinator_id, trigger_rule = excluded.trigger_rule, mode = excluded.mode,
        enabled = excluded.enabled, updated_at = excluded.updated_at`
  ).run(
    team.id,
    team.name,
    team.description,
    toJson(team.memberIds),
    team.coordinatorId,
    team.triggerRule,
    team.mode,
    team.enabled ? 1 : 0,
    team.createdAt,
    team.updatedAt
  );
}

export function deleteTeam(db: Database.Database, id: string): void {
  db.prepare("DELETE FROM team_templates WHERE id = ?").run(id);
}

function mapTeam(row: Record<string, unknown>): TeamTemplate {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description),
    memberIds: fromJson(String(row.member_ids_json), []),
    coordinatorId: String(row.coordinator_id),
    triggerRule: String(row.trigger_rule),
    mode: String(row.mode),
    enabled: Number(row.enabled) !== 0,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}
