import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, X, Server } from 'lucide-react';
import { cn } from '@owl-os/core';
import { DIALOG_BG, DIALOG_BD, KB_TYPE_META, inputCls } from '../constants.js';
import type { KBType, KBFormData, KnowledgeBase } from '../types.js';

export default function KBFormDialog({ initial, lockedType, onClose, onSave }: {
  initial?: Partial<KnowledgeBase>;
  lockedType?: KBType;
  onClose: () => void;
  onSave: (d: KBFormData) => void;
}) {
  const [kbType, setKbType] = useState<KBType>(initial?.kbType ?? lockedType ?? 'vector');
  const [name, setName] = useState(initial?.name ?? '');
  const [vectorDbUrl, setVectorDbUrl] = useState(initial?.vectorDbUrl ?? 'http://localhost:6333');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [nameErr, setNameErr] = useState('');

  const urlPlaceholder: Record<KBType, string> = {
    vector: 'http://localhost:6333  (Qdrant / Milvus)',
    wiki: 'https://wiki.example.com',
    ontology: 'http://localhost:7474  (Neo4j / RDF Store)',
  };

  function save() {
    if (!name.trim()) { setNameErr('名称为必填项'); return; }
    onSave({ name: name.trim(), vectorDbUrl: vectorDbUrl.trim(), description: description.trim(), kbType });
  }

  const TypeIcon = KB_TYPE_META[kbType].icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.16 }}
        className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: DIALOG_BG, border: `1px solid ${DIALOG_BD}`, backdropFilter: 'blur(24px)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${DIALOG_BD}` }}>
          <div className="flex items-center gap-2">
            <TypeIcon className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {initial ? `编辑${KB_TYPE_META[kbType].label}` : `新建${KB_TYPE_META[kbType].label}`}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* 类型选择：仅编辑时显示（新建已由 tab 锁定） */}
          {!lockedType && (
            <div>
              <label className="text-xs text-slate-500 font-medium mb-2 block">知识库类型</label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(KB_TYPE_META) as [KBType, typeof KB_TYPE_META[KBType]][]).map(([type, meta]) => {
                  const Icon = meta.icon;
                  return (
                    <button key={type} type="button" onClick={() => setKbType(type)}
                      className={cn('flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all',
                        kbType === type
                          ? 'border-cyan-500/50 bg-cyan-500/8 text-slate-900 dark:text-white'
                          : 'border-[var(--border-subtle)] text-slate-400 hover:border-cyan-500/30 hover:bg-white/4')}>
                      <Icon className={cn('w-4 h-4', kbType === type ? 'text-cyan-400' : 'text-slate-500')} />
                      <span className="text-[10px] font-medium leading-tight">{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {/* 名称 */}
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1">名称 <span className="text-rose-400">*</span></label>
            <input value={name} onChange={e => { setName(e.target.value); setNameErr(''); }} placeholder="知识库名称" className={cn(inputCls, nameErr && 'border-rose-500/50')} />
            {nameErr && <p className="text-[10px] text-rose-400 mt-1">{nameErr}</p>}
          </div>
          {/* 数据库地址 */}
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-2">
              <Server className="w-3.5 h-3.5 text-cyan-400" />
              {kbType === 'vector' ? '向量库地址' : kbType === 'wiki' ? 'Wiki 服务地址' : '图数据库地址'}
            </label>
            <input value={vectorDbUrl} onChange={e => setVectorDbUrl(e.target.value)}
              placeholder={urlPlaceholder[kbType]} className={inputCls} />
            <p className="text-[10px] text-slate-400 mt-1">
              {kbType === 'vector' && '支持本地或远程 Qdrant / Milvus 向量数据库'}
              {kbType === 'wiki' && '支持 Confluence、自托管 Wiki.js 等 Wiki 服务'}
              {kbType === 'ontology' && '支持 Neo4j、Apache Jena 等 RDF / 图数据库'}
            </p>
          </div>
          {/* 描述 */}
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">描述</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              placeholder="知识库用途描述（选填）" className={cn(inputCls, 'resize-none leading-relaxed')} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4" style={{ borderTop: `1px solid ${DIALOG_BD}` }}>
          <button onClick={onClose} className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 rounded-xl transition-colors">取消</button>
          <button onClick={save} className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white btn-aurora rounded-xl">
            <Plus className="w-3.5 h-3.5" />{initial ? '保存' : '创建'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
