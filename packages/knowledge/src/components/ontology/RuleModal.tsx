import { useState } from 'react';
import { Save, Brain, ArrowRight } from 'lucide-react';
import { cn } from '@owl-os/core';
import Modal from './Modal.js';
import type { OntRule } from './types.js';

const inputCls = 'w-full px-3 py-2 text-xs rounded-xl border border-[var(--border-subtle)] bg-black/5 dark:bg-white/5 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-violet-500/50 transition-colors';
const labelCls = 'text-xs text-slate-500 font-medium mb-1 block';
const btnCancel = 'px-4 py-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 rounded-xl transition-colors';
const btnPrimary = 'flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white btn-aurora rounded-xl hover:opacity-90 transition-opacity';

export default function RuleModal({ initial, onClose, onSave }: {
  initial?: OntRule;
  onClose: () => void;
  onSave: (r: Omit<OntRule, 'id' | 'enabled'>) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [cond, setCond] = useState(initial?.condition ?? '');
  const [concl, setConcl] = useState(initial?.conclusion ?? '');

  return (
    <Modal title={initial ? '编辑规则' : '添加推理规则'} icon={<Brain className="w-4 h-4 text-violet-400" />} onClose={onClose}
      footer={<><button onClick={onClose} className={btnCancel}>取消</button><button onClick={() => { if (!name.trim() || !cond.trim() || !concl.trim()) return; onSave({ name: name.trim(), condition: cond.trim(), conclusion: concl.trim() }); }} className={btnPrimary}><Save className="w-3.5 h-3.5" />{initial ? '保存' : '添加'}</button></>}>
      <div><label className={labelCls}>规则名 *</label><input value={name} onChange={e => setName(e.target.value)} placeholder="如 管理者推断" className={inputCls} /></div>
      <div><label className={labelCls}>前提条件 *（SWRL/伪逻辑语法）</label><textarea value={cond} onChange={e => setCond(e.target.value)} rows={3} placeholder="Employee(?x) ∧ manages(?x, ?y)" className={cn(inputCls, 'resize-none font-mono')} /></div>
      <div className="flex items-center gap-2 px-3"><div className="flex-1 h-px bg-violet-500/20" /><ArrowRight className="w-3.5 h-3.5 text-violet-400 shrink-0" /><div className="flex-1 h-px bg-violet-500/20" /></div>
      <div><label className={labelCls}>结论 *</label><textarea value={concl} onChange={e => setConcl(e.target.value)} rows={2} placeholder="isManagerOf(?x, ?y)" className={cn(inputCls, 'resize-none font-mono')} /></div>
    </Modal>
  );
}
