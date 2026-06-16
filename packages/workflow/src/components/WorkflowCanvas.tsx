import { AnimatePresence, motion } from "framer-motion";
import { ArrowRightCircle, X } from "lucide-react";
import { NODE_DEFS } from "../constants.js";
import { inputPort, outputPort } from "../layout.js";
import type { CanvasNode, CanvasEdge, Transform } from "../types.js";
import { WorkflowNode } from "./WorkflowNode.js";
import { WorkflowEdge } from "./WorkflowEdge.js";

interface WorkflowCanvasProps {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  transform: Transform;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  workflowRunning: boolean;
  connectingState: { sourceId: string; curX: number; curY: number } | null;
  draggingNodeId: string | null;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  onCanvasMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onWheel: (e: React.WheelEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onNodeMouseDown: (e: React.MouseEvent, nodeId: string) => void;
  onInputPortMouseUp: (e: React.MouseEvent, nodeId: string) => void;
  onOutputPortMouseDown: (e: React.MouseEvent, nodeId: string) => void;
  onEdgeClick: (e: React.MouseEvent, edgeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onDeleteEdge: (edgeId: string) => void;
}

export function WorkflowCanvas({
  nodes,
  edges,
  transform,
  selectedNodeId,
  selectedEdgeId,
  workflowRunning,
  connectingState,
  draggingNodeId,
  canvasRef,
  onCanvasMouseDown,
  onMouseMove,
  onMouseUp,
  onWheel,
  onDrop,
  onNodeMouseDown,
  onInputPortMouseUp,
  onOutputPortMouseDown,
  onEdgeClick,
  onDeleteNode,
  onDeleteEdge,
}: WorkflowCanvasProps) {
  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <div
        ref={canvasRef}
        className="relative cursor-grab active:cursor-grabbing aurora-canvas"
        style={{
          minWidth: "2200px",
          minHeight: "1600px",
          background: "linear-gradient(135deg, #F0F9FF 0%, #EEF2FF 50%, #F5F3FF 100%)",
          backgroundSize: "200% 200%",
          backgroundImage: `
            linear-gradient(135deg, #F0F9FF 0%, #EEF2FF 50%, #F5F3FF 100%),
            radial-gradient(ellipse at 15% 20%, rgba(0,245,160,0.12) 0%, transparent 55%),
            radial-gradient(ellipse at 85% 80%, rgba(168,85,247,0.1) 0%, transparent 55%),
            radial-gradient(ellipse at 70% 15%, rgba(59,130,246,0.08) 0%, transparent 45%)
          `,
        }}
        onMouseDown={onCanvasMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {/* 网格 SVG 叠加层 */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 0 }}
        >
          <defs>
            <pattern
              id="aurora-grid"
              width="28"
              height="28"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 28 0 L 0 0 0 28"
                fill="none"
                stroke="rgba(100,116,139,0.09)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#aurora-grid)" />
        </svg>

        {/* SVG 连线层 */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 1 }}
        >
          <defs>
            {/* 渐变定义 — 每种节点类型对应一条连线渐变 */}
            <linearGradient id="edge-grad-input" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00F5A0" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#00D4FF" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="edge-grad-agent" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#A855F7" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#6366F1" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="edge-grad-tool" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="edge-grad-condition" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#EF4444" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="edge-grad-default" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00D4FF" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#6366F1" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#A855F7" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="edge-grad-sel" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00F5A0" />
              <stop offset="100%" stopColor="#A855F7" />
            </linearGradient>
            {/* 箭头 */}
            <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="url(#edge-grad-default)" />
            </marker>
            <marker id="arrow-sel" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="url(#edge-grad-sel)" />
            </marker>
          </defs>

          <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>
            {/* 已有连线 */}
            {edges.map((edge) => {
              const src = nodes.find((n) => n.id === edge.source);
              const tgt = nodes.find((n) => n.id === edge.target);
              if (!src || !tgt) return null;
              return (
                <WorkflowEdge
                  key={edge.id}
                  edge={edge}
                  sourceNode={src}
                  targetNode={tgt}
                  isSelected={selectedEdgeId === edge.id}
                  workflowRunning={workflowRunning}
                  onClick={(e) => onEdgeClick(e, edge.id)}
                />
              );
            })}

            {/* 正在绘制的临时连线 */}
            {connectingState && (() => {
              const src = nodes.find((n) => n.id === connectingState.sourceId);
              if (!src) return null;
              const op = outputPort(src);
              return (
                <path
                  d={`M${op.x},${op.y} C${op.x + Math.abs(connectingState.curX - op.x) * 0.5},${op.y} ${connectingState.curX - Math.abs(connectingState.curX - op.x) * 0.5},${connectingState.curY} ${connectingState.curX},${connectingState.curY}`}
                  fill="none"
                  stroke={`url(#edge-grad-${src.type})`}
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                  opacity={0.75}
                />
              );
            })()}
          </g>
        </svg>

        {/* 节点层 */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 2 }}
        >
          <div
            className="absolute"
            style={{
              transform: `translate(${transform.x}px,${transform.y}px) scale(${transform.scale})`,
              transformOrigin: "0 0",
            }}
          >
            {nodes.map((node) => (
              <WorkflowNode
                key={node.id}
                node={node}
                isSelected={selectedNodeId === node.id}
                isDragging={draggingNodeId === node.id}
                workflowRunning={workflowRunning}
                onMouseDown={onNodeMouseDown}
                onInputPortMouseUp={onInputPortMouseUp}
                onOutputPortMouseDown={onOutputPortMouseDown}
                onDelete={onDeleteNode}
              />
            ))}
          </div>
        </div>

        {/* 删除边按钮 */}
        {selectedEdgeId && (() => {
          const edge = edges.find((e) => e.id === selectedEdgeId);
          if (!edge) return null;
          const src = nodes.find((n) => n.id === edge.source);
          const tgt = nodes.find((n) => n.id === edge.target);
          if (!src || !tgt) return null;
          const op = outputPort(src);
          const ip = inputPort(tgt);
          const mx = ((op.x + ip.x) / 2) * transform.scale + transform.x;
          const my = ((op.y + ip.y) / 2) * transform.scale + transform.y;
          return (
            <button
              type="button"
              className="absolute z-10 w-6 h-6 rounded-full bg-rose-500/80 border border-rose-400/60 flex items-center justify-center text-white hover:bg-rose-500 transition-colors shadow-lg"
              style={{ left: mx - 12, top: my - 12 }}
              onClick={() => onDeleteEdge(selectedEdgeId)}
              title="删除连线"
            >
              <X className="w-3 h-3" />
            </button>
          );
        })()}

        {/* 空画布提示 */}
        <AnimatePresence>
          {nodes.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{ zIndex: 2 }}
            >
              <div className="text-center space-y-2">
                <ArrowRightCircle className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm text-slate-400 font-medium">
                  点击右下角 <span className="text-cyan-400">+</span> 添加节点
                </p>
                <p className="text-xs text-slate-300">拖拽节点端口可创建连线</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 连线流动动画 + 极光画布动画 */}
      <style>{`
        @keyframes dash-flow { to { stroke-dashoffset: -24; } }
        @keyframes aurora-shift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .aurora-canvas { animation: aurora-shift 18s ease infinite; }
      `}</style>
    </div>
  );
}
