import type React from "react";

export type NodeType = "input" | "agent" | "tool" | "condition" | "output";

export interface CanvasNode {
  id: string;
  type: NodeType;
  name: string;
  x: number;
  y: number;
  config: Record<string, string>;
}

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
}

export interface Transform {
  x: number;
  y: number;
  scale: number;
}

export interface SavedWorkflow {
  id: string;
  name: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  /** 画布视口：上次离开时的平移与缩放，可选，旧数据可缺省 */
  viewport?: Transform;
  savedAt: Date;
}

/**
 * 工作流持久化接口：由调用方注入（如 apps/web 的 Electron IPC 实现）。
 * 未注入时 WorkflowSettings 退化为内存模式，仅本次会话有效。
 */
export interface WorkflowStore {
  list(): Promise<SavedWorkflow[]>;
  save(wf: SavedWorkflow): Promise<SavedWorkflow>;
  remove(id: string): Promise<void>;
}

export interface NodeConfigField {
  key: string;
  label: string;
  placeholder: string;
  multiline?: boolean;
}

export interface NodeDef {
  label: string;
  icon: React.ReactNode;
  color: string;
  border: string;
  bg: string;
  text: string;
  gradFrom: string;
  gradTo: string;
  glowRgb: string;
  hasInput: boolean;
  hasOutput: boolean;
  configFields: NodeConfigField[];
}
