import { BrowserWindow, ipcMain } from "electron";
import { AgentWorkStatus, SessionRunStatus, SessionVisibility } from "@owl-os/core";
import type { AgentDriverChunk, TeammateMode, TeammateStatus } from "@owl-os/core";
import { generateBossName, setSessionAgentNames } from "../../agent-runtime/agent-names.js";
import { getActiveOwlery } from "../../agent-orchestrator/owlery.js";
import { getTeammateStatus, publishAgentStatus } from "./teammate-status.js";
import { getDatabase } from "../../db/connection.js";
import * as queries from "../../db/queries/index.js";

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

function prepareSessionAgentNames(sessionId: string): void {
  try {
    const db = getDatabase();
    const names = queries.getConversationAgentNames(db, sessionId);
    setSessionAgentNames(sessionId, names, (updated) => {
      try {
        queries.updateConversationAgentNames(db, sessionId, updated);
      } catch (error) {
        console.error(`[owlery ipc ${sessionId}] failed to persist agent names:`, error);
      }
    });
  } catch {
    // 数据库未初始化时使用空映射，避免回退路径阻塞
    setSessionAgentNames(sessionId, {});
  }
}

function defaultTeammateStatus(sessionId: string): TeammateStatus {
  return {
    sessionId,
    mode: "supervisor",
    visibility: SessionVisibility.ACTIVE,
    runStatus: SessionRunStatus.IDLE,
    teammateName: "默认团队",
    leader: { agentId: `${sessionId}:elder`, name: generateBossName(sessionId, "zh-CN"), title: "boss", role: "elder", status: AgentWorkStatus.NOT_STARTED },
    members: [],
  };
}

function getOwlery() {
  const owlery = getActiveOwlery();
  if (!owlery) throw new Error("Owlery 尚未初始化");
  return owlery;
}

export function registerOwleryHandlers(): void {
  ipcMain.handle("owlery:activate_session", (event, { sessionId }: { sessionId: string }) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const owlery = getOwlery();
    prepareSessionAgentNames(sessionId);
    owlery.activateSession(sessionId);
    publishAgentStatus(sessionId, owlery.getTeammateStatus(sessionId) ?? getTeammateStatus(sessionId) ?? defaultTeammateStatus(sessionId));
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
      const owlery = getOwlery();
      prepareSessionAgentNames(sessionId);
      const mode = teamTemplateId ? resolveTeammateModeFromTemplate(teamTemplateId) : normalizeTeammateMode(teammateMode);
      owlery.startChat(sessionId, text, { teammateMode: mode });
      publishAgentStatus(sessionId, owlery.getTeammateStatus(sessionId) ?? getTeammateStatus(sessionId) ?? defaultTeammateStatus(sessionId));
      if (window) ensureSubscription(window, sessionId);
      return { ok: true };
    },
  );

  ipcMain.handle("owlery:get_buffered_output", (_event, { sessionId }: { sessionId: string }) => {
    return getOwlery().getBufferedOutput(sessionId);
  });

  ipcMain.handle("owlery:list_session_summaries", () => {
    return getOwlery().listSessionSummaries();
  });

  ipcMain.handle("owlery:get_crystal_ball", (_event, { sessionId }: { sessionId: string }) => {
    return getOwlery().getCrystalBallSnapshot(sessionId);
  });

  ipcMain.handle("owlery:get_teammate_status", (_event, { sessionId }: { sessionId: string }) => {
    const current = getTeammateStatus(sessionId);
    if (current) return current;
    const owlery = getActiveOwlery();
    if (owlery) {
      const status = owlery.getTeammateStatus(sessionId);
      if (status) return status;
    }
    return {
      sessionId,
      teammateName: "默认团队",
      leader: { agentId: `${sessionId}:elder`, name: generateBossName(sessionId, "zh-CN"), title: "boss", role: "elder", status: "not_started" },
      members: [],
    };
  });
}

function ensureSubscription(window: BrowserWindow, sessionId: string) {
  const key = subscriptionKey(window.id, sessionId);
  subscriptions.get(key)?.();
  const owlery = getOwlery();
  const unsubscribe = owlery.subscribeSession(sessionId, (chunk: AgentDriverChunk) => {
    publishAgentStatus(sessionId, owlery.getTeammateStatus(sessionId) ?? getTeammateStatus(sessionId) ?? defaultTeammateStatus(sessionId));
    if (owlery.getActiveSlot()?.sessionId !== sessionId) return;
    window.webContents.send("owlery:chunk", { sessionId, chunk });
  });
  subscriptions.set(key, unsubscribe);
  window.once("closed", () => {
    subscriptions.get(key)?.();
    subscriptions.delete(key);
  });
}
