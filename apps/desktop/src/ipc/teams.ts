import { ipcMain } from "electron";
import { getDatabase } from "../db/connection.js";
import * as queries from "../db/queries/index.js";
import type { TeamTemplate } from "../db/types.js";
import { nowMs, uuid } from "./_utils.js";

export function registerTeamHandlers(): void {
  ipcMain.handle("list_team_templates", () => {
    return queries.listTeams(getDatabase());
  });

  ipcMain.handle("get_team_template", (_event, id: string) => {
    return queries.listTeams(getDatabase()).find((t) => t.id === id);
  });

  ipcMain.handle("save_team_template", (_event, team: TeamTemplate) => {
    const db = getDatabase();
    if (!team.id) {
      team.id = uuid();
      team.createdAt = nowMs();
    }
    team.updatedAt = nowMs();
    queries.upsertTeam(db, team);
    return team;
  });

  ipcMain.handle("delete_team_template", (_event, id: string) => {
    queries.deleteTeam(getDatabase(), id);
  });
}
