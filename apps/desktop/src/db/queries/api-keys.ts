import type Database from "better-sqlite3";
import type { ApiKeyEntry } from "../types.js";

export function listApiKeys(db: Database.Database): ApiKeyEntry[] {
  const rows = db
    .prepare("SELECT id, provider, alias, encrypted_key, created_at FROM api_keys ORDER BY created_at")
    .all() as Record<string, unknown>[];
  return rows.map(mapApiKey);
}

export function upsertApiKey(db: Database.Database, key: ApiKeyEntry): void {
  db.prepare(
    `INSERT INTO api_keys (id, provider, alias, encrypted_key, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET provider = excluded.provider, alias = excluded.alias,
        encrypted_key = excluded.encrypted_key`
  ).run(key.id, key.provider, key.alias ?? null, key.encryptedKey ?? null, key.createdAt);
}

export function deleteApiKey(db: Database.Database, id: string): void {
  db.prepare("DELETE FROM api_keys WHERE id = ?").run(id);
}

function mapApiKey(row: Record<string, unknown>): ApiKeyEntry {
  return {
    id: String(row.id),
    provider: String(row.provider),
    alias: row.alias ? String(row.alias) : undefined,
    encryptedKey: row.encrypted_key ? String(row.encrypted_key) : undefined,
    createdAt: Number(row.created_at),
  };
}
