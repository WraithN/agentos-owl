import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Pencil, Bookmark, Trash2 } from 'lucide-react';
import { cn } from '@owl-os/core';
import StarRating from './StarRating.js';
import DeleteConfirmDialog from './DeleteConfirmDialog.js';
import EditSkillDialog from './EditSkillDialog.js';
import { iconMap } from '../constants.js';
import type { SkillItem } from '../types.js';

export default function SkillCard({
  item,
  onDelete,
  onFav,
  onSave,
  faved,
  index,
}: {
  item: SkillItem;
  onDelete: () => void;
  onFav: () => void;
  onSave: (s: SkillItem) => void;
  faved: boolean;
  index: number;
}) {
  const Icon = iconMap[item.icon] ?? Zap;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04 }}
        onClick={() => setEditOpen(true)}
        className="glass glass-hover rounded-2xl p-4 flex flex-col h-full relative cursor-pointer hover:ring-1 hover:ring-cyan-500/30 transition-all"
      >
        {/* 右上角常驻按钮 */}
        <div className="absolute top-3 right-3 flex items-center gap-1">
          <button
            onClick={e => {
              e.stopPropagation();
              setEditOpen(true);
            }}
            title="编辑"
            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={e => {
              e.stopPropagation();
              onFav();
            }}
            title={faved ? '取消常用' : '添加到常用'}
            className={cn(
              'p-1.5 rounded-lg transition-all',
              faved ? 'text-amber-400 bg-amber-500/15' : 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10'
            )}
          >
            <Bookmark className={cn('w-3.5 h-3.5', faved && 'fill-amber-400')} />
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
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br', item.iconBg)}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1 pr-24">
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
        </div>
        <p className="text-xs text-slate-500 leading-relaxed flex-1 text-pretty">{item.description}</p>
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border-subtle)]">
          <StarRating value={item.stars} />
          <span className="text-xs text-slate-500">{item.installs > 0 ? `${(item.installs / 1000).toFixed(1)}k` : '新建'}</span>
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
          <EditSkillDialog
            item={item}
            onClose={() => setEditOpen(false)}
            onSave={s => {
              onSave(s);
              setEditOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
