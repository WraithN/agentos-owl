/* Agent IPC handlers —— 桥接前端与 pi-agent-core */
import { ipcMain, BrowserWindow } from "electron";
import { createAgentSession, getAgentSession, disposeAgentSession } from "../agent/agent.js";

function sendEvent(window: BrowserWindow | null, sessionId: string, event: unknown) {
  window?.webContents.send("agent:event", { sessionId, event });
}

export function registerAgentPromptHandlers(): void {
  ipcMain.handle("agent:create", async (_event, { sessionId }: { sessionId: string }) => {
    const window = BrowserWindow.fromWebContents(_event.sender);
    const session = createAgentSession(sessionId, window?.id ?? 0);
    session.agent.subscribe((_event) => {
      sendEvent(window, sessionId, _event);
    });
    return { ok: true };
  });

  ipcMain.handle("agent:dispose", async (_event, { sessionId }: { sessionId: string }) => {
    disposeAgentSession(sessionId);
    return { ok: true };
  });

  ipcMain.handle("agent:prompt", async (_event, { sessionId, text }: { sessionId: string; text: string }) => {
    const session = getAgentSession(sessionId);
    if (!session) {
      throw new Error(`Agent session not found: ${sessionId}`);
    }
    await session.agent.prompt(text);
    return { ok: true };
  });

  ipcMain.handle("agent:stop", async (_event, { sessionId }: { sessionId: string }) => {
    const session = getAgentSession(sessionId);
    session?.agent.abort();
    return { ok: true };
  });
}
