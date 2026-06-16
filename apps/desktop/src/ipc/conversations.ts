import { ipcMain } from "electron";
import { getDatabase } from "../db/connection.js";
import * as queries from "../db/queries/index.js";
import type { Conversation } from "../db/types.js";
import { nowMs, uuid } from "./_utils.js";

export function registerConversationHandlers(): void {
  ipcMain.handle("list_conversations", () => {
    return queries.listConversations(getDatabase());
  });

  ipcMain.handle("get_conversation", (_event, id: string) => {
    return queries.getConversation(getDatabase(), id);
  });

  ipcMain.handle("save_conversation", (_event, conv: Conversation) => {
    const db = getDatabase();
    if (!conv.id) {
      conv.id = uuid();
      conv.createdAt = nowMs();
    }
    conv.updatedAt = nowMs();
    queries.upsertConversation(db, conv);
    return conv;
  });

  ipcMain.handle("delete_conversation", (_event, id: string) => {
    queries.deleteConversation(getDatabase(), id);
  });
}
