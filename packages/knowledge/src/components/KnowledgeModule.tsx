/* 知识库模块 — 主入口，含四个子视图：list / sliceRules / edit / search */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, Plus, Trash2, Pencil, Upload,
  Search, ChevronLeft, ChevronRight, Star,
  Scissors, BookOpen, Network, Server, Loader2,
} from 'lucide-react';
import { cn } from '@owl-os/core';
import WikiKBPage from './WikiKBPage.js';
import OntologyKBPage from './OntologyKBPage.js';
import VectorKBPage from './VectorKBPage.js';
import KBUploadDialog from './KBUploadDialog.js';
import KBFormDialog from './KBFormDialog.js';
import DeleteConfirm from './DeleteConfirm.js';
import SliceRulesPage from './SliceRulesPage.js';

import KBSearchPage from './KBSearchPage.js';
import { KB_TYPE_META, INIT_KBS, inputCls } from '../constants.js';
import type { KnowledgeBase, KBType, KBFormData } from '../types.js';

type View = 'list' | 'sliceRules' | 'edit' | 'search' | 'wiki' | 'ontology';
const KB_PAGE_SIZE = 6;

export default function KnowledgeModule() {
  const [kbs, setKbs] = useState<KnowledgeBase[]>(INIT_KBS);
  const [view, setView] = useState<View>('list');
  const [activeKBType, setActiveKBType] = useState<KBType>('vector');
  const [viewTarget, setViewTarget] = useState<KnowledgeBase | null>(null);
  const [uploadTarget, setUploadTarget] = useState<KnowledgeBase | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeBase | null>(null);
  const [kbFormTarget, setKbFormTarget] = useState<'new' | KnowledgeBase | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [kbPage, setKbPage] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  /* 子视图路由 */
  function handleKBRename(id: string, name: string) { setKbs(prev => prev.map(k => k.id === id ? { ...k, name } : k)); }
  function handleKBSetGlobal(id: string) { setKbs(prev => prev.map(k => ({ ...k, isGlobal: k.id === id ? !k.isGlobal : k.isGlobal }))); }

  if (view === 'sliceRules') return <SliceRulesPage onBack={() => setView('list')} />;
  if (view === 'edit' && viewTarget) return (
    <VectorKBPage kb={viewTarget} isGlobal={viewTarget.isGlobal}
      onBack={() => { setView('list'); setViewTarget(null); }}
      onRename={name => handleKBRename(viewTarget.id, name)}
      onSetGlobal={() => handleKBSetGlobal(viewTarget.id)} />
  );
  if (view === 'search' && viewTarget) return <KBSearchPage kb={viewTarget} onBack={() => { setView('list'); setViewTarget(null); }} />;
  if (view === 'wiki' && viewTarget) return (
    <WikiKBPage kb={viewTarget} isGlobal={viewTarget.isGlobal}
      onBack={() => { setView('list'); setViewTarget(null); }}
      onRename={name => handleKBRename(viewTarget.id, name)}
      onSetGlobal={() => handleKBSetGlobal(viewTarget.id)} />
  );
  if (view === 'ontology' && viewTarget) return (
    <OntologyKBPage kb={viewTarget} isGlobal={viewTarget.isGlobal}
      onBack={() => { setView('list'); setViewTarget(null); }}
      onRename={name => handleKBRename(viewTarget.id, name)}
      onSetGlobal={() => handleKBSetGlobal(viewTarget.id)} />
  );

  function setGlobal(id: string) { setKbs(prev => prev.map(k => ({ ...k, isGlobal: k.id === id }))); }

  function doDelete() {
    if (!deleteTarget) return;
    setKbs(prev => prev.filter(k => k.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  function saveKBForm(data: KBFormData) {
    if (kbFormTarget === 'new') {
      const newKb: KnowledgeBase = { ...data, id: `kb-${Date.now()}`, docCount: 0, chunkCount: 0, processingCount: 0, isGlobal: false, storageSize: '0 MB' };
      setKbs(prev => [...prev, newKb]);
      setActiveKBType(data.kbType);
    } else if (kbFormTarget) {
      const t = kbFormTarget as KnowledgeBase;
      setKbs(prev => prev.map(k => k.id === t.id ? { ...k, ...data } : k));
    }
    setKbFormTarget(null);
  }

  /* 拖拽上传 */
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const typeKbs = kbs.filter(k => k.kbType === activeKBType);
    if (e.dataTransfer.files?.length && typeKbs.length > 0) {
      setUploadTarget(typeKbs[0]);
    }
  }

  const filtered = kbs.filter(k =>
    k.kbType === activeKBType &&
    k.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const totalKBPages = Math.max(1, Math.ceil(filtered.length / KB_PAGE_SIZE));
  const safeKBPage = Math.min(kbPage, totalKBPages - 1);
  const pageKBs = filtered.slice(safeKBPage * KB_PAGE_SIZE, (safeKBPage + 1) * KB_PAGE_SIZE);

  return (
    <div
      className={cn('flex flex-col h-full overflow-hidden relative transition-all', dragOver && 'ring-2 ring-inset ring-cyan-500/50')}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false); }}
      onDrop={handleDrop}>

      {/* 拖拽遮罩提示 */}
      {dragOver && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-cyan-500/10 backdrop-blur-sm pointer-events-none">
          <div className="flex flex-col items-center gap-3 p-8 rounded-2xl border-2 border-dashed border-cyan-500/60 bg-black/30">
            <Upload className="w-10 h-10 text-cyan-400" />
            <p className="text-sm font-semibold text-cyan-300">松开以上传文档</p>
            <p className="text-xs text-cyan-500">将文件上传至第一个知识库</p>
          </div>
        </div>
      )}

      {/* 页面头（仅标题 + 搜索） */}
      <div className="px-6 pt-5 pb-0 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">知识库</h1>
            <p className="text-sm text-slate-500 mt-0.5">管理向量化知识库文档与检索配置，点击卡片可编辑，支持拖拽上传</p>
          </div>
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setKbPage(0); }}
              placeholder="搜索知识库..." className={cn(inputCls, 'pl-9')} />
          </div>
        </div>

        {/* Tab 栏 */}
        <div className="flex gap-1 border-b border-[var(--border-subtle)]">
          {(Object.entries(KB_TYPE_META) as [KBType, typeof KB_TYPE_META[KBType]][]).map(([type, meta]) => {
            const Icon = meta.icon;
            const count = kbs.filter(k => k.kbType === type).length;
            const active = activeKBType === type;
            return (
              <button key={type} onClick={() => { setActiveKBType(type); setKbPage(0); setSearchQuery(''); }}
                className={cn('relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors',
                  active ? 'text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300')}>
                <Icon className="w-4 h-4" />
                {meta.label}
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-medium', active ? meta.badgeCls : 'bg-slate-100 dark:bg-white/8 text-slate-500 border-[var(--border-subtle)]')}>{count}</span>
                {active && <motion.div layoutId="kb-tab-line" className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full" style={{ background: 'linear-gradient(90deg,#00b89a,#7c3aed)' }} />}
              </button>
            );
          })}
        </div>

        {/* 操作按钮区（Tab 下方） */}
        <div className="flex items-center justify-between py-3">
          <p className="text-xs text-slate-500">{filtered.length} 个知识库</p>
          <div className="flex items-center gap-2">
            {activeKBType === 'vector' && (
              <button onClick={() => setView('sliceRules')} title="切片规则管理"
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-500 hover:text-violet-400 border border-[var(--border-subtle)] hover:border-violet-500/40 hover:bg-violet-500/8 rounded-xl transition-all">
                <Scissors className="w-4 h-4" />
                <span className="hidden sm:inline">切片规则</span>
              </button>
            )}
            <button onClick={() => setKbFormTarget('new')}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white btn-aurora rounded-xl">
              <Plus className="w-3.5 h-3.5" />新建{KB_TYPE_META[activeKBType].label}
            </button>
          </div>
        </div>
      </div>

      {/* 卡片网格 */}
      <div className="flex-1 overflow-y-auto min-h-0 px-6 pb-4">
        {pageKBs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <Database className="w-8 h-8 text-slate-400" />
            <p className="text-sm text-slate-500">暂无知识库，点击「新建知识库」开始</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={`kbpage-${safeKBPage}`}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {pageKBs.map((kb, i) => (
                <motion.div key={kb.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  onClick={() => { setViewTarget(kb); setView(kb.kbType === 'wiki' ? 'wiki' : kb.kbType === 'ontology' ? 'ontology' : 'edit'); }}
                  className="glass glass-hover rounded-2xl p-4 flex flex-col h-full cursor-pointer hover:ring-1 hover:ring-cyan-500/30 transition-all">
                  {/* 卡片头 */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br', KB_TYPE_META[kb.kbType].gradient)}>
                      {(() => { const Icon = KB_TYPE_META[kb.kbType].icon; return <Icon className="w-5 h-5 text-white" />; })()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{kb.name}</span>
                        {kb.isGlobal && (
                          <span className="text-[10px] bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/25 px-1.5 py-0.5 rounded font-medium shrink-0">全局</span>
                        )}
                        {kb.processingCount > 0 && (
                          <span className="flex items-center gap-0.5 text-[10px] bg-cyan-500/15 text-cyan-500 dark:text-cyan-400 border border-cyan-500/25 px-1.5 py-0.5 rounded shrink-0">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />{kb.processingCount} 篇处理中
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Server className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="text-[10px] text-slate-500 font-mono truncate">{kb.vectorDbUrl}</span>
                      </div>
                    </div>
                  </div>

                  {/* 统计数据 */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { label: '文档数', value: `${kb.docCount} 篇` },
                      { label: '知识块', value: `${kb.chunkCount} 块` },
                      { label: '存储', value: kb.storageSize },
                    ].map(stat => (
                      <div key={stat.label} className="rounded-lg bg-black/4 dark:bg-white/4 px-2 py-1.5 text-center">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{stat.value}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* 操作栏 */}
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-[var(--border-subtle)]" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setGlobal(kb.id)}
                      className={cn('flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-all',
                        kb.isGlobal
                          ? 'bg-amber-500/15 text-amber-500 dark:text-amber-400 border-amber-500/25'
                          : 'text-slate-400 border-[var(--border-subtle)] hover:border-amber-500/30 hover:text-amber-400')}>
                      <Star className={cn('w-3 h-3', kb.isGlobal && 'fill-amber-400')} />
                      {kb.isGlobal ? '全局' : '设为全局'}
                    </button>
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => { setViewTarget(kb); setView(kb.kbType === 'wiki' ? 'wiki' : kb.kbType === 'ontology' ? 'ontology' : 'edit'); }} title="编辑"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-500 hover:bg-cyan-500/10 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setUploadTarget(kb)} title="上传文档"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { setViewTarget(kb); setView('search'); }} title="AI检索"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors">
                        <Search className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteTarget(kb)} title="删除"
                        className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* 分页 */}
      {totalKBPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-[var(--border-subtle)] shrink-0">
          <span className="text-xs text-slate-500">第 {safeKBPage + 1} / {totalKBPages} 页</span>
          <div className="flex items-center gap-1">
            <button disabled={safeKBPage === 0} onClick={() => setKbPage(p => p - 1)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalKBPages }, (_, i) => (
              <button key={i} onClick={() => setKbPage(i)}
                className={cn('w-7 h-7 rounded-lg text-xs font-medium transition-all',
                  i === safeKBPage ? 'btn-aurora text-white' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8')}>
                {i + 1}
              </button>
            ))}
            <button disabled={safeKBPage >= totalKBPages - 1} onClick={() => setKbPage(p => p + 1)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {uploadTarget && <KBUploadDialog kbName={uploadTarget.name} onClose={() => setUploadTarget(null)} />}
      </AnimatePresence>
      <AnimatePresence>
        {deleteTarget && (
          <DeleteConfirm title="确认删除知识库" desc={`确定要删除知识库「${deleteTarget.name}」吗？该操作将同时删除所有文档和知识块，且不可撤销。`}
            onCancel={() => setDeleteTarget(null)} onConfirm={doDelete} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {kbFormTarget && (
          <KBFormDialog
            initial={kbFormTarget === 'new' ? undefined : kbFormTarget}
            lockedType={kbFormTarget === 'new' ? activeKBType : undefined}
            onClose={() => setKbFormTarget(null)}
            onSave={saveKBForm} />
        )}
      </AnimatePresence>
    </div>
  );
}
