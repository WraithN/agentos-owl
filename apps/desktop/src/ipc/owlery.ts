import { BrowserWindow, ipcMain } from "electron";
import { owlery } from "../agent/owleryRuntime.js";
import { getTeammateStatus, publishAgentStatus } from "./teammateStatus.js";

const subscriptions = new Map<string, () => void>();

function subscriptionKey(windowId: number, sessionId: string) {
  return `${windowId}:${sessionId}`;
}

export function registerOwleryHandlers(): void {
  ipcMain.handle("owlery:activate_session", (event, { sessionId }: { sessionId: string }) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    owlery.activateSession(sessionId);
    publishAgentStatus(sessionId, owlery.getTeammateStatus(sessionId));
    if (window) ensureSubscription(window, sessionId);
    return { ok: true };
  });

  ipcMain.handle(
    "owlery:start_chat",
    (
      event,
      {
        sessionId,
        text,
        teammateMode,
      }: { sessionId: string; text: string; teammateMode?: string },
    ) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      // TODO: 将 teammateMode 透传给 Owlery，当前后端先忽略该字段
      void teammateMode;
      owlery.startChat({ sessionId, userMessage: text });
      publishAgentStatus(sessionId, owlery.getTeammateStatus(sessionId));
      if (window) ensureSubscription(window, sessionId);
      return { ok: true };
    },
  );

  ipcMain.handle("owlery:get_buffered_output", (_event, { sessionId }: { sessionId: string }) => {
    return owlery.getBufferedOutput(sessionId);
  });

  ipcMain.handle("owlery:list_session_summaries", () => {
    return owlery.listSessionSummaries();
  });

  ipcMain.handle("owlery:get_crystal_ball", (_event, { sessionId }: { sessionId: string }) => {
    return owlery.getCrystalBallSnapshot(sessionId);
  });

  ipcMain.handle("owlery:get_teammate_status", (_event, { sessionId }: { sessionId: string }) => {
    const current = getTeammateStatus(sessionId);
    if (current) return current;
    try {
      return owlery.getTeammateStatus(sessionId);
    } catch {
      return {
        sessionId,
        teammateName: "默认团队",
        leader: { agentId: `${sessionId}:boss_agent`, name: "Boss Agent", title: "boss", role: "elder", status: "not_started" },
        members: [],
      };
    }
  });
}

function ensureSubscription(window: BrowserWindow, sessionId: string) {
  const key = subscriptionKey(window.id, sessionId);
  subscriptions.get(key)?.();
  const unsubscribe = owlery.subscribeSession(sessionId, (chunk) => {
    publishAgentStatus(sessionId, owlery.getTeammateStatus(sessionId));
    if (owlery.getActiveSlot()?.sessionId !== sessionId) return;
    window.webContents.send("owlery:chunk", { sessionId, chunk });
  });
  subscriptions.set(key, unsubscribe);
  window.once("closed", () => {
    subscriptions.get(key)?.();
    subscriptions.delete(key);
  });
}
