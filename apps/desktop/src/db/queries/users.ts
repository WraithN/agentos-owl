import type Database from "better-sqlite3";
import type { User } from "../types.js";

export function createUser(db: Database.Database, user: User): void {
  db.prepare(
    `INSERT INTO users (id, username, password_hash, display_name, avatar, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    user.id,
    user.username,
    user.passwordHash,
    user.displayName ?? null,
    user.avatar ?? null,
    user.createdAt,
    user.updatedAt
  );
}

export function getUserByUsername(
  db: Database.Database,
  username: string
): User | undefined {
  const row = db
    .prepare(
      `SELECT id, username, password_hash, display_name, avatar, created_at, updated_at
       FROM users WHERE username = ?`
    )
    .get(username) as Record<string, unknown> | undefined;
  return row ? mapUser(row) : undefined;
}

export function getUserById(
  db: Database.Database,
  id: string
): User | undefined {
  const row = db
    .prepare(
      `SELECT id, username, password_hash, display_name, avatar, created_at, updated_at
       FROM users WHERE id = ?`
    )
    .get(id) as Record<string, unknown> | undefined;
  return row ? mapUser(row) : undefined;
}

function mapUser(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    username: String(row.username),
    passwordHash: String(row.password_hash),
    displayName: row.display_name ? String(row.display_name) : undefined,
    avatar: row.avatar ? String(row.avatar) : undefined,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}
