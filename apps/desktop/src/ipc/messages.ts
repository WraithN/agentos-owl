import { ipcMain } from "electron";
import { getDatabase } from "../db/connection.js";
import * as queries from "../db/queries/index.js";
import type { Message } from "../db/types.js";
import { nowMs, uuid } from "./_utils.js";

export function registerMessageHandlers(): void {
  ipcMain.handle("list_messages", (_event, conversationId: string) => {
    return queries.listMessages(getDatabase(), conversationId);
  });

  ipcMain.handle("save_message", (_event, message: Message) => {
    const db = getDatabase();
    if (!message.id) {
      message.id = uuid();
    }
    message.timestamp = nowMs();
    queries.upsertMessage(db, message);
    return message;
  });

  ipcMain.handle("delete_message", (_event, id: string) => {
    queries.deleteMessage(getDatabase(), id);
  });
}
