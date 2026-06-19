import { ipcMain } from "electron";
import { getDatabase } from "../db/connection.js";
import * as queries from "../db/queries/index.js";
import type { Message } from "../db/types.js";
import { nowMs, uuid } from "./_utils.js";
import { appendConversationDetail, readConversationDetails } from "../services/ConversationDetailStore.js";

export function registerMessageHandlers(): void {
  ipcMain.handle("list_messages", (_event, conversationId: string) => {
    return queries.listMessages(getDatabase(), conversationId);
  });

  ipcMain.handle("list_conversation_details", (_event, conversationId: string) => {
    return readConversationDetails(conversationId);
  });

  ipcMain.handle("save_message", (_event, message: Message) => {
    const db = getDatabase();
    if (!message.id) {
      message.id = uuid();
    }
    message.timestamp = message.timestamp || nowMs();
    queries.upsertMessage(db, message);
    appendConversationDetail({
      id: message.id,
      conversationId: message.conversationId,
      role: message.msgType === "agent" ? "assistant" : message.msgType === "tool-call" ? "tool" : message.msgType === "system" ? "system" : "user",
      content: message.content,
      timestamp: message.timestamp,
      status: message.status,
      meta: message.meta,
    });
    return message;
  });

  ipcMain.handle("delete_message", (_event, id: string) => {
    queries.deleteMessage(getDatabase(), id);
  });
}
