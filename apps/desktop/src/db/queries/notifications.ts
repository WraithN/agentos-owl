import type Database from "better-sqlite3";
import type { Notification } from "../types.js";

const selectColumns = `
  SELECT id, title, content, notif_type, read, timestamp
  FROM notifications
`;

export function listNotifications(db: Database.Database): Notification[] {
  const rows = db
    .prepare(`${selectColumns} ORDER BY timestamp DESC`)
    .all() as Record<string, unknown>[];
  return rows.map(mapNotification);
}

export function upsertNotification(
  db: Database.Database,
  n: Notification
): void {
  const timestamp = n.timestamp instanceof Date ? n.timestamp.getTime() : n.timestamp;
  db.prepare(
    `INSERT INTO notifications (id, title, content, notif_type, read, timestamp)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
        title = excluded.title, content = excluded.content, notif_type = excluded.notif_type,
        read = excluded.read`
  ).run(n.id, n.title, n.content, n.type, n.read ? 1 : 0, timestamp);
}

export function deleteNotification(db: Database.Database, id: string): void {
  db.prepare("DELETE FROM notifications WHERE id = ?").run(id);
}

export function markNotificationRead(
  db: Database.Database,
  id: string
): void {
  db.prepare("UPDATE notifications SET read = 1 WHERE id = ?").run(id);
}

function mapNotification(row: Record<string, unknown>): Notification {
  return {
    id: String(row.id),
    title: String(row.title),
    content: String(row.content),
    type: String(row.notif_type) as 'info' | 'success' | 'warning' | 'error',
    read: Number(row.read) !== 0,
    timestamp: new Date(Number(row.timestamp)),
  };
}
