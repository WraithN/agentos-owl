import { ipcMain } from "electron";
import { getDatabase } from "../db/connection.js";
import * as queries from "../db/queries/index.js";
import type { BillingRecord } from "../db/types.js";
import { nowMs, uuid } from "./_utils.js";

export function registerBillingHandlers(): void {
  ipcMain.handle("list_billing_records", () => {
    return queries.listBilling(getDatabase());
  });

  ipcMain.handle("save_billing_record", (_event, record: BillingRecord) => {
    const db = getDatabase();
    if (!record.id) {
      record.id = uuid();
      record.createdAt = nowMs();
    }
    queries.insertBilling(db, record);
    return record;
  });
}
