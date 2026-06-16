import { motion } from "framer-motion";
import { LayoutGrid, List } from "lucide-react";
import { cn } from "@owl-os/core";

interface WorkflowStatusBarProps {
  savedCount: number;
  nodeCount: number;
  scale: number;
  layouting: boolean;
  listOpen: boolean;
  nodesEmpty: boolean;
  onAutoLayout: () => void;
  onToggleList: () => void;
}

export function WorkflowStatusBar({
  savedCount,
  nodeCount,
  scale,
  layouting,
  listOpen,
  nodesEmpty,
  onAutoLayout,
  onToggleList,
}: WorkflowStatusBarProps) {
  return (
    <div
      className="shrink-0 h-7 flex items-center gap-2 px-3 border-t text-[11px] text-slate-400"
      style={{
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "blur(20px)",
        borderColor: "rgba(148,163,184,0.15)",
      }}
    >
      {/* 左侧：自动布局按钮 */}
      <button
        type="button"
        onClick={onAutoLayout}
        disabled={layouting || nodesEmpty}
        className={cn(
          "flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-colors",
          layouting ? "text-cyan-300 cursor-not-allowed" : "text-cyan-500 hover:bg-cyan-50"
        )}
        title="自动布局"
      >
        <motion.span
          animate={layouting ? { rotate: 360 } : { rotate: 0 }}
          transition={
            layouting ? { duration: 1, repeat: Infinity, ease: "linear" } : {}
          }
          className="inline-flex"
        >
          <LayoutGrid className="w-3 h-3" />
        </motion.span>
        <span>调整</span>
      </button>
      <div className="w-px h-3.5 bg-slate-200 shrink-0" />
      <span>
        共 <b className="text-slate-600">{savedCount}</b> 个工作流
      </span>
      <span className="text-slate-300">·</span>
      <span>
        当前 <b className="text-slate-600">{nodeCount}</b> 个节点
      </span>
      <div className="flex-1" />
      <span className="font-mono text-slate-300">{Math.round(scale * 100)}%</span>
      <div className="w-px h-3.5 bg-slate-200 shrink-0" />
      {/* 右侧：列表按钮 */}
      <button
        type="button"
        onClick={onToggleList}
        className={cn(
          "flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-colors",
          listOpen
            ? "text-violet-600 bg-violet-100"
            : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
        )}
        title="工作流列表"
      >
        <List className="w-3 h-3" />
        <span>列表</span>
      </button>
    </div>
  );
}
