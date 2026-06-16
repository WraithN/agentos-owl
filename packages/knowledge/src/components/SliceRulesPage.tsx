import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, ChevronLeft, Scissors } from 'lucide-react';
import { cn } from '@owl-os/core';
import SliceRuleFormDialog from './SliceRuleFormDialog.js';
import DeleteConfirm from './DeleteConfirm.js';
import { DEFAULT_SLICE_RULES, STRATEGY_LABELS, STRATEGY_COLORS, PREPROCESS_OPTIONS } from '../constants.js';
import type { SliceRule, RuleFormData } from '../types.js';

export default function SliceRulesPage({ onBack }: { onBack: () => void }) {
  const [rules, setRules] = useState<SliceRule[]>(DEFAULT_SLICE_RULES);
  const [dialogMode, setDialogMode] = useState<null | 'new' | SliceRule>(null);
  const [deleteTarget, setDeleteTarget] = useState<SliceRule | null>(null);

  function handleSave(data: RuleFormData) {
    if (dialogMode === 'new') {
      setRules(prev => [...prev, { ...data, id: `sr-${Date.now()}` }]);
    } else if (dialogMode) {
      const t = dialogMode as SliceRule;
      setRules(prev => prev.map(r => r.id === t.id ? { ...r, ...data } : r));
    }
    setDialogMode(null);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 顶部 */}
      <div className="px-6 pt-5 pb-4 shrink-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <button onClick={onBack}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 px-2.5 py-1.5 rounded-lg transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />返回
            </button>
            <div className="h-4 w-px bg-[var(--border-subtle)]" />
            <div className="flex items-center gap-2">
              <Scissors className="w-5 h-5 text-violet-400" />
              <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">切片规则管理</h1>
            </div>
          </div>
          <button onClick={() => setDialogMode('new')}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white btn-aurora rounded-xl">
            <Plus className="w-3.5 h-3.5" />新建规则
          </button>
        </div>
        <p className="text-sm text-slate-500 ml-[88px]">管理文档向量化时使用的切片策略与预处理规则</p>
      </div>

      {/* 规则列表 */}
      <div className="flex-1 overflow-y-auto min-h-0 px-6 pb-6">
        <div className="rounded-2xl border border-[var(--border-subtle)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px]">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-black/3 dark:bg-white/3">
                  {['规则名称', '策略', '块大小', '重叠量', '预处理规则', '描述', '操作'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rules.map((rule, i) => (
                  <motion.tr key={rule.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-black/2 dark:hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{rule.name}</p>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={cn('text-[11px] border px-2 py-0.5 rounded-full font-medium', STRATEGY_COLORS[rule.strategy])}>
                        {STRATEGY_LABELS[rule.strategy]}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{rule.chunkSize}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{rule.overlap}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {rule.preprocess.length === 0
                          ? <span className="text-xs text-slate-400">—</span>
                          : rule.preprocess.map(pid => {
                            const opt = PREPROCESS_OPTIONS.find(o => o.id === pid);
                            return opt ? (
                              <span key={pid} className="text-[10px] bg-violet-500/10 text-violet-400 border border-violet-500/20 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                {opt.label.split('（')[0]}
                              </span>
                            ) : null;
                          })}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-xs text-slate-500 max-w-[180px] truncate">{rule.description || '—'}</p>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setDialogMode(rule)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-500 hover:bg-cyan-500/10 transition-colors" title="编辑">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteTarget(rule)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors" title="删除">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
                {rules.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">暂无切片规则，点击右上角新建</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 说明 */}
        <div className="mt-5 p-4 rounded-2xl border border-[var(--border-subtle)] bg-violet-500/5">
          <p className="text-xs font-semibold text-violet-400 mb-2">预处理规则说明</p>
          <ul className="space-y-1 text-xs text-slate-500">
            {PREPROCESS_OPTIONS.map(o => (
              <li key={o.id}>· <span className="text-slate-700 dark:text-slate-300">{o.label.split('（')[0]}</span>
                {o.label.includes('（') && <span>（{o.label.split('（')[1]}</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <AnimatePresence>
        {dialogMode !== null && (
          <SliceRuleFormDialog
            initial={dialogMode === 'new' ? null : ({ ...dialogMode } as RuleFormData)}
            onClose={() => setDialogMode(null)}
            onSave={handleSave} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {deleteTarget && (
          <DeleteConfirm title="确认删除" desc={`确定要删除切片规则「${deleteTarget.name}」吗？此操作不可撤销。`}
            onCancel={() => setDeleteTarget(null)}
            onConfirm={() => { setRules(p => p.filter(r => r.id !== deleteTarget.id)); setDeleteTarget(null); }} />
        )}
      </AnimatePresence>
    </div>
  );
}
