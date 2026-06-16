import { ipcMain } from "electron";
import { getDatabase } from "../db/connection.js";
import * as queries from "../db/queries/index.js";
import { nowMs } from "./_utils.js";

export type Settings = Record<string, unknown>;

export function registerSettingsHandlers(): void {
  ipcMain.handle("get_settings", () => {
    const db = getDatabase();
    const settings: Settings = {};
    for (const { key, value } of queries.listSettings(db)) {
      try {
        settings[key] = JSON.parse(value);
      } catch {
        settings[key] = value;
      }
    }
    return settings;
  });

  ipcMain.handle("save_settings", (_event, settings: Settings) => {
    const db = getDatabase();
    const now = nowMs();
    for (const [key, value] of Object.entries(settings)) {
      const str = typeof value === "string" ? value : JSON.stringify(value);
      queries.setSetting(db, key, str, now);
    }
    return settings;
  });
}
