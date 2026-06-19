import type Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { setSecret } from "../secure.js";

/**
 * 增量迁移：仅对老库（缺字段或坏数据）做幂等修复。
 * 每次启动都会执行；新建库由 schema.sql 一次性建好，迁移点会全部跳过。
 */
export function runMigrations(db: Database.Database): void {
  ensureWorkflowColumns(db);
  purgeLegacyWorkflowData(db);
  ensureLogTables(db);
  ensureSessionLogDetailPath(db);
  purgeExpiredSessionLogs(db);
  ensureExtensionTables(db);
  normalizeMarketToolTypes(db);
  importDeepSeekConfig(db);
  purgeSeedConversations(db);
  purgeMockLogs(db);
  bumpSchemaVersion(db, 6);
}

/**
 * 清理旧版本注入的示例会话（用户增长方案、React 拖拽组件等）
 */
function purgeSeedConversations(db: Database.Database): void {
  const seedIds = ["conv-1", "conv-2", "conv-3", "conv-4"];
  for (const id of seedIds) {
    db.prepare("DELETE FROM conversations WHERE id = ?").run(id);
    db.prepare("DELETE FROM messages WHERE conversation_id = ?").run(id);
    db.prepare("DELETE FROM session_logs WHERE conversation_id = ?").run(id);
  }
}

/**
 * 清理所有 mock 日志数据（audit_logs 和 session_logs）
 */
function purgeMockLogs(db: Database.Database): void {
  db.prepare("DELETE FROM audit_logs WHERE id LIKE 'audit-%'").run();
  db.prepare("DELETE FROM session_logs WHERE id LIKE 'slog-%'").run();
}

/**
 * 老库可能没有 audit_logs / session_logs。schema.sql 中已用 IF NOT EXISTS 写好建表，
 * 但 schema.sql 仅在初始化时执行；为了让老库也具备这两张表，这里再做一次幂等保险。
 */
function ensureLogTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL,
      user_name TEXT NOT NULL DEFAULT '',
      action TEXT NOT NULL,
      detail TEXT NOT NULL DEFAULT '',
      ip TEXT NOT NULL DEFAULT '',
      result TEXT NOT NULL DEFAULT 'success'
    );
    CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

    CREATE TABLE IF NOT EXISTS session_logs (
      id TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL,
      conversation_id TEXT,
      conversation_title TEXT NOT NULL DEFAULT '',
      mode TEXT NOT NULL DEFAULT 'single',
      agent_name TEXT NOT NULL DEFAULT '',
      model TEXT NOT NULL DEFAULT '',
      event TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      tokens INTEGER NOT NULL DEFAULT 0,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'success'
    );
    CREATE INDEX IF NOT EXISTS idx_session_logs_timestamp ON session_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_session_logs_conversation ON session_logs(conversation_id);
  `);
}

function tableColumns(db: Database.Database, table: string): Set<string> {
  const rows = db
    .prepare(`PRAGMA table_info(${table})`)
    .all() as Array<{ name: string }>;
  return new Set(rows.map((r) => r.name));
}

function ensureSessionLogDetailPath(db: Database.Database): void {
  const cols = tableColumns(db, "session_logs");
  if (!cols.has("detail_path")) {
    db.exec("ALTER TABLE session_logs ADD COLUMN detail_path TEXT");
  }
}

function purgeExpiredSessionLogs(db: Database.Database): void {
  const expireBefore = Date.now() - 7 * 24 * 60 * 60 * 1000;
  db.prepare("DELETE FROM session_logs WHERE timestamp < ?").run(expireBefore);
}

function ensureWorkflowColumns(db: Database.Database): void {
  const cols = tableColumns(db, "workflow_templates");
  if (!cols.has("edges_json")) {
    db.exec(
      "ALTER TABLE workflow_templates ADD COLUMN edges_json TEXT NOT NULL DEFAULT '[]'"
    );
  }
  if (!cols.has("viewport_json")) {
    db.exec(
      `ALTER TABLE workflow_templates ADD COLUMN viewport_json TEXT NOT NULL DEFAULT '{"x":0,"y":0,"scale":1}'`
    );
  }
  if (!cols.has("updated_at")) {
    db.exec(
      "ALTER TABLE workflow_templates ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0"
    );
    db.exec(
      "UPDATE workflow_templates SET updated_at = created_at WHERE updated_at = 0"
    );
  }
}

/**
 * 旧库里的工作流 seed 数据是「运行时执行视图」结构（含 status/duration，无 x/y/config），
 * 与画布所需的 CanvasNode 不兼容，点开即崩。这里识别并删除这类记录，
 * 让 seedWorkflows 在下一次启动时按新结构重新写入。
 *
 * 判定条件：节点缺少 x 字段，或 type 在画布枚举之外。
 */
function purgeLegacyWorkflowData(db: Database.Database): void {
  const rows = db
    .prepare("SELECT id, nodes_json FROM workflow_templates")
    .all() as Array<{ id: string; nodes_json: string }>;

  const validTypes = new Set(["input", "agent", "tool", "condition", "output"]);
  const badIds: string[] = [];

  for (const row of rows) {
    let nodes: unknown[] = [];
    try {
      nodes = JSON.parse(row.nodes_json) as unknown[];
    } catch {
      badIds.push(row.id);
      continue;
    }
    if (!Array.isArray(nodes) || nodes.length === 0) continue;

    const isLegacy = nodes.some((n) => {
      if (!n || typeof n !== "object") return true;
      const node = n as Record<string, unknown>;
      if (typeof node.x !== "number" || typeof node.y !== "number") return true;
      if (typeof node.type !== "string" || !validTypes.has(node.type)) return true;
      return false;
    });

    if (isLegacy) badIds.push(row.id);
  }

  if (badIds.length === 0) return;

  const stmt = db.prepare("DELETE FROM workflow_templates WHERE id = ?");
  const tx = db.transaction((ids: string[]) => {
    for (const id of ids) stmt.run(id);
  });
  tx(badIds);
  console.log(
    `[db] purged ${badIds.length} legacy workflow record(s); seed will reinsert.`
  );
}

/**
 * 扩展模块（技能 / 提示词 / 标签）相关表的幂等创建，兼容老库。
 */
function ensureExtensionTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      icon TEXT NOT NULL DEFAULT 'Zap',
      icon_bg TEXT NOT NULL DEFAULT '',
      stars REAL NOT NULL DEFAULT 5,
      installs INTEGER NOT NULL DEFAULT 0,
      official INTEGER NOT NULL DEFAULT 0,
      tags_json TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);

    CREATE TABLE IF NOT EXISTS prompts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      official INTEGER NOT NULL DEFAULT 0,
      tags_json TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category);

    CREATE TABLE IF NOT EXISTS extension_tags (
      id TEXT PRIMARY KEY,
      scope TEXT NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      UNIQUE (scope, name)
    );
    CREATE INDEX IF NOT EXISTS idx_extension_tags_scope ON extension_tags(scope);
  `);

  const legacy = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get("tool_categories");
  if (legacy) {
    db.exec(`
      INSERT OR IGNORE INTO extension_tags (id, scope, name, sort_order, created_at)
      SELECT id, scope, name, sort_order, created_at FROM tool_categories;
    `);
  }
}

