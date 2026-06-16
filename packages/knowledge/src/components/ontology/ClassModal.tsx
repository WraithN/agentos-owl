import { useState } from 'react';
import { Plus, Save, Trash2, Box } from 'lucide-react';
import { cn } from '@owl-os/core';
import Modal from './Modal.js';
import type { OntClass } from './types.js';
import { PROP_TYPES } from './mock.js';

const inputCls = 'w-full px-3 py-2 text-xs rounded-xl border border-[var(--border-subtle)] bg-black/5 dark:bg-white/5 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-violet-500/50 transition-colors';
const labelCls = 'text-xs text-slate-500 font-medium mb-1 block';
const btnCancel = 'px-4 py-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 rounded-xl transition-colors';
const btnPrimary = 'flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white btn-aurora rounded-xl hover:opacity-90 transition-opacity';

export default function ClassModal({ initial, allClasses, onClose, onSave }: {
  initial?: OntClass;
  allClasses: OntClass[];
  onClose: () => void;
  onSave: (c: Omit<OntClass, 'id'>) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [parent, setParent] = useState(initial?.parent ?? '');
  const [desc, setDesc] = useState(initial?.description ?? '');
  const [props, setProps] = useState(initial?.properties ?? []);

  function addProp() { setProps(p => [...p, { name: '', type: 'string', required: false }]); }
  function removeProp(i: number) { setProps(p => p.filter((_, j) => j !== i)); }
  function updateProp(i: number, k: string, v: string | boolean) { setProps(p => p.map((x, j) => j === i ? { ...x, [k]: v } : x)); }

  return (
    <Modal title={initial ? '编辑类定义' : '新建类'} icon={<Box className="w-4 h-4 text-violet-400" />} onClose={onClose}
      footer={<><button onClick={onClose} className={btnCancel}>取消</button><button onClick={() => { if (!name.trim()) return; onSave({ name: name.trim(), parent: parent || undefined, description: desc, properties: props.filter(p => p.name.trim()) }); }} className={btnPrimary}><Save className="w-3.5 h-3.5" />{initial ? '保存' : '创建'}</button></>}>
      <div><label className={labelCls}>类名 *</label><input value={name} onChange={e => setName(e.target.value)} placeholder="如 Person" className={inputCls} /></div>
      <div>
        <label className={labelCls}>父类</label>
        <select value={parent} onChange={e => setParent(e.target.value)} className={inputCls}>
          <option value="">无（根类）</option>
          {allClasses.filter(c => c.id !== initial?.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div><label className={labelCls}>描述</label><textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} className={cn(inputCls, 'resize-none')} /></div>
      <div>
        <div className="flex items-center justify-between mb-2"><label className={labelCls + ' !mb-0'}>属性定义</label><button onClick={addProp} className="text-[11px] text-violet-400 hover:text-violet-300 flex items-center gap-0.5 transition-colors"><Plus className="w-3 h-3" />添加</button></div>
        {props.map((p, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <input value={p.name} onChange={e => updateProp(i, 'name', e.target.value)} placeholder="属性名" className={cn(inputCls, 'flex-1')} />
            <select value={p.type} onChange={e => updateProp(i, 'type', e.target.value)} className={cn(inputCls, 'w-24')}>
              {PROP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button onClick={() => updateProp(i, 'required', !p.required)} className={cn('text-[10px] px-2 py-1 rounded border transition-all shrink-0', p.required ? 'bg-rose-500/15 text-rose-400 border-rose-500/25' : 'text-slate-500 border-[var(--border-subtle)] hover:border-rose-500/25')}>必填</button>
            <button onClick={() => removeProp(i)} className="p-1 text-slate-500 hover:text-rose-400 transition-colors shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        ))}
        {props.length === 0 && <p className="text-[11px] text-slate-500 text-center py-2">暂无属性，点击添加</p>}
      </div>
    </Modal>
  );
}
