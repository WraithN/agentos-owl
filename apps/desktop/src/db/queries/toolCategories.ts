import type Database from "better-sqlite3";
import type { ToolCategory, ToolCategoryScope } from "../types.js";

const selectColumns = `
  SELECT id, scope, name, sort_order, created_at
  FROM extension_tags
`;

export function listToolCategories(
  db: Database.Database,
  scope?: ToolCategoryScope
): ToolCategory[] {
  const rows = scope
    ? (db
        .prepare(
          `${selectColumns} WHERE scope = ? ORDER BY sort_order ASC, created_at ASC`
        )
        .all(scope) as Record<string, unknown>[])
    : (db
        .prepare(
          `${selectColumns} ORDER BY scope ASC, sort_order ASC, created_at ASC`
        )
        .all() as Record<string, unknown>[]);
  return rows.map(mapCategory);
}

export function upsertToolCategory(
  db: Database.Database,
  cat: ToolCategory
): void {
  db.prepare(
    `INSERT INTO extension_tags (id, scope, name, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
        scope = excluded.scope,
        name = excluded.name,
        sort_order = excluded.sort_order
     `
  ).run(cat.id, cat.scope, cat.name, cat.sortOrder, cat.createdAt);
}

export function deleteToolCategory(db: Database.Database, id: string): void {
  db.prepare("DELETE FROM extension_tags WHERE id = ?").run(id);
}

function mapCategory(row: Record<string, unknown>): ToolCategory {
  return {
    id: String(row.id),
    scope: String(row.scope) as ToolCategoryScope,
    name: String(row.name),
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: Number(row.created_at),
  };
}
