import type Database from "better-sqlite3";

export function seedAuditLogs(_db: Database.Database): void {
  // 不再注入 mock 日志 - 由 AuditLogger 类实时记录真实操作
}
