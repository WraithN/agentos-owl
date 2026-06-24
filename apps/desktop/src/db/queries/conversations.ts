import type Database from "better-sqlite3";
import type { Conversation } from "../types.js";
import { fromJson, toJson } from "../../utils/json.js";

const selectColumns = `
  SELECT id, title, mode, teammate_mode, team_template_id, last_message, last_time, unread, agent_ids_json, agent_names_json, pinned, created_at, updated_at
  FROM conversations
`;

export function listConversations(db: Database.Database): Conversation[] {
  const rows = db
    .prepare(`${selectColumns} ORDER BY pinned DESC, last_time DESC`)
    .all() as Record<string, unknown>[];
  return rows.map(mapConversation);
}

export function getConversation(
  db: Database.Database,
  id: string
): Conversation | undefined {
  const row = db.prepare(`${selectColumns} WHERE id = ?`).get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? mapConversation(row) : undefined;
}

export function upsertConversation(
  db: Database.Database,
  conv: Conversation
): void {
  db.prepare(
    `INSERT INTO conversations (id, title, mode, teammate_mode, team_template_id, last_message, last_time, unread, agent_ids_json, agent_names_json, pinned, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
        title = excluded.title, mode = excluded.mode, teammate_mode = excluded.teammate_mode,
        team_template_id = excluded.team_template_id, last_message = excluded.last_message,
        last_time = excluded.last_time, unread = excluded.unread,
        agent_ids_json = excluded.agent_ids_json, agent_names_json = excluded.agent_names_json,
        pinned = excluded.pinned,
        updated_at = excluded.updated_at`
  ).run(
    conv.id,
    conv.title,
    conv.mode,
    conv.teammateMode ?? null,
    conv.teamTemplateId ?? null,
    conv.lastMessage,
    conv.lastTime,
    conv.unread,
    toJson(conv.agentIds ?? []),
    toJson(conv.agentNames ?? {}),
    conv.pinned ? 1 : 0,
    conv.createdAt,
    conv.updatedAt
  );
}

export function deleteConversation(db: Database.Database, id: string): void {
  db.prepare("DELETE FROM conversations WHERE id = ?").run(id);
}

export function getConversationAgentNames(
  db: Database.Database,
  id: string
): Record<string, string> {
  const row = db
    .prepare("SELECT agent_names_json FROM conversations WHERE id = ?")
    .get(id) as { agent_names_json?: string } | undefined;
  return fromJson(row?.agent_names_json, {});
}

export function updateConversationAgentNames(
  db: Database.Database,
  id: string,
  names: Record<string, string>
): void {
  db.prepare(
    "UPDATE conversations SET agent_names_json = ?, updated_at = ? WHERE id = ?"
  ).run(toJson(names), Date.now(), id);
}

function mapConversation(row: Record<string, unknown>): Conversation {
  return {
    id: String(row.id),
    title: String(row.title),
    mode: String(row.mode),
    teammateMode: row.teammate_mode ? String(row.teammate_mode) : undefined,
    teamTemplateId: row.team_template_id ? String(row.team_template_id) : undefined,
    lastMessage: String(row.last_message),
    lastTime: Number(row.last_time),
    unread: Number(row.unread),
    agentIds: fromJson(String(row.agent_ids_json), []),
    agentNames: fromJson(String(row.agent_names_json), {}),
    pinned: Number(row.pinned) !== 0,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}
