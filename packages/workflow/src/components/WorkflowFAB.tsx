import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { NODE_DEFS } from "../constants.js";
import type { NodeType } from "../types.js";

interface WorkflowFABProps {
  open: boolean;
  onToggle: () => void;
  onAdd: (type: NodeType) => void;
}

export function WorkflowFAB({ open, onToggle, onAdd }: WorkflowFABProps) {
  return (
    <div className="absolute bottom-10 right-5 z-30 flex flex-col items-end gap-2">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-1 p-2 rounded-2xl border border-white/15 shadow-2xl"
            style={{ background: "rgba(12,12,24,0.92)", backdropFilter: "blur(20px)" }}
          >
            {(Object.entries(NODE_DEFS) as [NodeType, (typeof NODE_DEFS)[NodeType]][]).map(
              ([type, def]) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => onAdd(type)}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold transition-all hover:scale-[1.02] active:scale-95 whitespace-nowrap"
                  style={{
                    border: `1.5px solid rgba(${def.glowRgb},0.35)`,
                    background: `rgba(${def.glowRgb},0.08)`,
                    color: def.gradFrom,
                  }}
                >
                  {def.icon}
                  <span>{def.label}</span>
                </button>
              )
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 圆形 + 按钮 */}
      <motion.button
        type="button"
        onClick={onToggle}
        animate={{ rotate: open ? 45 : 0 }}
        transition={{ duration: 0.2 }}
        className="w-12 h-12 rounded-full flex items-center justify-center shadow-xl text-white transition-all hover:scale-110 active:scale-95"
        style={{
          background: "linear-gradient(135deg, #00F5A0, #00D4FF)",
          boxShadow: "0 4px 20px rgba(0,245,160,0.45)",
        }}
        title="添加节点"
      >
        <Plus className="w-6 h-6" />
      </motion.button>
    </div>
  );
}
