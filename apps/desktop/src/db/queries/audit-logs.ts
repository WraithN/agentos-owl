import type Database from "better-sqlite3";
import type { AuditLog, SessionLog } from "../types.js";

// ===== 操作日志 =====

const auditColumns = `
  SELECT id, timestamp, user_name, action, detail, ip, result
  FROM audit_logs
`;

export function listAuditLogs(
  db: Database.Database,
  limit = 500
): AuditLog[] {
  const rows = db
    .prepare(`${auditColumns} ORDER BY timestamp DESC LIMIT ?`)
    .all(limit) as Record<string, unknown>[];
  return rows.map(mapAuditLog);
}

export function insertAuditLog(db: Database.Database, log: AuditLog): void {
  db.prepare(
    `INSERT INTO audit_logs (id, timestamp, user_name, action, detail, ip, result)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    log.id,
    log.timestamp,
    log.userName,
    log.action,
    log.detail,
    log.ip,
    log.result
  );
}

export function clearAuditLogs(db: Database.Database): void {
  db.prepare("DELETE FROM audit_logs").run();
}

function mapAuditLog(row: Record<string, unknown>): AuditLog {
  return {
    id: String(row.id),
    timestamp: Number(row.timestamp),
    userName: String(row.user_name ?? ""),
    action: String(row.action ?? ""),
    detail: String(row.detail ?? ""),
    ip: String(row.ip ?? ""),
    result: String(row.result ?? "success"),
  };
}

// ===== 会话日志 =====

const sessionColumns = `
  SELECT id, timestamp, conversation_id, conversation_title, detail_path, mode,
         agent_name, model, event, summary, tokens, duration_ms, status
  FROM session_logs
`;

export function listSessionLogs(
  db: Database.Database,
  limit = 500
): SessionLog[] {
  const expireBefore = Date.now() - 7 * 24 * 60 * 60 * 1000;
  db.prepare("DELETE FROM session_logs WHERE timestamp < ?").run(expireBefore);
  const rows = db
    .prepare(`${sessionColumns} WHERE timestamp >= ? ORDER BY timestamp DESC LIMIT ?`)
    .all(expireBefore, limit) as Record<string, unknown>[];
  return rows.map(mapSessionLog);
}

export function insertSessionLog(
  db: Database.Database,
  log: SessionLog
): void {
  db.prepare(
    `INSERT INTO session_logs (
        id, timestamp, conversation_id, conversation_title, detail_path, mode,
        agent_name, model, event, summary, tokens, duration_ms, status
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    log.id,
    log.timestamp,
    log.conversationId ?? null,
    log.conversationTitle,
    log.detailPath ?? null,
    log.mode,
    log.agentName,
    log.model,
    log.event,
    log.summary,
    log.tokens,
    log.durationMs,
    log.status
  );
}

export function clearSessionLogs(db: Database.Database): void {
  db.prepare("DELETE FROM session_logs").run();
}

function mapSessionLog(row: Record<string, unknown>): SessionLog {
  return {
    id: String(row.id),
    timestamp: Number(row.timestamp),
    conversationId: row.conversation_id == null ? undefined : String(row.conversation_id),
    conversationTitle: String(row.conversation_title ?? ""),
    detailPath: row.detail_path == null ? undefined : String(row.detail_path),
    mode: String(row.mode ?? "single"),
    agentName: String(row.agent_name ?? ""),
    model: String(row.model ?? ""),
    event: String(row.event ?? ""),
    summary: String(row.summary ?? ""),
    tokens: Number(row.tokens ?? 0),
    durationMs: Number(row.duration_ms ?? 0),
    status: String(row.status ?? "success"),
  };
}
