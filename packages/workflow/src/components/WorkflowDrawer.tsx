import { AnimatePresence, motion } from "framer-motion";
import { X, List, Check, Play, Trash2, ChevronDown } from "lucide-react";
import { cn } from "@owl-os/core";
import type { SavedWorkflow } from "../types.js";

interface WorkflowDrawerProps {
  open: boolean;
  workflows: SavedWorkflow[];
  currentId: string;
  isDirty: boolean;
  page: number;
  pageSize: number;
  onClose: () => void;
  onLoad: (wf: SavedWorkflow) => void;
  onRun: (wf: SavedWorkflow) => void;
  onDeleteRequest: (id: string) => void;
  onPageChange: (page: number) => void;
}

export function WorkflowDrawer({
  open,
  workflows,
  currentId,
  isDirty,
  page,
  pageSize,
  onClose,
  onLoad,
  onRun,
  onDeleteRequest,
  onPageChange,
}: WorkflowDrawerProps) {
  return (
    <AnimatePresence>
      {open && (() => {
        const totalPages = Math.max(1, Math.ceil(workflows.length / pageSize));
        const safePage = Math.min(page, totalPages - 1);
        const pageItems = workflows.slice(
          safePage * pageSize,
          (safePage + 1) * pageSize
        );
        return (
          <>
            {/* 遮罩 */}
            <motion.div
              key="drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20"
              onClick={onClose}
            />
            {/* 右侧抽屉本体 */}
            <motion.div
              key="workflow-list-drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="absolute top-0 right-0 bottom-0 z-30 flex flex-col overflow-hidden"
              style={{
                width: 300,
                background: "rgba(255,255,255,0.97)",
                backdropFilter: "blur(24px)",
                borderLeft: "1px solid rgba(148,163,184,0.18)",
                boxShadow: "-8px 0 40px rgba(99,102,241,0.10)",
              }}
            >
              {/* 抽屉头 */}
              <div
                className="flex items-center gap-2 px-4 py-3 border-b shrink-0"
                style={{ borderColor: "rgba(148,163,184,0.15)" }}
              >
                <List className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                <span className="text-xs font-semibold text-slate-600 flex-1">
                  工作流列表 · {workflows.length} 个
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 列表项 */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {workflows.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-6">
                    暂无已保存的工作流
                  </p>
                )}
                {pageItems.map((wf) => {
                  const isActive = wf.id === currentId;
                  return (
                    <div
                      key={wf.id}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all group cursor-pointer border",
                        isActive
                          ? "border-violet-200"
                          : "border-transparent hover:bg-slate-50 hover:border-slate-100"
                      )}
                      style={isActive ? { background: "rgba(99,102,241,0.06)" } : {}}
                      onClick={() => {
                        if (isDirty && currentId !== wf.id) {
                          if (
                            window.confirm(
                              "当前工作流有未保存的更改，切换后将丢失。是否继续？"
                            )
                          ) {
                            onLoad(wf);
                          }
                        } else {
                          onLoad(wf);
                        }
                      }}
                    >
                      {/* 选中标记 */}
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                        style={
                          isActive
                            ? { background: "rgba(99,102,241,0.2)" }
                            : { background: "rgba(148,163,184,0.12)" }
                        }
                      >
                        {isActive && (
                          <Check className="w-2.5 h-2.5" style={{ color: "#6366F1" }} />
                        )}
                      </div>
                      {/* 名称 + 时间 */}
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-xs font-semibold truncate"
                          style={{ color: isActive ? "#6366F1" : "#374151" }}
                        >
                          {wf.name}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {wf.nodes.length} 节点 ·{" "}
                          {wf.savedAt.toLocaleString("zh-CN", {
                            month: "numeric",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      {isActive && isDirty && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded shrink-0 font-medium"
                          style={{
                            background: "rgba(245,158,11,0.1)",
                            color: "#F59E0B",
                            border: "1px solid rgba(245,158,11,0.25)",
                          }}
                        >
                          未保存
                        </span>
                      )}
                      {/* 执行 + 删除按钮 */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          type="button"
                          className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-emerald-50 text-slate-300 hover:text-emerald-500 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRun(wf);
                          }}
                          title="执行"
                        >
                          <Play className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteRequest(wf.id);
                          }}
                          title="删除"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 分页栏 */}
              {totalPages > 1 && (
                <div
                  className="flex items-center justify-between px-4 py-2 border-t shrink-0"
                  style={{ borderColor: "rgba(148,163,184,0.15)" }}
                >
                  <span className="text-[10px] text-slate-400">
                    第 {safePage + 1} / {totalPages} 页
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onPageChange(Math.max(0, safePage - 1))}
                      disabled={safePage === 0}
                      className={cn(
                        "p-1 rounded-lg transition-colors",
                        safePage === 0
                          ? "text-slate-300 cursor-not-allowed"
                          : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      <ChevronDown className="w-3.5 h-3.5 rotate-90" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => (
                      <button
                        type="button"
                        key={i}
                        onClick={() => onPageChange(i)}
                        className="w-5 h-5 rounded text-[10px] font-semibold transition-colors"
                        style={
                          i === safePage
                            ? { background: "rgba(99,102,241,0.15)", color: "#6366F1" }
                            : { color: "#94A3B8" }
                        }
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        onPageChange(Math.min(totalPages - 1, safePage + 1))
                      }
                      disabled={safePage === totalPages - 1}
                      className={cn(
                        "p-1 rounded-lg transition-colors",
                        safePage === totalPages - 1
                          ? "text-slate-300 cursor-not-allowed"
                          : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        );
      })()}
    </AnimatePresence>
  );
}
