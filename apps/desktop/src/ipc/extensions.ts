import { ipcMain } from "electron";
import { getDatabase } from "../db/connection.js";
import * as queries from "../db/queries/index.js";
import type {
  Prompt,
  Skill,
  ToolCategory,
  ToolCategoryScope,
} from "../db/types.js";
import { nowMs, uuid } from "./_utils.js";

const VALID_SCOPES: ToolCategoryScope[] = ["skill", "prompt", "tool"];

function isScope(value: unknown): value is ToolCategoryScope {
  return (
    typeof value === "string" &&
    (VALID_SCOPES as string[]).includes(value)
  );
}

export function registerExtensionHandlers(): void {
  // ===== Skills =====
  ipcMain.handle("list_skills", () => queries.listSkills(getDatabase()));

  ipcMain.handle("get_skill", (_event, id: string) =>
    queries.getSkill(getDatabase(), id)
  );

  ipcMain.handle("save_skill", (_event, raw: Partial<Skill>): Skill => {
    const db = getDatabase();
    const now = nowMs();
    const skill: Skill = {
      id: raw.id ?? uuid(),
      name: raw.name ?? "未命名技能",
      description: raw.description ?? "",
      icon: raw.icon ?? "Zap",
      iconBg: raw.iconBg ?? "from-cyan-500 to-blue-600",
      stars: raw.stars ?? 5,
      installs: raw.installs ?? 0,
      official: raw.official ?? false,
      tags: raw.tags ?? [],
      createdAt: raw.createdAt ?? now,
      updatedAt: now,
    };
    queries.upsertSkill(db, skill);
    return skill;
  });

  ipcMain.handle("delete_skill", (_event, id: string) => {
    queries.deleteSkill(getDatabase(), id);
  });

  // ===== Prompts =====
  ipcMain.handle("list_prompts", () => queries.listPrompts(getDatabase()));

  ipcMain.handle("get_prompt", (_event, id: string) =>
    queries.getPrompt(getDatabase(), id)
  );

  ipcMain.handle("save_prompt", (_event, raw: Partial<Prompt>): Prompt => {
    const db = getDatabase();
    const now = nowMs();
    const prompt: Prompt = {
      id: raw.id ?? uuid(),
      name: raw.name ?? "未命名提示词",
      description: raw.description ?? "",
      content: raw.content ?? "",
      official: raw.official ?? false,
      isFavorite: raw.isFavorite ?? false,
      tags: raw.tags ?? [],
      createdAt: raw.createdAt ?? now,
      updatedAt: now,
    };
    queries.upsertPrompt(db, prompt);
    return prompt;
  });

  ipcMain.handle("delete_prompt", (_event, id: string) => {
    queries.deletePrompt(getDatabase(), id);
  });

  // ===== Extension Tags =====
  ipcMain.handle("list_extension_tags", (_event, scope?: string) => {
    const filter = isScope(scope) ? scope : undefined;
    return queries.listToolCategories(getDatabase(), filter);
  });
  ipcMain.handle("list_tool_categories", (_event, scope?: string) => {
    const filter = isScope(scope) ? scope : undefined;
    return queries.listToolCategories(getDatabase(), filter);
  });

  ipcMain.handle(
    "save_extension_tag",
    (_event, raw: Partial<ToolCategory>): ToolCategory => {
      const db = getDatabase();
      const scope: ToolCategoryScope = isScope(raw.scope) ? raw.scope : "tool";
      const cat: ToolCategory = {
        id: raw.id ?? uuid(),
        scope,
        name: raw.name ?? "未命名标签",
        sortOrder: raw.sortOrder ?? 0,
        createdAt: raw.createdAt ?? nowMs(),
      };
      queries.upsertToolCategory(db, cat);
      return cat;
    }
  );

  ipcMain.handle(
    "save_tool_category",
    (_event, raw: Partial<ToolCategory>): ToolCategory => {
      const db = getDatabase();
      const scope: ToolCategoryScope = isScope(raw.scope) ? raw.scope : "tool";
      const cat: ToolCategory = {
        id: raw.id ?? uuid(),
        scope,
        name: raw.name ?? "未命名标签",
        sortOrder: raw.sortOrder ?? 0,
        createdAt: raw.createdAt ?? nowMs(),
      };
      queries.upsertToolCategory(db, cat);
      return cat;
    }
  );

  ipcMain.handle("delete_extension_tag", (_event, id: string) => {
    queries.deleteToolCategory(getDatabase(), id);
  });
  ipcMain.handle("delete_tool_category", (_event, id: string) => {
    queries.deleteToolCategory(getDatabase(), id);
  });

  // ===== MarketTool 删除补全 =====
  ipcMain.handle("delete_market_tool", (_event, id: string) => {
    queries.deleteMarketTool(getDatabase(), id);
  });
}
