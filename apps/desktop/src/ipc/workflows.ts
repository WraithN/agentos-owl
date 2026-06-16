import { ipcMain } from "electron";
import { getDatabase } from "../db/connection.js";
import * as queries from "../db/queries/index.js";
import type { WorkflowTemplate } from "../db/types.js";
import { nowMs, uuid } from "./_utils.js";

export function registerWorkflowHandlers(): void {
  ipcMain.handle("list_workflows", () => {
    return queries.listWorkflows(getDatabase());
  });

  ipcMain.handle("get_workflow", (_event, id: string) => {
    return queries.listWorkflows(getDatabase()).find((w) => w.id === id);
  });

  ipcMain.handle("save_workflow", (_event, wf: WorkflowTemplate) => {
    const db = getDatabase();
    if (!wf.id) {
      wf.id = uuid();
      wf.createdAt = nowMs();
    }
    queries.upsertWorkflow(db, wf);
    return wf;
  });

  ipcMain.handle("delete_workflow", (_event, id: string) => {
    queries.deleteWorkflow(getDatabase(), id);
  });
}
