import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Check, Pencil, Star, X } from 'lucide-react';
import { cn } from '@owl-os/core';
import type { KBShellTab } from '../types.js';

interface KBPageShellProps {
  name: string;
  isGlobal: boolean;
  icon: React.ReactNode;
  tabs: KBShellTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  onBack: () => void;
  onRename: (name: string) => void;
  onSetGlobal: () => void;
  children: React.ReactNode;
}

export default function KBPageShell({
  name, isGlobal, icon, tabs, activeTab, onTabChange,
  onBack, onRename, onSetGlobal, children,
}: KBPageShellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  function commitRename() {
    if (draft.trim()) onRename(draft.trim());
    else setDraft(name);
    setEditing(false);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── 顶部栏 ── */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--border-subtle)] shrink-0">
        {/* 返回 */}
        <button onClick={onBack}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 transition-colors shrink-0">
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* 图标 */}
        <div className="shrink-0">{icon}</div>

        {/* 可编辑标题 */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {editing ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setDraft(name); setEditing(false); } }}
                className="text-sm font-semibold bg-transparent border-b border-cyan-500/60 outline-none text-slate-900 dark:text-white min-w-0 w-48"
              />
              <button onClick={commitRename} className="p-1 rounded text-emerald-400 hover:bg-emerald-500/10 transition-colors"><Check className="w-3.5 h-3.5" /></button>
              <button onClick={() => { setDraft(name); setEditing(false); }} className="p-1 rounded text-slate-400 hover:bg-black/8 dark:hover:bg-white/8 transition-colors"><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0 group/title">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{name}</span>
              <button onClick={() => { setDraft(name); setEditing(true); }}
                className="p-1 rounded text-slate-400 opacity-0 group-hover/title:opacity-100 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all shrink-0">
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* 设为全局 */}
        <button onClick={onSetGlobal}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all shrink-0',
            isGlobal
              ? 'bg-amber-500/15 text-amber-500 dark:text-amber-400 border-amber-500/25'
              : 'text-slate-400 border-[var(--border-subtle)] hover:border-amber-500/30 hover:text-amber-400 hover:bg-amber-500/8'
          )}>
          <Star className={cn('w-3.5 h-3.5', isGlobal && 'fill-amber-400')} />
          {isGlobal ? '已设为全局' : '设为全局'}
        </button>
      </div>

      {/* ── Tab 栏 ── */}
      <div className="flex gap-0.5 px-4 border-b border-[var(--border-subtle)] shrink-0">
        {tabs.map(t => {
          const active = activeTab === t.id;
          return (
            <button key={t.id} onClick={() => onTabChange(t.id)}
              className={cn('relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors',
                active ? 'text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300')}>
              {t.icon}
              {t.label}
              {active && (
                <motion.div layoutId="kb-shell-tab-line"
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full"
                  style={{ background: 'linear-gradient(90deg,#00b89a,#7c3aed)' }} />
              )}
            </button>
          );
        })}
      </div>

      {/* ── 内容区 ── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }} className="h-full flex flex-col overflow-hidden">
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
