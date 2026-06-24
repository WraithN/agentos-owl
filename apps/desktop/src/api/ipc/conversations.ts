import { ipcMain } from "electron";
import { getDatabase } from "../../db/connection.js";
import * as queries from "../../db/queries/index.js";
import type { Conversation } from "../../db/types.js";
import { nowMs } from "../../utils/time.js";
import { uuid } from "../../utils/id.js";
import { getAuditLogger } from "../../services/audit-logger.js";

export function registerConversationHandlers(): void {
  ipcMain.handle("list_conversations", () => {
    return queries.listConversations(getDatabase());
  });

  ipcMain.handle("get_conversation", (_event, id: string) => {
    return queries.getConversation(getDatabase(), id);
  });

  ipcMain.handle("save_conversation", (_event, conv: Conversation) => {
    const db = getDatabase();
    const isNew = !conv.id;
    if (!conv.id) {
      conv.id = uuid();
      conv.createdAt = nowMs();
    }
    conv.updatedAt = nowMs();
    queries.upsertConversation(db, conv);

    const logger = getAuditLogger();
    if (isNew) {
      logger.logConversationCreated(conv.id, conv.title, conv.mode);
    }
    return conv;
  });

  ipcMain.handle("delete_conversation", (_event, id: string) => {
    const db = getDatabase();
    const conv = queries.getConversation(db, id);
    queries.deleteConversation(db, id);

    if (conv) {
      const logger = getAuditLogger();
      logger.success("会话管理", `删除会话「${conv.title}」`);
    }
  });
}
