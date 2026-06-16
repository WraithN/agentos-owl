import { ipcMain } from "electron";
import { getDatabase } from "../db/connection.js";
import * as queries from "../db/queries/index.js";
import * as secure from "../secure.js";
import type { Webhook } from "../db/types.js";
import { nowMs, uuid } from "./_utils.js";

export function registerWebhookHandlers(): void {
  ipcMain.handle("list_webhooks", () => {
    return queries.listWebhooks(getDatabase());
  });

  ipcMain.handle("save_webhook", (_event, webhook: Webhook & { secret?: string }) => {
    const db = getDatabase();
    if (!webhook.id) {
      webhook.id = uuid();
      webhook.createdAt = nowMs();
    }
    webhook.updatedAt = nowMs();
    if (webhook.secret) {
      webhook.secretRef = secure.encrypt(webhook.secret);
      delete (webhook as { secret?: string }).secret;
    }
    queries.upsertWebhook(db, webhook);
    return webhook;
  });

  ipcMain.handle("delete_webhook", (_event, id: string) => {
    queries.deleteWebhook(getDatabase(), id);
  });
}
