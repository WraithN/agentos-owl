import { BrowserWindow } from "electron";
import type { TeammateStatus } from "@owl-os/core";

const teammateStatuses = new Map<string, TeammateStatus>();

function sendStatus(sessionId: string, status: TeammateStatus): void {
  // 测试环境没有 Electron BrowserWindow，直接跳过 IPC 推送
  if (!BrowserWindow || typeof BrowserWindow.getAllWindows !== "function") return;
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send("agent:status", { sessionId, status });
  }
}

export function getTeammateStatus(sessionId: string): TeammateStatus | undefined {
  return teammateStatuses.get(sessionId);
}

export function publishAgentStatus(sessionId: string, status: TeammateStatus): void {
  teammateStatuses.set(sessionId, status);
  sendStatus(sessionId, status);
}
