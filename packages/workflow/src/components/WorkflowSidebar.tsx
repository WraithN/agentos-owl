import { AnimatePresence, motion } from "framer-motion";
import { X, Save, Settings2, Trash2 } from "lucide-react";
import { cn, inputCls } from "@owl-os/core";
import { NODE_DEFS } from "../constants.js";
import type { CanvasNode } from "../types.js";

interface WorkflowSidebarProps {
  configPanelOpen: boolean;
  selectedNode: CanvasNode | null;
  configValues: Record<string, string>;
  onConfigChange: (values: Record<string, string>) => void;
  onConfigPanelClose: () => void;
  onSaveConfig: () => void;
  deleteConfirmId: string | null;
  workflowToDeleteName: string;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

export function WorkflowSidebar({
  configPanelOpen,
  selectedNode,
  configValues,
  onConfigChange,
  onConfigPanelClose,
  onSaveConfig,
  deleteConfirmId,
  workflowToDeleteName,
  onConfirmDelete,
  onCancelDelete,
}: WorkflowSidebarProps) {
  const baseInputCls = inputCls;

  return (
    <>
      {/* ── 右侧节点配置面板（极光玻璃风） ──────────────────────────────────── */}
      <AnimatePresence>
        {configPanelOpen && selectedNode && (
          <motion.div
            key="config-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 272, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="shrink-0 border-l flex flex-col overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.88)",
              backdropFilter: "blur(20px)",
              borderColor: "rgba(148,163,184,0.15)",
            }}
          >
            {/* 面板头 */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b shrink-0"
              style={{ borderColor: "rgba(148,163,184,0.12)" }}
            >
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-700">节点配置</span>
              </div>
              <button
                type="button"
                onClick={onConfigPanelClose}
                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 面板内容 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* 节点类型标签 */}
              <div
                className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-lg uppercase tracking-wider"
                style={{
                  color: NODE_DEFS[selectedNode.type].gradFrom,
                  background: `rgba(${NODE_DEFS[selectedNode.type].glowRgb},0.1)`,
                  border: `1px solid rgba(${NODE_DEFS[selectedNode.type].glowRgb},0.25)`,
                }}
              >
                {NODE_DEFS[selectedNode.type].icon}
                {NODE_DEFS[selectedNode.type].label}
              </div>

              {/* 节点名称 */}
              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1">
                  节点名称
                </label>
                <input
                  value={configValues.name ?? selectedNode.name}
                  onChange={(e) =>
                    onConfigChange({ ...configValues, name: e.target.value })
                  }
                  className={baseInputCls}
                  onFocus={(e) =>
                    (e.target.style.borderColor = NODE_DEFS[selectedNode.type].gradFrom)
                  }
                  onBlur={(e) => (e.target.style.borderColor = "")}
                />
              </div>

              {/* 动态字段 */}
              {NODE_DEFS[selectedNode.type].configFields.map((field) => (
                <div key={field.key}>
                  <label className="text-xs text-slate-500 font-medium block mb-1">
                    {field.label}
                  </label>
                  {field.multiline ? (
                    <textarea
                      value={configValues[field.key] ?? ""}
                      onChange={(e) =>
                        onConfigChange({ ...configValues, [field.key]: e.target.value })
                      }
                      placeholder={field.placeholder}
                      rows={3}
                      className={cn(baseInputCls, "resize-none leading-relaxed font-mono")}
                      onFocus={(e) =>
                        (e.target.style.borderColor =
                          NODE_DEFS[selectedNode.type].gradFrom)
                      }
                      onBlur={(e) => (e.target.style.borderColor = "")}
                    />
                  ) : (
                    <input
                      value={configValues[field.key] ?? ""}
                      onChange={(e) =>
                        onConfigChange({ ...configValues, [field.key]: e.target.value })
                      }
                      placeholder={field.placeholder}
                      className={baseInputCls}
                      onFocus={(e) =>
                        (e.target.style.borderColor =
                          NODE_DEFS[selectedNode.type].gradFrom)
                      }
                      onBlur={(e) => (e.target.style.borderColor = "")}
                    />
                  )}
                </div>
              ))}

              {/* 节点位置（只读） */}
              <div className="pt-1 border-t border-slate-100">
                <label className="text-xs text-slate-400 font-medium block mb-1">
                  位置
                </label>
                <div className="flex gap-2">
                  <span className="flex-1 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 text-[10px] font-mono text-slate-400">
                    X: {Math.round(selectedNode.x)}
                  </span>
                  <span className="flex-1 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 text-[10px] font-mono text-slate-400">
                    Y: {Math.round(selectedNode.y)}
                  </span>
                </div>
              </div>
            </div>

            {/* 保存按钮 */}
            <div className="p-4 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={onSaveConfig}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs text-white font-semibold transition-all hover:opacity-90 active:scale-95"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${NODE_DEFS[selectedNode.type].gradFrom}, ${NODE_DEFS[selectedNode.type].gradTo})`,
                  boxShadow: `0 4px 14px rgba(${NODE_DEFS[selectedNode.type].glowRgb},0.35)`,
                }}
              >
                <Save className="w-3.5 h-3.5" />
                保存节点配置
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 删除确认弹窗 ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div
            key="delete-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(6px)" }}
            onClick={(e) => e.target === e.currentTarget && onCancelDelete()}
          >
            <motion.div
              key="delete-modal"
              initial={{ opacity: 0, scale: 0.93, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 12 }}
              transition={{ type: "spring", stiffness: 340, damping: 30 }}
              className="w-full max-w-[calc(100%-2rem)] md:max-w-sm rounded-2xl shadow-2xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.95)",
                backdropFilter: "blur(24px)",
                border: "1px solid rgba(148,163,184,0.2)",
              }}
            >
              {/* 头部 */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(244,63,94,0.1)" }}
                  >
                    <Trash2 className="w-4 h-4 text-rose-500" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">删除工作流</span>
                </div>
                <button
                  type="button"
                  onClick={onCancelDelete}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {/* 内容 */}
              <div className="px-5 py-4">
                <p className="text-sm text-slate-600 leading-relaxed">
                  确定要删除工作流{" "}
                  <span className="font-semibold text-slate-800">
                    「{workflowToDeleteName}」
                  </span>{" "}
                  吗？
                </p>
                <p className="text-xs text-slate-400 mt-1.5">此操作不可撤销。</p>
              </div>
              {/* 操作 */}
              <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onCancelDelete}
                  className="px-4 py-2 rounded-xl text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={onConfirmDelete}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
                  style={{
                    background: "linear-gradient(135deg, #F43F5E, #EC4899)",
                    boxShadow: "0 4px 14px rgba(244,63,94,0.35)",
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  确认删除
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
