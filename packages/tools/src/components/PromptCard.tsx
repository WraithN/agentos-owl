import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Pencil, Bookmark, BookmarkIcon, Copy, Trash2 } from 'lucide-react';
import { cn } from '@owl-os/core';
import DeleteConfirmDialog from './DeleteConfirmDialog.js';
import EditPromptDialog from './EditPromptDialog.js';
import type { PromptItem } from '../types.js';

export default function PromptCard({
  item,
  onDelete,
  onFav,
  onSave,
  index,
}: {
  item: PromptItem;
  onDelete: () => void;
  onFav: () => void;
  onSave: (p: PromptItem) => void;
  index: number;
}) {
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  function copy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(item.content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04 }}
        onClick={() => setEditOpen(true)}
        className="glass glass-hover rounded-2xl p-4 flex flex-col h-full cursor-pointer hover:ring-1 hover:ring-violet-500/30 transition-all"
      >
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-violet-500 to-purple-600">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.name}</span>
              {item.official && (
                <span className="text-[10px] bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded font-medium">
                  官方
                </span>
              )}
            </div>
            <div className="flex gap-1 flex-wrap mt-0.5">
              {item.tags.map(t => (
                <span key={t} className="text-[10px] text-slate-500 bg-slate-100 dark:bg-white/8 px-1.5 rounded">
                  {t}
                </span>
              ))}
            </div>
          </div>
          {/* 常驻操作按钮 */}
          <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
            <button
              onClick={e => {
                e.stopPropagation();
                setEditOpen(true);
              }}
              title="编辑"
              className="p-1.5 rounded-lg text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 transition-all"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onFav();
              }}
              title={item.isFavorite ? '取消常用' : '添加到常用'}
              className={cn(
                'p-1.5 rounded-lg transition-all',
                item.isFavorite ? 'text-amber-400 bg-amber-500/15' : 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10'
              )}
            >
              {item.isFavorite ? <Bookmark className="w-3.5 h-3.5 fill-amber-400" /> : <BookmarkIcon className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={copy}
              title={copied ? '已复制' : '复制提示词'}
              className={cn(
                'p-1.5 rounded-lg transition-all',
                copied ? 'text-emerald-500 bg-emerald-500/10' : 'text-slate-400 hover:text-cyan-500 hover:bg-cyan-500/10'
              )}
            >
              <Copy className="w-3.5 h-3.5" />
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
        </div>
        <p className="text-xs text-slate-500 leading-relaxed flex-1 text-pretty">{item.description}</p>
        <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
          <p className="text-[10px] text-slate-400 font-mono line-clamp-2 leading-relaxed">{item.content}</p>
        </div>
      </motion.div>
      <AnimatePresence>
        {confirmDelete && (
          <DeleteConfirmDialog
            name={item.name}
            onCancel={() => setConfirmDelete(false)}
            onConfirm={() => {
              setConfirmDelete(false);
              onDelete();
            }}
          />
        )}
        {editOpen && (
          <EditPromptDialog
            item={item}
            onClose={() => setEditOpen(false)}
            onSave={p => {
              onSave(p);
              setEditOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
