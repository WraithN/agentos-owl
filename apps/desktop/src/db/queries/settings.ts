import type Database from "better-sqlite3";

export function setSetting(
  db: Database.Database,
  key: string,
  value: string,
  now: number
): void {
  db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).run(key, value, now);
}

export function getSetting(
  db: Database.Database,
  key: string
): string | undefined {
  const row = db
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value;
}

export function listSettings(
  db: Database.Database
): Array<{ key: string; value: string }> {
  return db
    .prepare("SELECT key, value FROM settings")
    .all() as Array<{ key: string; value: string }>;
}
