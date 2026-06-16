import { ipcMain } from "electron";
import { getDatabase } from "../db/connection.js";
import * as queries from "../db/queries/index.js";
import type { MarketTool } from "../db/types.js";
import { nowMs, uuid } from "./_utils.js";

export function registerMarketToolHandlers(): void {
  ipcMain.handle("list_market_tools", () => {
    return queries.listMarketTools(getDatabase());
  });

  ipcMain.handle("get_market_tool", (_event, id: string) => {
    return queries.listMarketTools(getDatabase()).find((t) => t.id === id);
  });

  ipcMain.handle("save_market_tool", (_event, tool: MarketTool) => {
    const db = getDatabase();
    if (!tool.id) {
      tool.id = uuid();
      tool.createdAt = nowMs();
    }
    tool.updatedAt = nowMs();
    queries.upsertMarketTool(db, tool);
    return tool;
  });
}
