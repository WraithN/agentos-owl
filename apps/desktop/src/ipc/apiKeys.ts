import { ipcMain } from "electron";
import { getDatabase } from "../db/connection.js";
import * as queries from "../db/queries/index.js";
import * as secure from "../secure.js";
import type { ApiKeyEntry } from "../db/types.js";
import { nowMs, uuid } from "./_utils.js";

export function registerApiKeyHandlers(): void {
  ipcMain.handle("list_api_keys", () => {
    return queries.listApiKeys(getDatabase());
  });

  ipcMain.handle("save_api_key", (_event, entry: ApiKeyEntry & { key?: string }) => {
    const db = getDatabase();
    if (!entry.id) {
      entry.id = uuid();
      entry.createdAt = nowMs();
    }
    if (entry.key) {
      entry.encryptedKey = secure.encrypt(entry.key);
      delete (entry as { key?: string }).key;
    }
    queries.upsertApiKey(db, entry);
    return entry;
  });

  ipcMain.handle("delete_api_key", (_event, id: string) => {
    queries.deleteApiKey(getDatabase(), id);
  });

  ipcMain.handle("get_api_key_secret", (_event, id: string) => {
    const entry = queries.listApiKeys(getDatabase()).find((k) => k.id === id);
    if (!entry?.encryptedKey) return null;
    return secure.decrypt(entry.encryptedKey);
  });
}
