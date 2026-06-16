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
  savedAt: Date;
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
