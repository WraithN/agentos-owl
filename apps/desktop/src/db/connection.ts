import Database from "better-sqlite3";
import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import { seedIfEmpty } from "./seed/index.js";

let db: Database.Database | null = null;

export function dbPath(): string {
  const dir = app.getPath("userData");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "owl_os.db");
}

export async function initDatabase(): Promise<Database.Database> {
  if (db) return db;

  const file = dbPath();
  db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  const schema = fs.readFileSync(
    path.join(__dirname, "../db/schema.sql"),
    "utf-8"
  );
  db.exec(schema);

  await seedIfEmpty(db);

  return db;
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error("数据库尚未初始化，请先调用 initDatabase()");
  }
  return db;
}
