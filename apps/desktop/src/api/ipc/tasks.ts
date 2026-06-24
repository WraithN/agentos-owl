import { ipcMain } from "electron";
import { getDatabase } from "../../db/connection.js";
import * as queries from "../../db/queries/index.js";
import type { KanbanTask } from "../../db/types.js";
import { nowMs } from "../../utils/time.js";
import { uuid } from "../../utils/id.js";

export function registerTaskHandlers(): void {
  ipcMain.handle("list_tasks", () => {
    return queries.listTasks(getDatabase());
  });

  ipcMain.handle("get_task", (_event, id: string) => {
    return queries.listTasks(getDatabase()).find((t) => t.id === id);
  });

  ipcMain.handle("save_task", (_event, task: KanbanTask) => {
    const db = getDatabase();
    if (!task.id) {
      task.id = uuid();
      task.createdAt = nowMs();
    }
    task.updatedAt = nowMs();
    queries.upsertTask(db, task);
    return task;
  });

  ipcMain.handle("delete_task", (_event, id: string) => {
    queries.deleteTask(getDatabase(), id);
  });
}
