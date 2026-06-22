import { BrowserWindow, ipcMain } from "electron";
import type { TeammateMode } from "@owl-os/core";
import { owlery } from "../agent/owleryRuntime.js";
import { getTeammateStatus, publishAgentStatus } from "./teammateStatus.js";
import { getDatabase } from "../db/connection.js";
import * as queries from "../db/queries/index.js";

const subscriptions = new Map<string, () => void>();
const TEAMMATE_MODES = new Set<TeammateMode>(["pipeline", "brainstorm", "supervisor", "hierarchy"]);

function subscriptionKey(windowId: number, sessionId: string) {
  return `${windowId}:${sessionId}`;
}

function normalizeTeammateMode(mode: string | undefined): TeammateMode | undefined {
  if (!mode) return undefined;
  return TEAMMATE_MODES.has(mode as TeammateMode) ? (mode as TeammateMode) : undefined;
}

function resolveTeammateModeFromTemplate(teamTemplateId: string | undefined): TeammateMode | undefined {
  if (!teamTemplateId) return undefined;
  try {
    const template = queries.getTeam(getDatabase(), teamTemplateId);
    const map: Record<string, TeammateMode> = {
      pipeline: "pipeline",
      supervisor: "supervisor",
      brainstorming: "brainstorm",
      brainstorm: "brainstorm",
      hierarchy: "hierarchy",
      swarm: "hierarchy",
    };
    return template?.mode ? map[template.mode] ?? undefined : undefined;
  } catch {
    return undefined;
  }
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
        teamTemplateId,
      }: { sessionId: string; text: string; teammateMode?: string; teamTemplateId?: string },
    ) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      // packages/core 的 Owlery 回退路径仅接收 teammateMode；teamTemplateId 由主线程在需要时解析
      const mode = teamTemplateId ? resolveTeammateModeFromTemplate(teamTemplateId) : normalizeTeammateMode(teammateMode);
      owlery.startChat({ sessionId, userMessage: text, teammateMode: mode });
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
        leader: { agentId: `${sessionId}:elder_boss`, name: "Elder Agent", title: "boss", role: "elder", status: "not_started" },
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
