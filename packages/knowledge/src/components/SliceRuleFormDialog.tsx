import { useState } from 'react';
import { motion } from 'framer-motion';
import { Scissors, X, Plus, Check } from 'lucide-react';
import { cn } from '@owl-os/core';
import { DIALOG_BG, DIALOG_BD, STRATEGY_LABELS, STRATEGY_COLORS, PREPROCESS_OPTIONS, inputCls } from '../constants.js';
import type { Strategy, RuleFormData } from '../types.js';

type PreprocessId = typeof PREPROCESS_OPTIONS[number]['id'];

const emptyRuleForm = (): RuleFormData => ({
  name: '', strategy: 'fixed', chunkSize: 512, overlap: 64, separator: '\n', preprocess: [], description: '',
});

export default function SliceRuleFormDialog({ initial, onClose, onSave }: {
  initial: RuleFormData | null;
  onClose: () => void;
  onSave: (d: RuleFormData) => void;
}) {
  const [form, setForm] = useState<RuleFormData>(initial ?? emptyRuleForm());
  const [nameErr, setNameErr] = useState('');

  function upd<K extends keyof RuleFormData>(k: K, v: RuleFormData[K]) {
    setForm(f => ({ ...f, [k]: v }));
    if (k === 'name') setNameErr('');
  }

  function togglePreprocess(id: PreprocessId) {
    setForm(f => ({
      ...f,
      preprocess: f.preprocess.includes(id)
        ? f.preprocess.filter(p => p !== id)
        : [...f.preprocess, id],
    }));
  }

  function save() {
    if (!form.name.trim()) { setNameErr('规则名称不能为空'); return; }
    onSave({ ...form, name: form.name.trim() });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.17 }}
        className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        style={{ background: DIALOG_BG, border: `1px solid ${DIALOG_BD}`, backdropFilter: 'blur(24px)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: `1px solid ${DIALOG_BD}` }}>
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{initial ? '编辑切片规则' : '新建切片规则'}</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 p-5 space-y-4">
          {/* 名称 */}
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1">名称 <span className="text-rose-400">*</span></label>
            <input value={form.name} onChange={e => upd('name', e.target.value)} placeholder="规则名称" className={cn(inputCls, nameErr && 'border-rose-500/50')} />
            {nameErr && <p className="text-[10px] text-rose-400 mt-1">{nameErr}</p>}
          </div>

          {/* 策略类型 */}
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1.5 block">切割策略</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(STRATEGY_LABELS) as Strategy[]).map(s => (
                <button key={s} onClick={() => upd('strategy', s)}
                  className={cn('flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all text-left',
                    form.strategy === s
                      ? cn('border-[2px]', STRATEGY_COLORS[s])
                      : 'border-[var(--border-subtle)] text-slate-500 hover:bg-black/5 dark:hover:bg-white/5')}>
                  <span className="flex-1">{STRATEGY_LABELS[s]}</span>
                  {form.strategy === s && <span className="w-2 h-2 rounded-full bg-current shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* 块大小 + 重叠量 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1 block">块大小（token）</label>
              <input type="number" min={64} max={4096} value={form.chunkSize} onChange={e => upd('chunkSize', +e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1 block">重叠量（token）</label>
              <input type="number" min={0} max={512} value={form.overlap} onChange={e => upd('overlap', +e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* 分隔符 */}
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">分隔符</label>
            <input value={form.separator} onChange={e => upd('separator', e.target.value)} placeholder="如 \n 或 \n\n" className={inputCls} />
          </div>

          {/* 预处理规则（多选） */}
          <div>
            <label className="text-xs text-slate-500 font-medium mb-2 block">预处理规则 <span className="text-slate-400 font-normal">（可多选）</span></label>
            <div className="space-y-2">
              {PREPROCESS_OPTIONS.map(opt => {
                const checked = form.preprocess.includes(opt.id);
                return (
                  <button key={opt.id} onClick={() => togglePreprocess(opt.id)}
                    className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all',
                      checked
                        ? 'bg-violet-500/8 border-violet-500/30 text-violet-400'
                        : 'border-[var(--border-subtle)] text-slate-500 hover:bg-black/4 dark:hover:bg-white/4 hover:border-violet-500/20')}>
                    <div className={cn('w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors',
                      checked ? 'bg-violet-500' : 'border border-slate-400 dark:border-slate-600')}>
                      {checked && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <span className="text-xs leading-snug">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 描述 */}
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">描述</label>
            <textarea value={form.description} onChange={e => upd('description', e.target.value)} rows={3}
              placeholder="简要描述该切片规则的使用场景..."
              className={cn(inputCls, 'resize-none leading-relaxed')} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 shrink-0" style={{ borderTop: `1px solid ${DIALOG_BD}` }}>
          <button onClick={onClose} className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 rounded-xl transition-colors">取消</button>
          <button onClick={save} className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white btn-aurora rounded-xl">
            <Plus className="w-3.5 h-3.5" />{initial ? '保存修改' : '创建规则'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
