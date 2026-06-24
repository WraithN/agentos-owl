import type Database from "better-sqlite3";
import type { MarketTool } from "../types.js";
import { fromJson, toJson } from "../../utils/json.js";

const selectColumns = `
  SELECT id, name, description, category, tool_type, icon, icon_bg, version, developer, rating,
         tags_json, installs, installed, needs_api_key, official, created_at, updated_at
  FROM market_tools
`;

export function listMarketTools(db: Database.Database): MarketTool[] {
  const rows = db
    .prepare(`${selectColumns} ORDER BY installs DESC`)
    .all() as Record<string, unknown>[];
  return rows.map(mapMarketTool);
}

export function upsertMarketTool(
  db: Database.Database,
  tool: MarketTool
): void {
  db.prepare(
    `INSERT INTO market_tools (id, name, description, category, tool_type, icon, icon_bg, version,
                               developer, rating, tags_json, installs, installed, needs_api_key, official,
                               created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, description = excluded.description, category = excluded.category,
        tool_type = excluded.tool_type, icon = excluded.icon, icon_bg = excluded.icon_bg,
        version = excluded.version, developer = excluded.developer, rating = excluded.rating,
        tags_json = excluded.tags_json, installs = excluded.installs, installed = excluded.installed,
        needs_api_key = excluded.needs_api_key, official = excluded.official, updated_at = excluded.updated_at`
  ).run(
    tool.id,
    tool.name,
    tool.description,
    tool.category,
    tool.toolType,
    tool.icon,
    tool.iconBg,
    tool.version,
    tool.developer,
    tool.rating,
    toJson(tool.tags),
    tool.installs,
    tool.installed ? 1 : 0,
    tool.needsApiKey ? 1 : 0,
    tool.official ? 1 : 0,
    tool.createdAt,
    tool.updatedAt
  );
}

export function deleteMarketTool(db: Database.Database, id: string): void {
  db.prepare("DELETE FROM market_tools WHERE id = ?").run(id);
}

function mapMarketTool(row: Record<string, unknown>): MarketTool {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description),
    category: String(row.category),
    toolType: String(row.tool_type),
    icon: String(row.icon),
    iconBg: String(row.icon_bg),
    version: String(row.version),
    developer: String(row.developer),
    rating: Number(row.rating),
    installs: Number(row.installs),
    tags: fromJson(String(row.tags_json), []),
    installed: Number(row.installed) !== 0,
    needsApiKey: Number(row.needs_api_key) !== 0,
    official: Number(row.official) !== 0,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}
