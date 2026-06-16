import {
  NODE_W,
  NODE_H,
  LAYOUT_H_GAP,
  LAYOUT_V_GAP,
  LAYOUT_PAD_X,
  LAYOUT_PAD_Y,
} from "./constants.js";
import type { CanvasNode, CanvasEdge } from "./types.js";

/**
 * Kahn's 拓扑排序 + 层次化布局
 * 返回 nodeId -> {x, y} 的新坐标映射
 */
export function computeAutoLayout(
  nodes: CanvasNode[],
  edges: CanvasEdge[]
): Map<string, { x: number; y: number }> {
  const nodeIds = nodes.map((n) => n.id);
  const inDegree = new Map<string, number>(nodeIds.map((id) => [id, 0]));
  const outAdj = new Map<string, string[]>(nodeIds.map((id) => [id, []]));

  for (const e of edges) {
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
    outAdj.get(e.source)?.push(e.target);
  }

  // BFS 分层
  let queue = nodeIds.filter((id) => (inDegree.get(id) ?? 0) === 0);
  const layers: string[][] = [];
  const visited = new Set<string>();

  while (queue.length > 0) {
    layers.push([...queue]);
    queue.forEach((id) => visited.add(id));
    const next: string[] = [];
    for (const id of queue) {
      for (const tgt of outAdj.get(id) ?? []) {
        const deg = (inDegree.get(tgt) ?? 1) - 1;
        inDegree.set(tgt, deg);
        if (deg === 0 && !visited.has(tgt)) next.push(tgt);
      }
    }
    queue = next;
  }

  // 孤立节点（循环依赖或断连）放到末层
  const unvisited = nodeIds.filter((id) => !visited.has(id));
  if (unvisited.length > 0) layers.push(unvisited);

  // 计算总高度用于垂直居中
  const layerHeights = layers.map(
    (layer) => layer.length * NODE_H + (layer.length - 1) * LAYOUT_V_GAP
  );
  const maxLayerH = Math.max(...layerHeights);

  const positions = new Map<string, { x: number; y: number }>();

  layers.forEach((layer, li) => {
    const layerH = layerHeights[li];
    const startY = LAYOUT_PAD_Y + (maxLayerH - layerH) / 2;
    layer.forEach((id, ni) => {
      positions.set(id, {
        x: LAYOUT_PAD_X + li * (NODE_W + LAYOUT_H_GAP),
        y: startY + ni * (NODE_H + LAYOUT_V_GAP),
      });
    });
  });

  return positions;
}

/**
 * 根据所有节点包围盒计算 fit-to-view 的 transform
 */
export function computeFitView(
  nodes: CanvasNode[],
  canvasW: number,
  canvasH: number
): { x: number; y: number; scale: number } {
  if (nodes.length === 0) return { x: 0, y: 0, scale: 1 };

  const padding = 64;
  const minX = Math.min(...nodes.map((n) => n.x));
  const minY = Math.min(...nodes.map((n) => n.y));
  const maxX = Math.max(...nodes.map((n) => n.x + NODE_W));
  const maxY = Math.max(...nodes.map((n) => n.y + NODE_H));

  const contentW = maxX - minX;
  const contentH = maxY - minY;

  const scaleX = (canvasW - padding * 2) / contentW;
  const scaleY = (canvasH - padding * 2) / contentH;
  const scale = Math.min(scaleX, scaleY, 1.4);

  return {
    x: (canvasW - contentW * scale) / 2 - minX * scale,
    y: (canvasH - contentH * scale) / 2 - minY * scale,
    scale,
  };
}

export function inputPort(node: CanvasNode) {
  return { x: node.x, y: node.y + NODE_H / 2 };
}

export function outputPort(node: CanvasNode) {
  return { x: node.x + NODE_W, y: node.y + NODE_H / 2 };
}

// 辅助：贝塞尔路径
export function bezierPath(x1: number, y1: number, x2: number, y2: number) {
  const dx = Math.abs(x2 - x1) * 0.5;
  return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
}
