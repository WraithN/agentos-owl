import type Database from "better-sqlite3";
import type { Webhook } from "../types.js";
import { fromJson, toJson } from "./_json.js";

export function listWebhooks(db: Database.Database): Webhook[] {
  const rows = db
    .prepare(
      "SELECT id, name, url, active, event_types, created_at, updated_at FROM webhooks ORDER BY created_at"
    )
    .all() as Record<string, unknown>[];
  return rows.map(mapWebhook);
}

export function upsertWebhook(db: Database.Database, hook: Webhook): void {
  db.prepare(
    `INSERT INTO webhooks (id, name, url, active, event_types, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, url = excluded.url, active = excluded.active,
        event_types = excluded.event_types, updated_at = excluded.updated_at`
  ).run(
    hook.id,
    hook.name,
    hook.url,
    hook.active ? 1 : 0,
    toJson(hook.eventTypes),
    hook.createdAt,
    hook.updatedAt
  );
}

export function deleteWebhook(db: Database.Database, id: string): void {
  db.prepare("DELETE FROM webhooks WHERE id = ?").run(id);
}

function mapWebhook(row: Record<string, unknown>): Webhook {
  return {
    id: String(row.id),
    name: String(row.name),
    url: String(row.url),
    eventTypes: fromJson(String(row.event_types), []),
    active: Number(row.active) !== 0,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}
