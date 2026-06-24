import { ipcMain } from "electron";
import { getDatabase } from "../../db/connection.js";
import * as queries from "../../db/queries/index.js";
import type { Agent } from "../../db/types.js";
import { nowMs } from "../../utils/time.js";
import { uuid } from "../../utils/id.js";

export function registerAgentHandlers(): void {
  ipcMain.handle("list_agents", () => {
    return queries.listAgents(getDatabase());
  });

  ipcMain.handle("get_agent", (_event, id: string) => {
    return queries.getAgent(getDatabase(), id);
  });

  ipcMain.handle("save_agent", (_event, agent: Agent) => {
    const db = getDatabase();
    if (!agent.id) {
      agent.id = uuid();
      agent.createdAt = nowMs();
    }
    agent.updatedAt = nowMs();
    queries.upsertAgent(db, agent);
    return agent;
  });

  ipcMain.handle("delete_agent", (_event, id: string) => {
    queries.deleteAgent(getDatabase(), id);
  });
}
