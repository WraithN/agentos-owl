import type Database from "better-sqlite3";
import type { Prompt } from "../types.js";
import { fromJson, toJson } from "./_json.js";

const selectColumns = `
  SELECT id, name, description, content, official, is_favorite, tags_json,
         created_at, updated_at
  FROM prompts
`;

function mapPrompt(row: Record<string, unknown>): Prompt {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description ?? ""),
    content: String(row.content ?? ""),
    official: Number(row.official) !== 0,
    isFavorite: Number(row.is_favorite) !== 0,
    tags: fromJson(String(row.tags_json ?? "[]"), []),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export function listPrompts(db: Database.Database): Prompt[] {
  const rows = db
    .prepare(`${selectColumns} ORDER BY created_at DESC`)
    .all() as Record<string, unknown>[];
  return rows.map(mapPrompt);
}

export function getPrompt(
  db: Database.Database,
  id: string
): Prompt | undefined {
  const row = db.prepare(`${selectColumns} WHERE id = ?`).get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? mapPrompt(row) : undefined;
}

export function upsertPrompt(db: Database.Database, prompt: Prompt): void {
  db.prepare(
    `INSERT INTO prompts (id, name, description, content, official, is_favorite,
                          tags_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, description = excluded.description,
        content = excluded.content, official = excluded.official, is_favorite = excluded.is_favorite,
        tags_json = excluded.tags_json, updated_at = excluded.updated_at`
  ).run(
    prompt.id,
    prompt.name,
    prompt.description,
    prompt.content,
    prompt.official ? 1 : 0,
    prompt.isFavorite ? 1 : 0,
    toJson(prompt.tags),
    prompt.createdAt,
    prompt.updatedAt
  );
}

export function deletePrompt(db: Database.Database, id: string): void {
  db.prepare("DELETE FROM prompts WHERE id = ?").run(id);
}
