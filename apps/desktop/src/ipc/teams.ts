import { ipcMain } from "electron";
import { getDatabase } from "../db/connection.js";
import * as queries from "../db/queries/index.js";
import type { TeamTemplate } from "../db/types.js";
import { nowMs, uuid } from "./_utils.js";

/**
 * 前端 TeamTemplate 字段名为 `trigger`，后端 DB 字段名为 `triggerRule`，
 * 在 IPC 边界做一次双向映射，避免前后端类型耦合。
 */
type IpcTeam = Omit<TeamTemplate, "triggerRule"> & {
  trigger?: string;
  triggerRule?: string;
};

function fromIpc(team: IpcTeam): TeamTemplate {
  return {
    ...team,
    triggerRule: team.triggerRule ?? team.trigger ?? "",
  } as TeamTemplate;
}

function toIpc(team: TeamTemplate): IpcTeam {
  return { ...team, trigger: team.triggerRule };
}

export function registerTeamHandlers(): void {
  // 与 apps/web/src/services/electron.ts 中的 channel 保持一致
  ipcMain.handle("list_teams", () => {
    return queries.listTeams(getDatabase()).map(toIpc);
  });

  ipcMain.handle("get_team", (_event, id: string) => {
    const found = queries.getTeam(getDatabase(), id);
    return found ? toIpc(found) : undefined;
  });

  ipcMain.handle("save_team", (_event, raw: IpcTeam) => {
    const db = getDatabase();
    const team = fromIpc(raw);
    if (!team.id) {
      team.id = uuid();
      team.createdAt = nowMs();
    }
    team.updatedAt = nowMs();
    queries.upsertTeam(db, team);
    return toIpc(team);
  });

  ipcMain.handle("delete_team", (_event, id: string) => {
    queries.deleteTeam(getDatabase(), id);
  });
}
