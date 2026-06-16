import { NODE_DEFS } from "../constants.js";
import { bezierPath, inputPort, outputPort } from "../layout.js";
import type { CanvasEdge, CanvasNode } from "../types.js";

interface WorkflowEdgeProps {
  edge: CanvasEdge;
  sourceNode: CanvasNode;
  targetNode: CanvasNode;
  isSelected: boolean;
  workflowRunning: boolean;
  onClick: (e: React.MouseEvent) => void;
}

export function WorkflowEdge({
  edge,
  sourceNode,
  targetNode,
  isSelected,
  workflowRunning,
  onClick,
}: WorkflowEdgeProps) {
  const op = outputPort(sourceNode);
  const ip = inputPort(targetNode);
  const gradId = isSelected ? "edge-grad-sel" : `edge-grad-${sourceNode.type}`;
  const glowRgb = NODE_DEFS[sourceNode.type].glowRgb;

  return (
    <g key={edge.id}>
      {/* 发光描边（模拟外发光） */}
      <path
        d={bezierPath(op.x, op.y, ip.x, ip.y)}
        fill="none"
        stroke={`rgba(${glowRgb},0.25)`}
        strokeWidth={isSelected ? 8 : 5}
        strokeLinecap="round"
      />
      {/* 宽透明路径用于点击检测 */}
      <path
        d={bezierPath(op.x, op.y, ip.x, ip.y)}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
        className="cursor-pointer pointer-events-auto"
        onClick={onClick}
      />
      {/* 主连线 */}
      <path
        d={bezierPath(op.x, op.y, ip.x, ip.y)}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth={isSelected ? 3 : 2.2}
        strokeLinecap="round"
        strokeDasharray={workflowRunning ? "8 4" : undefined}
        markerEnd={isSelected ? "url(#arrow-sel)" : "url(#arrow)"}
        style={
          workflowRunning ? { animation: "dash-flow 1.2s linear infinite" } : undefined
        }
      />
    </g>
  );
}