function normalizeMarketToolTypes(db: Database.Database): void {
  db.prepare("UPDATE market_tools SET tool_type = 'cli' WHERE tool_type = 'skill'").run();
}

/**
 * 自动从 opencode 配置导入 DeepSeek LLM 设置。
 * 仅执行一次：当 settings['llmModels'] 为空且 opencode 配置存在时。
 */
function importDeepSeekConfig(db: Database.Database): void {
  // 检查是否已有 LLM 配置，避免覆盖用户改动
  const existing = db
    .prepare("SELECT value FROM settings WHERE key = 'llmModels'")
    .get() as { value: string } | undefined;
  if (existing?.value) return;

  // 尝试读取 opencode 配置（优先级：~/.config/opencode/opencode.json > ~/.opencode.json）
  const configPaths = [
    path.join(os.homedir(), ".config", "opencode", "opencode.json"),
    path.join(os.homedir(), ".opencode.json"),
  ];
  let config: Record<string, unknown> | null = null;
  for (const p of configPaths) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, "utf-8");
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        if (parsed.provider && typeof parsed.provider === "object") {
          config = parsed;
          break;
        }
      }
    } catch {
      continue;
    }
  }
  if (!config || !config.provider) return;

  const providers = config.provider as Record<string, unknown>;
  const deepseek = providers.deepseek as Record<string, unknown> | undefined;
  if (!deepseek) return;

  const options = deepseek.options as Record<string, string> | undefined;
  const models = deepseek.models as Record<string, unknown> | undefined;
  if (!options?.baseURL || !options?.apiKey || !models) return;

  const baseUrl = options.baseURL;
  const apiKey = options.apiKey;
  const modelList = Object.keys(models);
  if (modelList.length === 0) return;

  // 构造 OwlOS LLM 模型元数据 - 使用 DeepSeek v4 官方模型名
  const llmModels = [
    {
      id: "deepseek-deepseek-v4-pro",
      name: "DeepSeek V4 Pro",
      baseUrl,
      provider: "deepseek",
      category: "llm",
      isDefault: true,
    },
    {
      id: "deepseek-deepseek-v4-flash",
      name: "DeepSeek V4 Flash",
      baseUrl,
      provider: "deepseek",
      category: "llm",
      isDefault: false,
    },
  ];

  // 写入 settings
  const now = Date.now();
  db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES ('llmModels', ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).run(JSON.stringify(llmModels), now);

  // 写入 API Key 到安全存储（第一个模型持有 key，多模型可复用）
  const defaultModel = llmModels[0];
  setSecret(`llm_model_key/${defaultModel.id}`, apiKey);

  console.log(
    `[db] imported ${llmModels.length} DeepSeek LLM model(s) from opencode config; default: ${defaultModel.name}`
  );
}

function bumpSchemaVersion(db: Database.Database, target: number): void {
  const row = db
    .prepare("SELECT MAX(version) AS v FROM schema_version")
    .get() as { v: number | null };
  const current = row.v ?? 0;
  if (current < target) {
    db.prepare("INSERT OR IGNORE INTO schema_version (version) VALUES (?)").run(
      target
    );
  }
}
