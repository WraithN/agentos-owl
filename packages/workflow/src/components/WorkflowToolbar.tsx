import {
  Play,
  Square,
  RotateCcw,
  Save,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";
import { cn } from "@owl-os/core";

interface WorkflowToolbarProps {
  title: string;
  isDirty: boolean;
  editingTitle: boolean;
  titleDraft: string;
  workflowRunning: boolean;
  onTitleClick: () => void;
  onTitleChange: (value: string) => void;
  onTitleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onTitleBlur: () => void;
  titleInputRef: React.RefObject<HTMLInputElement | null>;
  onSave: () => void;
  onToggleRun: () => void;
  onResetView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetCanvas: () => void;
}

export function WorkflowToolbar({
  title,
  isDirty,
  editingTitle,
  titleDraft,
  workflowRunning,
  onTitleClick,
  onTitleChange,
  onTitleKeyDown,
  onTitleBlur,
  titleInputRef,
  onSave,
  onToggleRun,
  onResetView,
  onZoomIn,
  onZoomOut,
  onResetCanvas,
}: WorkflowToolbarProps) {
  return (
    <div
      className="h-10 shrink-0 flex items-center gap-0.5 px-3 border-b"
      style={{
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "blur(20px)",
        borderColor: "rgba(148,163,184,0.15)",
      }}
    >
      {/* 组1：内联标题（可编辑）+ 保存按钮紧跟其后 */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        {editingTitle ? (
          <input
            ref={titleInputRef}
            value={titleDraft}
            onChange={(e) => onTitleChange(e.target.value)}
            onKeyDown={onTitleKeyDown}
            onBlur={onTitleBlur}
            className="text-xs font-semibold text-slate-700 bg-white border border-cyan-400/60 rounded-lg px-2 py-0.5 outline-none max-w-[200px] shadow-sm"
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={onTitleClick}
            className="flex items-center gap-1.5 group max-w-[200px] hover:bg-slate-100 rounded-lg px-2 py-0.5 transition-colors"
            title="点击编辑标题"
          >
            <span className="text-xs font-semibold text-slate-600 truncate">
              {title}
            </span>
            {isDirty ? (
              <span
                className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"
                title="有未保存的更改"
              />
            ) : (
              <span
                className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 opacity-60"
                title="已保存"
              />
            )}
          </button>
        )}
        {/* 保存按钮紧跟标题 */}
        <button
          type="button"
          onClick={onSave}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0",
            isDirty
              ? "text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200"
              : "text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
          )}
          title={isDirty ? "保存更改" : "已保存"}
        >
          <Save className="w-3 h-3" />
          {isDirty ? "保存" : "已保存"}
        </button>
      </div>

      {/* 组2：运行/停止 */}
      <div className="flex items-center gap-0.5">
        {/* 运行 / 停止 — 极光主按钮 */}
        <button
          type="button"
          onClick={onToggleRun}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold text-white transition-all hover:opacity-90 active:scale-95"
          style={{
            background: workflowRunning
              ? "linear-gradient(135deg, #F43F5E, #EC4899)"
              : "linear-gradient(135deg, #00F5A0, #00D4FF)",
            boxShadow: workflowRunning
              ? "0 3px 12px rgba(244,63,94,0.35)"
              : "0 3px 12px rgba(0,245,160,0.35)",
          }}
          title={workflowRunning ? "停止" : "运行"}
        >
          {workflowRunning ? (
            <Square className="w-3 h-3" />
          ) : (
            <Play className="w-3 h-3" />
          )}
          {workflowRunning ? "停止" : "运行"}
        </button>
      </div>

      {/* 分隔线 */}
      <div className="w-px h-4 bg-slate-200 mx-1.5 shrink-0" />

      {/* 组3：视图控制 */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={onResetView}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title="重置视图"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onZoomIn}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title="放大"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onZoomOut}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title="缩小"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onResetCanvas}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title="重置画布"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
