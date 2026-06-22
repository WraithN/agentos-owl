import { ipcMain } from "electron";
import { notifyLlmConfigUpdate } from "../agent/owleryRuntime.js";
import { getDatabase } from "../db/connection.js";
import * as queries from "../db/queries/index.js";
import { nowMs } from "./_utils.js";
import { getAuditLogger } from "../services/AuditLogger.js";

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
    const logger = getAuditLogger();
    let llmModelsChanged = false;

    for (const [key, value] of Object.entries(settings)) {
      const str = typeof value === "string" ? value : JSON.stringify(value);
      queries.setSetting(db, key, str, now);

      if (key === "llmModels") {
        llmModelsChanged = true;
        if (typeof value === "object" && value !== null) {
          const models = value as Array<{ name: string; isDefault?: boolean }>;
          const defaultModel = models.find(m => m.isDefault);
          if (defaultModel) {
            logger.logDefaultLlmChanged(defaultModel.name);
          }
        }
      }
    }

    // 数据库读写只在主线程；LLM 配置变更后同步给所有 Worker 线程
    if (llmModelsChanged) {
      notifyLlmConfigUpdate();
    }

    return settings;
  });
}
