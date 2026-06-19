/* 工作流编排页 — 注入 Electron IPC 持久化 */
import { useMemo } from 'react';
import {
  WorkflowSettings as WorkflowSettingsCore,
  type SavedWorkflow,
  type WorkflowStore,
  type CanvasNode,
  type CanvasEdge,
  type Transform,
} from '@owl-os/workflow';
import {
  listWorkflowTemplates,
  saveWorkflowTemplate,
  deleteWorkflowTemplate,
} from '@/services/electron';
import type { WorkflowTemplate } from '@/types';

const DEFAULT_VIEWPORT: Transform = { x: 0, y: 0, scale: 1 };

/**
 * 业务模型（WorkflowTemplate）↔ 画布模型（SavedWorkflow）双向适配。
 * 集中放在这一层，避免画布包反向依赖 apps/web 的类型。
 */
function templateToSaved(t: WorkflowTemplate): SavedWorkflow {
  return {
    id: t.id,
    name: t.name,
    nodes: t.nodes as CanvasNode[],
    edges: t.edges as CanvasEdge[],
    viewport: t.viewport ?? DEFAULT_VIEWPORT,
    savedAt: t.updatedAt,
  };
}

function savedToTemplate(s: SavedWorkflow, prev?: WorkflowTemplate): WorkflowTemplate {
  return {
    id: s.id,
    name: s.name,
    description: prev?.description ?? '',
    nodes: s.nodes,
    edges: s.edges,
    viewport: s.viewport ?? DEFAULT_VIEWPORT,
    createdAt: prev?.createdAt ?? s.savedAt,
    updatedAt: s.savedAt,
    lastRun: prev?.lastRun,
  };
}

export default function WorkflowSettings() {
  // 缓存中保存最近一次列表，便于 save 时保留 description / lastRun 等不在画布里的字段
  const cache = useMemo(() => new Map<string, WorkflowTemplate>(), []);

  const store: WorkflowStore = useMemo(
    () => ({
      async list() {
        const list = await listWorkflowTemplates();
        cache.clear();
        list.forEach((t) => cache.set(t.id, t));
        return list.map(templateToSaved);
      },
      async save(wf) {
        const tpl = savedToTemplate(wf, cache.get(wf.id));
        const saved = await saveWorkflowTemplate(tpl);
        cache.set(saved.id, saved);
        return templateToSaved(saved);
      },
      async remove(id) {
        await deleteWorkflowTemplate(id);
        cache.delete(id);
      },
    }),
    [cache]
  );

  return <WorkflowSettingsCore store={store} />;
}
