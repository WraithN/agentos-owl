import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, PackagePlus, PackageMinus, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@owl-os/core';
import StarRating from './StarRating.js';
import DeleteConfirmDialog from './DeleteConfirmDialog.js';
import EditToolDialog from './EditToolDialog.js';
import { iconMap, TYPE_BADGE } from '../constants.js';
import type { MarketTool } from '../types.js';

export default function ToolCard({
  tool,
  installed,
  onToggle,
  onDelete,
  onSave,
  index,
}: {
  tool: MarketTool;
  installed: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onSave: (t: MarketTool) => void;
  index: number;
}) {
  const Icon = iconMap[tool.icon] ?? FileText;
  const badge = TYPE_BADGE[tool.toolType];
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [installing, setInstalling] = useState(false);

  function handleInstall(e: React.MouseEvent) {
    e.stopPropagation();
    if (installed) {
      onToggle();
      return;
    }
    setInstalling(true);
    setTimeout(() => {
      setInstalling(false);
      onToggle();
    }, 1800);
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04 }}
        onClick={() => setEditOpen(true)}
        className="glass glass-hover rounded-2xl p-4 flex flex-col h-full relative cursor-pointer hover:ring-1 hover:ring-amber-500/30 transition-all"
      >
        {/* 右上角常驻：安装 + 删除 */}
        <div className="absolute top-3 right-3 flex items-center gap-1">
          <button
            onClick={handleInstall}
            title={installed ? '卸载' : installing ? '安装中...' : '安装'}
            disabled={installing}
            className={cn(
              'p-1.5 rounded-lg transition-all',
              installing
                ? 'text-cyan-400 bg-cyan-500/15'
                : installed
                  ? 'text-emerald-400 bg-emerald-500/15 hover:text-rose-400 hover:bg-rose-500/15'
                  : 'text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/15'
            )}
          >
            {installing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : installed ? (
              <PackageMinus className="w-3.5 h-3.5" />
            ) : (
              <PackagePlus className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={e => {
              e.stopPropagation();
              setConfirmDelete(true);
            }}
            title="删除"
            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-start gap-3 mb-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br', tool.iconBg)}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1 pr-20">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{tool.name}</span>
              {tool.official && (
                <span className="text-[10px] bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded font-medium">
                  官方
                </span>
              )}
              <span className={cn('text-[10px] border px-1.5 py-0.5 rounded font-medium', badge.cls)}>{badge.label}</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {tool.developer} · v{tool.version}
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed flex-1 text-pretty">{tool.description}</p>
        <div className="flex flex-wrap gap-1 mt-2">
          {tool.needsApiKey && (
            <span className="text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 px-1.5 py-0.5 rounded">
              需 API Key
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <StarRating value={tool.rating} />
            <span className="text-xs text-slate-500">{(tool.installs / 1000).toFixed(0)}k</span>
          </div>
          <span
            className={cn(
              'text-[10px] font-medium px-2 py-1 rounded-lg border',
              installing
                ? 'bg-cyan-500/15 text-cyan-500 dark:text-cyan-400 border-cyan-500/25'
                : installed
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-500 border-[var(--border-subtle)]'
            )}
          >
            {installing ? '安装中...' : installed ? '已安装' : '未安装'}
          </span>
        </div>
      </motion.div>
      <AnimatePresence>
        {confirmDelete && (
          <DeleteConfirmDialog
            name={tool.name}
            onCancel={() => setConfirmDelete(false)}
            onConfirm={() => {
              setConfirmDelete(false);
              onDelete();
            }}
          />
        )}
        {editOpen && (
          <EditToolDialog
            tool={tool}
            onClose={() => setEditOpen(false)}
            onSave={t => {
              onSave(t);
              setEditOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
