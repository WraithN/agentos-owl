import { ipcMain } from "electron";
import { getDatabase } from "../../db/connection.js";
import * as queries from "../../db/queries/index.js";
import type { Notification } from "../../db/types.js";
import { nowMs } from "../../utils/time.js";
import { uuid } from "../../utils/id.js";

export function registerNotificationHandlers(): void {
  ipcMain.handle("list_notifications", () => {
    return queries.listNotifications(getDatabase());
  });

  ipcMain.handle("save_notification", (_event, notification: Notification) => {
    const db = getDatabase();
    if (!notification.id) {
      notification.id = uuid();
      notification.timestamp = nowMs();
    }
    queries.upsertNotification(db, notification);
    return notification;
  });

  ipcMain.handle("mark_notification_read", (_event, id: string) => {
    queries.markNotificationRead(getDatabase(), id);
  });

  ipcMain.handle("delete_notification", (_event, id: string) => {
    queries.deleteNotification(getDatabase(), id);
  });
}
