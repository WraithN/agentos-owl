import { ipcMain } from "electron";
import { getDatabase } from "../../db/connection.js";
import * as queries from "../../db/queries/index.js";
import type { WorkflowTemplate } from "../../db/types.js";
import { nowMs } from "../../utils/time.js";
import { uuid } from "../../utils/id.js";

const DEFAULT_VIEWPORT = { x: 0, y: 0, scale: 1 };

/**
 * 工作流模板 IPC：channel 名沿用 *_template 后缀，
 * 与前端 services/electron.ts 对齐，并为后续 workflow_run / workflow_instance 留出命名空间。
 */
export function registerWorkflowHandlers(): void {
  ipcMain.handle("list_workflow_templates", () => {
    return queries.listWorkflows(getDatabase());
  });

  ipcMain.handle("get_workflow_template", (_event, id: string) => {
    return queries.listWorkflows(getDatabase()).find((w) => w.id === id);
  });

  ipcMain.handle(
    "save_workflow_template",
    (_event, wf: Partial<WorkflowTemplate>) => {
      const db = getDatabase();
      const now = nowMs();
      const merged: WorkflowTemplate = {
        id: wf.id ?? uuid(),
        name: wf.name ?? "未命名工作流",
        description: wf.description ?? "",
        nodes: wf.nodes ?? [],
        edges: wf.edges ?? [],
        viewport: wf.viewport ?? DEFAULT_VIEWPORT,
        // 新建时 createdAt 取 now，更新时保留原值
        createdAt: wf.createdAt ?? now,
        updatedAt: now,
        lastRun: wf.lastRun,
      };
      queries.upsertWorkflow(db, merged);
      return merged;
    }
  );

  ipcMain.handle("delete_workflow_template", (_event, id: string) => {
    queries.deleteWorkflow(getDatabase(), id);
  });
}
