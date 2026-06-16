import { useState } from 'react';
import { Plus, Save, Trash2, Layers } from 'lucide-react';
import { cn } from '@owl-os/core';
import Modal from './Modal.js';
import type { OntClass, OntEntity } from './types.js';

const inputCls = 'w-full px-3 py-2 text-xs rounded-xl border border-[var(--border-subtle)] bg-black/5 dark:bg-white/5 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-violet-500/50 transition-colors';
const labelCls = 'text-xs text-slate-500 font-medium mb-1 block';
const btnCancel = 'px-4 py-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 rounded-xl transition-colors';
const btnPrimary = 'flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white btn-aurora rounded-xl hover:opacity-90 transition-opacity';

export default function EntityModal({ initial, classes, onClose, onSave }: {
  initial?: OntEntity;
  classes: OntClass[];
  onClose: () => void;
  onSave: (e: Omit<OntEntity, 'id'>) => void;
}) {
  const [classId, setClassId] = useState(initial?.classId ?? classes[0]?.id ?? '');
  const [label, setLabel] = useState(initial?.label ?? '');
  const [attrs, setAttrs] = useState<{ k: string; v: string }[]>(
    initial ? Object.entries(initial.attributes).map(([k, v]) => ({ k, v })) : []
  );
  const cls = classes.find(c => c.id === classId);

  return (
    <Modal title={initial ? '编辑实体' : '新建实体实例'} icon={<Layers className="w-4 h-4 text-cyan-400" />} onClose={onClose}
      footer={<><button onClick={onClose} className={btnCancel}>取消</button><button onClick={() => { if (!label.trim()) return; const a: Record<string, string> = {}; attrs.filter(x => x.k.trim()).forEach(x => { a[x.k] = x.v; }); onSave({ classId, label: label.trim(), attributes: a }); }} className={btnPrimary}><Save className="w-3.5 h-3.5" />{initial ? '保存' : '创建'}</button></>}>
      <div>
        <label className={labelCls}>所属类 *</label>
        <select value={classId} onChange={e => setClassId(e.target.value)} className={inputCls}>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div><label className={labelCls}>实体标签 *</label><input value={label} onChange={e => setLabel(e.target.value)} placeholder="如 张三" className={inputCls} /></div>
      <div>
        <div className="flex items-center justify-between mb-2"><label className={labelCls + ' !mb-0'}>属性值</label><button onClick={() => setAttrs(a => [...a, { k: '', v: '' }])} className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5 transition-colors"><Plus className="w-3 h-3" />添加</button></div>
        {cls?.properties.map(p => {
          const idx = attrs.findIndex(a => a.k === p.name);
          const val = idx >= 0 ? attrs[idx].v : '';
          const setVal = (v: string) => {
            if (idx >= 0) setAttrs(a => a.map((x, i) => i === idx ? { ...x, v } : x));
            else setAttrs(a => [...a, { k: p.name, v }]);
          };
          return (
            <div key={p.name} className="flex items-center gap-2 mb-2">
              <span className="text-xs text-slate-400 w-24 shrink-0">{p.name}</span>
              <input value={val} onChange={e => setVal(e.target.value)} placeholder={p.type} className={cn(inputCls, 'flex-1')} />
            </div>
          );
        })}
        {attrs.filter(a => !cls?.properties.find(p => p.name === a.k)).map((a, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <input value={a.k} onChange={e => setAttrs(arr => arr.map((x, j) => j === i ? { ...x, k: e.target.value } : x))} placeholder="属性名" className={cn(inputCls, 'flex-1')} />
            <input value={a.v} onChange={e => setAttrs(arr => arr.map((x, j) => j === i ? { ...x, v: e.target.value } : x))} placeholder="属性值" className={cn(inputCls, 'flex-1')} />
            <button onClick={() => setAttrs(arr => arr.filter((_, j) => j !== i))} className="p-1 text-slate-500 hover:text-rose-400 transition-colors shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        ))}
      </div>
    </Modal>
  );
}
