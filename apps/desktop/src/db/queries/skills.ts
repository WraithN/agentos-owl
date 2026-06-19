import type Database from "better-sqlite3";
import type { Skill } from "../types.js";
import { fromJson, toJson } from "./_json.js";

const selectColumns = `
  SELECT id, name, category, description, icon, icon_bg, stars, installs,
         official, tags_json, created_at, updated_at
  FROM skills
`;

export function listSkills(db: Database.Database): Skill[] {
  const rows = db
    .prepare(`${selectColumns} ORDER BY installs DESC, created_at DESC`)
    .all() as Record<string, unknown>[];
  return rows.map(mapSkill);
}

export function getSkill(db: Database.Database, id: string): Skill | undefined {
  const row = db.prepare(`${selectColumns} WHERE id = ?`).get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? mapSkill(row) : undefined;
}

export function upsertSkill(db: Database.Database, skill: Skill): void {
  db.prepare(
    `INSERT INTO skills (id, name, category, description, icon, icon_bg, stars,
                          installs, official, tags_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, category = excluded.category, description = excluded.description,
        icon = excluded.icon, icon_bg = excluded.icon_bg, stars = excluded.stars,
        installs = excluded.installs, official = excluded.official,
        tags_json = excluded.tags_json, updated_at = excluded.updated_at`
  ).run(
    skill.id,
    skill.name,
    skill.category,
    skill.description,
    skill.icon,
    skill.iconBg,
    skill.stars,
    skill.installs,
    skill.official ? 1 : 0,
    toJson(skill.tags),
    skill.createdAt,
    skill.updatedAt
  );
}

export function deleteSkill(db: Database.Database, id: string): void {
  db.prepare("DELETE FROM skills WHERE id = ?").run(id);
}

function mapSkill(row: Record<string, unknown>): Skill {
  return {
    id: String(row.id),
    name: String(row.name),
    category: String(row.category ?? ""),
    description: String(row.description ?? ""),
    icon: String(row.icon ?? "Zap"),
    iconBg: String(row.icon_bg ?? ""),
    stars: Number(row.stars ?? 0),
    installs: Number(row.installs ?? 0),
    official: Number(row.official) !== 0,
    tags: fromJson(String(row.tags_json ?? "[]"), []),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}
