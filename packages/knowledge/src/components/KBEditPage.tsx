import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, FileCode, Database, Trash2, Upload,
  Search, Layers, HardDrive, Files, Loader2, ChevronLeft,
} from 'lucide-react';
import { cn } from '@owl-os/core';
import KBUploadDialog from './KBUploadDialog.js';
import DeleteConfirm from './DeleteConfirm.js';
import { KNOWLEDGE_DOCS, DOC_CHUNKS } from '../mock.js';
import { statusConfig, docTypeIcon, inputCls, DEFAULT_SLICE_RULES } from '../constants.js';
import type { KnowledgeBase, KnowledgeDoc } from '../types.js';

export default function KBEditPage({ kb, onBack }: { kb: KnowledgeBase; onBack: () => void }) {
  const [docList, setDocList] = useState<KnowledgeDoc[]>(KNOWLEDGE_DOCS);
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeDoc | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteDocTarget, setDeleteDocTarget] = useState<KnowledgeDoc | null>(null);

  const filtered = docList.filter(d => d.name.toLowerCase().includes(searchQ.toLowerCase()));
  const chunks = selectedDoc ? DOC_CHUNKS : [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 shrink-0 border-b border-[var(--border-subtle)] flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 px-2.5 py-1.5 rounded-lg transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" />返回
        </button>
        <div className="h-4 w-px bg-[var(--border-subtle)]" />
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{kb.name}</span>
          <span className="text-xs text-slate-500">· 编辑</span>
        </div>
        <div className="ml-auto">
          <button onClick={() => setUploadOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white btn-aurora rounded-xl">
            <Upload className="w-3.5 h-3.5" />上传文档
          </button>
        </div>
      </div>
      {/* 统计条 */}
      <div className="px-6 py-3 shrink-0 border-b border-[var(--border-subtle)] flex gap-3 flex-wrap">
        {[
          { label: '文档数', value: `${kb.docCount} 篇`, icon: <Files className="w-3.5 h-3.5 text-cyan-400" /> },
          { label: '知识块数', value: `${kb.chunkCount} 块`, icon: <Layers className="w-3.5 h-3.5 text-violet-400" /> },
          { label: '存储大小', value: kb.storageSize, icon: <HardDrive className="w-3.5 h-3.5 text-amber-400" /> },
          { label: '处理中', value: `${kb.processingCount} 篇`, icon: <Loader2 className="w-3.5 h-3.5 text-emerald-400" /> },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/4 dark:bg-white/4 border border-[var(--border-subtle)]">
            {s.icon}
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-none">{s.value}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
      {/* 主体左右 */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* 左侧文档列表 */}
        <div className="w-72 shrink-0 flex flex-col border-r border-[var(--border-subtle)] overflow-hidden" style={{ background: 'var(--panel-bg)' }}>
          <div className="p-3 shrink-0 border-b border-[var(--border-subtle)]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="搜索文档..." className={cn(inputCls, 'pl-8 py-1.5')} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-1">
            {filtered.map(doc => {
              const Icon = docTypeIcon[doc.type] ?? FileText;
              const sc = statusConfig[doc.status];
              const isSelected = selectedDoc?.id === doc.id;
              return (
                <div key={doc.id} onClick={() => setSelectedDoc(doc)}
                  className={cn('flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all group cursor-pointer',
                    isSelected ? 'bg-cyan-500/10 border-cyan-500/30' : 'border-transparent hover:border-[var(--border-subtle)] hover:bg-black/4 dark:hover:bg-white/4')}>
                  <Icon className="w-4 h-4 shrink-0 text-slate-400" />
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-xs font-medium truncate', isSelected ? 'text-cyan-400' : 'text-slate-800 dark:text-slate-100')}>{doc.name}</p>
                    <p className="text-[10px] text-slate-500">{doc.size} · {doc.chunks} 块</p>
                  </div>
                  <span className={cn('text-[10px] border px-1.5 py-0.5 rounded shrink-0', sc.cls)}>{sc.label}</span>
                  <button onClick={e => { e.stopPropagation(); setDeleteDocTarget(doc); }}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <FileText className="w-8 h-8 text-slate-400" />
                <p className="text-xs text-slate-500 text-center">暂无文档</p>
              </div>
            )}
          </div>
        </div>
        {/* 右侧知识块 */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {selectedDoc ? (
            <>
              <div className="px-5 py-3.5 shrink-0 border-b border-[var(--border-subtle)] flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex-1 min-w-0 truncate">{selectedDoc.name}</span>
                <span className="text-xs text-slate-500">{selectedDoc.chunks} 个知识块</span>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0 p-5 space-y-3">
                {chunks.map((c, i) => (
                  <motion.div key={c.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-black/2 dark:bg-white/2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono font-semibold text-cyan-500 dark:text-cyan-400">Chunk #{i + 1}</span>
                      <span className="text-[10px] text-slate-400 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full">{c.tokens} tokens</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap text-pretty">{c.content}</p>
                  </motion.div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Layers className="w-12 h-12 opacity-30" />
              <p className="text-sm">选择左侧文档查看知识块详情</p>
            </div>
          )}
        </div>
      </div>
      <AnimatePresence>
        {uploadOpen && <KBUploadDialog kbName={kb.name} rules={DEFAULT_SLICE_RULES} onClose={() => setUploadOpen(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {deleteDocTarget && (
          <DeleteConfirm title="删除文档" desc={`确定删除文档「${deleteDocTarget.name}」吗？该文档的所有知识块将同步删除，且不可恢复。`}
            onCancel={() => setDeleteDocTarget(null)}
            onConfirm={() => { setDocList(p => p.filter(d => d.id !== deleteDocTarget.id)); if (selectedDoc?.id === deleteDocTarget.id) setSelectedDoc(null); setDeleteDocTarget(null); }} />
        )}
      </AnimatePresence>
    </div>
  );
}
