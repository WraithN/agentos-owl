import { ipcMain } from "electron";
import { getDatabase } from "../db/connection.js";
import * as queries from "../db/queries/index.js";
import type { AuditLog, SessionLog } from "../db/types.js";
import { nowMs, uuid } from "./_utils.js";

export function registerAuditLogHandlers(): void {
  // ===== 操作日志 =====
  ipcMain.handle("list_audit_logs", (_event, limit?: number) => {
    return queries.listAuditLogs(
      getDatabase(),
      typeof limit === "number" && limit > 0 ? limit : 500
    );
  });

  ipcMain.handle(
    "save_audit_log",
    (_event, log: Partial<AuditLog>): AuditLog => {
      const full: AuditLog = {
        id: log.id ?? uuid(),
        timestamp: log.timestamp ?? nowMs(),
        userName: log.userName ?? "",
        action: log.action ?? "",
        detail: log.detail ?? "",
        ip: log.ip ?? "",
        result: log.result ?? "success",
      };
      queries.insertAuditLog(getDatabase(), full);
      return full;
    }
  );

  ipcMain.handle("clear_audit_logs", () => {
    queries.clearAuditLogs(getDatabase());
  });

  // ===== 会话日志 =====
  ipcMain.handle("list_session_logs", (_event, limit?: number) => {
    return queries.listSessionLogs(
      getDatabase(),
      typeof limit === "number" && limit > 0 ? limit : 500
    );
  });

  ipcMain.handle(
    "save_session_log",
    (_event, log: Partial<SessionLog>): SessionLog => {
      const full: SessionLog = {
        id: log.id ?? uuid(),
        timestamp: log.timestamp ?? nowMs(),
        conversationId: log.conversationId,
        conversationTitle: log.conversationTitle ?? "",
        mode: log.mode ?? "single",
        agentName: log.agentName ?? "",
        model: log.model ?? "",
        event: log.event ?? "",
        summary: log.summary ?? "",
        tokens: log.tokens ?? 0,
        durationMs: log.durationMs ?? 0,
        status: log.status ?? "success",
      };
      queries.insertSessionLog(getDatabase(), full);
      return full;
    }
  );

  ipcMain.handle("clear_session_logs", () => {
    queries.clearSessionLogs(getDatabase());
  });
}
