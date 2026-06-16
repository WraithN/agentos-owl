import { useState } from 'react';
import { Save, GitBranch } from 'lucide-react';
import { cn } from '@owl-os/core';
import Modal from './Modal.js';
import type { OntClass, OntRelation } from './types.js';

const inputCls = 'w-full px-3 py-2 text-xs rounded-xl border border-[var(--border-subtle)] bg-black/5 dark:bg-white/5 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-violet-500/50 transition-colors';
const labelCls = 'text-xs text-slate-500 font-medium mb-1 block';
const btnCancel = 'px-4 py-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 rounded-xl transition-colors';
const btnPrimary = 'flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white btn-aurora rounded-xl hover:opacity-90 transition-opacity';

export default function RelationModal({ initial, classes, onClose, onSave }: {
  initial?: OntRelation;
  classes: OntClass[];
  onClose: () => void;
  onSave: (r: Omit<OntRelation, 'id'>) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [domain, setDomain] = useState(initial?.domain ?? classes[0]?.name ?? '');
  const [range, setRange] = useState(initial?.range ?? classes[0]?.name ?? '');
  const [card, setCard] = useState(initial?.cardinality ?? '1:N');
  const [desc, setDesc] = useState(initial?.description ?? '');
  const cardOptions = ['1:1', '1:N', 'N:1', 'N:M'];
  const classNames = classes.map(c => c.name);

  return (
    <Modal title={initial ? '编辑关系' : '定义关系'} icon={<GitBranch className="w-4 h-4 text-violet-400" />} onClose={onClose}
      footer={<><button onClick={onClose} className={btnCancel}>取消</button><button onClick={() => { if (!name.trim()) return; onSave({ name: name.trim(), domain, range, cardinality: card, description: desc }); }} className={btnPrimary}><Save className="w-3.5 h-3.5" />{initial ? '保存' : '定义'}</button></>}>
      <div><label className={labelCls}>关系名 *</label><input value={name} onChange={e => setName(e.target.value)} placeholder="如 worksFor" className={inputCls} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelCls}>主语（Domain）</label><select value={domain} onChange={e => setDomain(e.target.value)} className={inputCls}>{classNames.map(n => <option key={n}>{n}</option>)}</select></div>
        <div><label className={labelCls}>宾语（Range）</label><select value={range} onChange={e => setRange(e.target.value)} className={inputCls}>{classNames.map(n => <option key={n}>{n}</option>)}</select></div>
      </div>
      <div>
        <label className={labelCls}>基数约束</label>
        <div className="grid grid-cols-4 gap-2">{cardOptions.map(o => (
          <button key={o} onClick={() => setCard(o)} className={cn('py-1.5 text-xs rounded-xl border transition-all', card === o ? 'border-violet-500 bg-violet-500/15 text-violet-600 dark:text-violet-300 font-semibold' : 'border-[var(--border-subtle)] text-slate-500 dark:text-slate-400 hover:border-violet-500/30')}>{o}</button>
        ))}</div>
      </div>
      <div><label className={labelCls}>描述</label><textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} className={cn(inputCls, 'resize-none')} /></div>
    </Modal>
  );
}
