import { motion } from "framer-motion";
import { X } from "lucide-react";
import { NODE_W, NODE_H, NODE_DEFS } from "../constants.js";
import type { CanvasNode } from "../types.js";

interface WorkflowNodeProps {
  node: CanvasNode;
  isSelected: boolean;
  isDragging: boolean;
  workflowRunning: boolean;
  onMouseDown: (e: React.MouseEvent, nodeId: string) => void;
  onInputPortMouseUp: (e: React.MouseEvent, nodeId: string) => void;
  onOutputPortMouseDown: (e: React.MouseEvent, nodeId: string) => void;
  onDelete: (nodeId: string) => void;
}

export function WorkflowNode({
  node,
  isSelected,
  isDragging,
  workflowRunning,
  onMouseDown,
  onInputPortMouseUp,
  onOutputPortMouseDown,
  onDelete,
}: WorkflowNodeProps) {
  const def = NODE_DEFS[node.type];

  return (
    <motion.div
      key={node.id}
      animate={{ x: node.x, y: node.y }}
      transition={{ type: "spring", stiffness: 220, damping: 28 }}
      whileHover={{ y: node.y - 2 }}
      className="absolute pointer-events-auto"
      style={{
        left: 0,
        top: 0,
        width: NODE_W,
        height: NODE_H,
        borderRadius: 16,
        border: "2px solid transparent",
        backgroundImage: `linear-gradient(rgba(255,255,255,0.88), rgba(255,255,255,0.88)), linear-gradient(135deg, ${def.gradFrom}, ${def.gradTo})`,
        backgroundOrigin: "border-box",
        backgroundClip: "padding-box, border-box",
        backdropFilter: "blur(16px) saturate(180%)",
        boxShadow: isSelected
          ? `0 0 0 3px rgba(${def.glowRgb},0.35), 0 8px 32px rgba(${def.glowRgb},0.25), inset 0 0 0 1px rgba(255,255,255,0.7)`
          : `0 4px 20px rgba(0,0,0,0.07), 0 0 22px rgba(${def.glowRgb},0.16), inset 0 0 0 1px rgba(255,255,255,0.55)`,
        cursor: isDragging ? "grabbing" : "grab",
        transition: "box-shadow 0.2s ease",
      }}
      onMouseDown={(e) => onMouseDown(e, node.id)}
    >
      {/* 输入端口 */}
      {def.hasInput && (
        <div
          className="absolute w-3 h-3 rounded-full border-2 bg-white transition-transform hover:scale-125 pointer-events-auto"
          style={{
            left: -6,
            top: NODE_H / 2 - 6,
            cursor: "crosshair",
            borderColor: def.gradFrom,
            boxShadow: `0 0 6px rgba(${def.glowRgb},0.5)`,
          }}
          onMouseUp={(e) => onInputPortMouseUp(e, node.id)}
          title="输入端口"
        />
      )}

      {/* 节点内容 */}
      <div className="absolute inset-0 px-3 py-2 flex flex-col justify-between">
        <div className="flex items-center justify-between gap-1">
          <div
            className="flex items-center gap-1.5 min-w-0"
            style={{ color: def.gradFrom }}
          >
            {def.icon}
            <span className="text-[11px] font-semibold truncate text-slate-700">
              {node.name}
            </span>
          </div>
          <button
            type="button"
            className="shrink-0 w-4 h-4 rounded-md hover:bg-rose-100 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors pointer-events-auto"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node.id);
            }}
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span
            className="text-[9px] px-1.5 py-0.5 rounded-md font-mono uppercase tracking-wider font-semibold"
            style={{
              color: def.gradFrom,
              background: `rgba(${def.glowRgb},0.1)`,
              border: `1px solid rgba(${def.glowRgb},0.2)`,
            }}
          >
            {node.type}
          </span>
          {workflowRunning && (
            <span
              className="text-[9px] font-semibold animate-pulse"
              style={{ color: "#00D4FF" }}
            >
              ● 运行中
            </span>
          )}
        </div>
      </div>

      {/* 输出端口 */}
      {def.hasOutput && (
        <div
          className="absolute w-3 h-3 rounded-full border-2 bg-white transition-transform hover:scale-125 pointer-events-auto"
          style={{
            right: -6,
            top: NODE_H / 2 - 6,
            cursor: "crosshair",
            borderColor: def.gradTo,
            boxShadow: `0 0 6px rgba(${def.glowRgb},0.5)`,
          }}
          onMouseDown={(e) => onOutputPortMouseDown(e, node.id)}
          title="输出端口，拖拽连线"
        />
      )}
    </motion.div>
  );
}
