import Database from "better-sqlite3";
import { app } from "electron";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { seedIfEmpty } from "./seed/index.js";
import { runMigrations } from "./migrations.js";
import { purgeExpiredConversationDetails } from "../services/ConversationDetailStore.js";

let db: Database.Database | null = null;

/**
 * 应用数据根目录：固定为 ~/.config/owl-os/，与 Electron 默认 userData 解耦，
 * 避免不同 dev/打包名下产生多个 .db。
 */
function userDataDir(): string {
  const dir = path.join(os.homedir(), ".config", "owl-os");
  fs.mkdirSync(dir, { recursive: true });
  // 同步 Electron 的 userData 路径，让 cookies / cache 等也落到同一根目录
  try {
    app.setPath("userData", dir);
  } catch {
    // 早于 ready 调用时 setPath 可能抛错，忽略
  }
  return dir;
}

/** 数据库目录：~/.config/owl-os/db/ */
function dbDir(): string {
  const dir = path.join(userDataDir(), "db");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function dbPath(): string {
  return path.join(dbDir(), "owl_os.db");
}

/**
 * 一次性把老的 ~/.config/Electron/owl_os.db* 挪到新位置。
 * - 仅在新位置不存在、且老位置有文件时执行
 * - 包含 -shm 与 -wal 边车文件，保证 WAL 模式下数据完整
 */
function migrateLegacyDbLocation(targetFile: string): void {
  if (fs.existsSync(targetFile)) return;
  const legacyFile = path.join(
    os.homedir(),
    ".config",
    "Electron",
    "owl_os.db"
  );
  if (!fs.existsSync(legacyFile)) return;

  for (const suffix of ["", "-shm", "-wal"]) {
    const src = legacyFile + suffix;
    const dst = targetFile + suffix;
    if (fs.existsSync(src)) {
      try {
        fs.renameSync(src, dst);
      } catch {
        // 跨文件系统时 rename 会失败，回退为复制 + 删除
        fs.copyFileSync(src, dst);
        fs.unlinkSync(src);
      }
    }
  }
  console.log(`[db] migrated legacy database from ${legacyFile} to ${targetFile}`);
}

export async function initDatabase(): Promise<Database.Database> {
  if (db) return db;

  const file = dbPath();
  migrateLegacyDbLocation(file);

  db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  const schema = fs.readFileSync(
    path.join(__dirname, "../db/schema.sql"),
    "utf-8"
  );
  db.exec(schema);

  // 增量迁移：兼容老库
  runMigrations(db);

  await seedIfEmpty(db);
  purgeExpiredConversationDetails();

  return db;
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error("数据库尚未初始化，请先调用 initDatabase()");
  }
  return db;
}
