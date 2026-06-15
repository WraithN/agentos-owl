/* 知识库模块 — 主入口，含四个子视图：list / sliceRules / edit / search */
import { useState, useRef } from 'react';
import WikiKBPage from './WikiKBPage';
import OntologyKBPage from './OntologyKBPage';
import VectorKBPage from './VectorKBPage';
import KBUploadDialog, { DEFAULT_SLICE_RULES, SliceRule, STRATEGY_LABELS, STRATEGY_COLORS } from './KBUploadDialog';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, FileCode, Database, Plus, Trash2, Pencil, Upload,
  Search, X, ChevronLeft, ChevronRight, CheckCircle2, Loader2, Star,
  HardDrive, Files, Layers, Scissors, ArrowRight, Send,
  Bot, User, Sparkles, Server, Check, BookOpen, Network,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { KNOWLEDGE_DOCS, DOC_CHUNKS } from '@/data/mockData';
import type { KnowledgeDoc, DocChunk } from '@/types';

/* ── 类型 ──────────────────────────────────────────────────────────── */
type KBType = 'vector' | 'wiki' | 'ontology';

interface KnowledgeBase {
  id: string; name: string; vectorDbUrl: string; description?: string;
  docCount: number; chunkCount: number; storageSize: string;
  processingCount: number; isGlobal: boolean; kbType: KBType;
}

const KB_TYPE_META: Record<KBType, { label: string; icon: typeof Database; gradient: string; badgeCls: string }> = {
  vector:   { label: '向量知识库', icon: Database,  gradient: 'from-cyan-500 to-blue-600',    badgeCls: 'bg-cyan-500/15 text-cyan-500 dark:text-cyan-400 border-cyan-500/25' },
  wiki:     { label: 'Wiki知识库', icon: BookOpen,  gradient: 'from-emerald-500 to-teal-600', badgeCls: 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border-emerald-500/25' },
  ontology: { label: 'Ontology',   icon: Network,   gradient: 'from-violet-500 to-purple-600', badgeCls: 'bg-violet-500/15 text-violet-500 dark:text-violet-400 border-violet-500/25' },
};

type Strategy = 'fixed' | 'sentence' | 'paragraph' | 'semantic';

const PREPROCESS_OPTIONS = [
  { id: 'clean',     label: '自动清洗无效内容（空行、多余空格、页眉页脚）' },
  { id: 'filter',    label: '过滤低质量短块与乱码内容' },
  { id: 'table',     label: '保留表格结构化格式，不强行拆分' },
  { id: 'dedup',     label: '自动去重重复知识块' },
] as const;
type PreprocessId = typeof PREPROCESS_OPTIONS[number]['id'];


interface ChatMessage {
  id: string; role: 'user' | 'assistant'; content: string;
  chunks?: { chunk: DocChunk; docName: string; score: number }[];
}

/* ── Mock 数据 ─────────────────────────────────────────────────────── */
const INIT_KBS: KnowledgeBase[] = [
  { id: 'kb-1', name: '默认知识库',  vectorDbUrl: 'http://localhost:6333', docCount: 5,   chunkCount: 138,  storageSize: '15.3 MB',  processingCount: 1, isGlobal: true,  kbType: 'vector' },
  { id: 'kb-2', name: '产品文档库',  vectorDbUrl: 'http://localhost:6333', docCount: 12,  chunkCount: 342,  storageSize: '38.7 MB',  processingCount: 0, isGlobal: false, kbType: 'vector' },
  { id: 'kb-3', name: '外部知识库',  vectorDbUrl: 'https://qdrant.example.com:6333', docCount: 89, chunkCount: 2140, storageSize: '210.5 MB', processingCount: 3, isGlobal: false, kbType: 'vector' },
  { id: 'kb-4', name: '法务合规库',  vectorDbUrl: 'http://localhost:6333', docCount: 34,  chunkCount: 890,  storageSize: '56.2 MB',  processingCount: 0, isGlobal: false, kbType: 'vector' },
  { id: 'kb-5', name: '技术架构库',  vectorDbUrl: 'http://localhost:6333', docCount: 21,  chunkCount: 567,  storageSize: '42.1 MB',  processingCount: 2, isGlobal: false, kbType: 'vector' },
  { id: 'kb-6', name: '用户反馈库',  vectorDbUrl: 'http://localhost:6333', docCount: 156, chunkCount: 4200, storageSize: '128.6 MB', processingCount: 0, isGlobal: false, kbType: 'vector' },
  { id: 'kb-7', name: '竞品资料库',  vectorDbUrl: 'https://qdrant.example.com:6333', docCount: 45, chunkCount: 1120, storageSize: '78.3 MB',  processingCount: 1, isGlobal: false, kbType: 'vector' },
  { id: 'kb-8', name: '财务数据仓',  vectorDbUrl: 'http://localhost:6333', docCount: 67,  chunkCount: 1560, storageSize: '95.4 MB',  processingCount: 0, isGlobal: false, kbType: 'vector' },
  { id: 'kb-9',  name: '产品 Wiki',  vectorDbUrl: 'https://wiki.example.com', docCount: 230, chunkCount: 3800, storageSize: '62.4 MB',  processingCount: 0, isGlobal: false, kbType: 'wiki' },
  { id: 'kb-10', name: '工程 Wiki',  vectorDbUrl: 'https://wiki.example.com', docCount: 415, chunkCount: 7200, storageSize: '134.8 MB', processingCount: 2, isGlobal: false, kbType: 'wiki' },
  { id: 'kb-11', name: '业务领域本体', vectorDbUrl: 'http://localhost:7474', docCount: 18, chunkCount: 520,  storageSize: '28.1 MB',  processingCount: 0, isGlobal: false, kbType: 'ontology' },
  { id: 'kb-12', name: '产品知识图谱', vectorDbUrl: 'http://localhost:7474', docCount: 42, chunkCount: 1340, storageSize: '56.7 MB',  processingCount: 1, isGlobal: false, kbType: 'ontology' },
];


const statusConfig = {
  ready:      { label: '已就绪',  cls: 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border-emerald-500/25' },
  processing: { label: '处理中',  cls: 'bg-cyan-500/15 text-cyan-500 dark:text-cyan-400 border-cyan-500/25 animate-pulse' },
  error:      { label: '解析失败', cls: 'bg-rose-500/15 text-rose-500 dark:text-rose-400 border-rose-500/25' },
};

const docTypeIcon: Record<string, typeof FileText> = {
  pdf: FileText, docx: FileText, md: FileCode, csv: Database, txt: FileText,
};

const DIALOG_BG = 'var(--panel-bg-solid)';
const DIALOG_BD = 'var(--border-subtle)';
const inputCls = 'w-full bg-black/5 dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 outline-none focus:border-cyan-500/50 transition-colors';

/* ── 通用组件 ──────────────────────────────────────────────────────── */
function DeleteConfirm({ title, desc, onCancel, onConfirm }: { title: string; desc: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.15 }}
        className="relative w-full max-w-sm rounded-2xl shadow-2xl p-5 space-y-4"
        style={{ background: DIALOG_BG, border: `1px solid ${DIALOG_BD}`, backdropFilter: 'blur(24px)' }}
        onClick={e => e.stopPropagation()}>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</p>
        <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 rounded-xl transition-colors">取消</button>
          <button onClick={onConfirm} className="px-4 py-2 text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-colors">确认删除</button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── 切片规则新建/编辑弹窗 ─────────────────────────────────────────── */
type RuleFormData = Omit<SliceRule, 'id'>;
const emptyRuleForm = (): RuleFormData => ({ name: '', strategy: 'fixed', chunkSize: 512, overlap: 64, separator: '\n', preprocess: [], description: '' });

function SliceRuleFormDialog({ initial, onClose, onSave }: {
  initial: RuleFormData | null; onClose: () => void; onSave: (d: RuleFormData) => void;
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

/* ── 切片规则管理子页 ──────────────────────────────────────────────── */
function SliceRulesPage({ onBack }: { onBack: () => void }) {
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

/* ── 知识库编辑页（独立全页） ──────────────────────────────────────── */
function KBEditPage({ kb, onBack }: { kb: KnowledgeBase; onBack: () => void }) {
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
          { label: '文档数',  value: `${kb.docCount} 篇`,    icon: <Files    className="w-3.5 h-3.5 text-cyan-400"    /> },
          { label: '知识块数', value: `${kb.chunkCount} 块`, icon: <Layers   className="w-3.5 h-3.5 text-violet-400" /> },
          { label: '存储大小', value: kb.storageSize,         icon: <HardDrive className="w-3.5 h-3.5 text-amber-400" /> },
          { label: '处理中',   value: `${kb.processingCount} 篇`, icon: <Loader2  className="w-3.5 h-3.5 text-emerald-400" /> },
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

/* ── AI检索对话页 ──────────────────────────────────────────────────── */
function KBSearchPage({ kb, onBack }: { kb: KnowledgeBase; onBack: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  function send() {
    if (!input.trim() || thinking) return;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setThinking(true);
    setTimeout(() => {
      const chunks = DOC_CHUNKS.map((c, i) => ({ chunk: c, docName: KNOWLEDGE_DOCS[i % KNOWLEDGE_DOCS.length].name, score: +(0.97 - i * 0.06).toFixed(2) }));
      setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: `根据知识库「${kb.name}」检索到以下相关内容：`, chunks }]);
      setThinking(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }, 1200);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

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
          <span className="text-xs text-slate-500">· AI检索</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-xs text-slate-500">基于向量语义检索</span>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400 select-none">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#00f2c320,#7c3aed20)', border: '1px solid rgba(124,58,237,0.2)' }}>
              <Search className="w-7 h-7 text-violet-400" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">向知识库提问，AI将返回最相关的内容</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {['这个知识库包含哪些主题？', '帮我总结主要内容', '有哪些关键概念？'].map(q => (
                <button key={q} onClick={() => setInput(q)}
                  className="px-3 py-1.5 text-xs text-slate-500 border border-[var(--border-subtle)] rounded-xl hover:border-violet-500/40 hover:text-violet-400 transition-all">{q}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map(msg => (
          <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            {msg.role === 'user' ? (
              <div className="flex justify-end gap-2.5">
                <div className="max-w-[70%] px-4 py-3 rounded-2xl rounded-tr-sm text-sm leading-relaxed text-white" style={{ background: 'linear-gradient(135deg,#00c2a8,#7c3aed)' }}>{msg.content}</div>
                <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center bg-slate-200 dark:bg-slate-700 mt-0.5"><User className="w-4 h-4 text-slate-600 dark:text-slate-300" /></div>
              </div>
            ) : (
              <div className="flex gap-2.5">
                <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center mt-0.5"
                  style={{ background: 'linear-gradient(135deg,#00f2c320,#7c3aed20)', border: '1px solid rgba(124,58,237,0.25)' }}>
                  <Bot className="w-4 h-4 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0 space-y-3">
                  <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-black/5 dark:bg-white/5 border border-[var(--border-subtle)] text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{msg.content}</div>
                  {msg.chunks && msg.chunks.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold text-slate-500 ml-1">引用知识块</p>
                      {msg.chunks.map((item, ci) => (
                        <motion.div key={item.chunk.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: ci * 0.06 }}
                          className="p-3 rounded-xl border border-[var(--border-subtle)] bg-black/3 dark:bg-white/3 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-cyan-500 dark:text-cyan-400">Chunk #{item.chunk.index + 1}</span>
                              <span className="text-[10px] text-slate-500 truncate max-w-[160px]">{item.docName}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                              <span className="text-xs font-semibold text-amber-500 dark:text-amber-400">{item.score}</span>
                            </div>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-pretty line-clamp-3">{item.chunk.content}</p>
                          <p className="text-[10px] text-slate-400">{item.chunk.tokens} tokens</p>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        ))}
        {thinking && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5">
            <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#00f2c320,#7c3aed20)', border: '1px solid rgba(124,58,237,0.25)' }}>
              <Bot className="w-4 h-4 text-violet-400" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-black/5 dark:bg-white/5 border border-[var(--border-subtle)] flex items-center gap-1.5">
              {[0, 0.15, 0.3].map(delay => (
                <motion.div key={delay} className="w-1.5 h-1.5 rounded-full bg-violet-400"
                  animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay }} />
              ))}
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="px-6 py-4 shrink-0 border-t border-[var(--border-subtle)]">
        <div className="flex items-end gap-3 max-w-3xl mx-auto">
          <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey} rows={1}
            placeholder="输入问题向知识库提问... (Enter 发送，Shift+Enter 换行)"
            className="flex-1 min-w-0 bg-black/5 dark:bg-white/5 border border-[var(--border-subtle)] focus:border-violet-500/50 rounded-2xl px-4 py-3 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 outline-none resize-none transition-colors leading-relaxed"
            style={{ minHeight: 48, maxHeight: 160 }} />
          <button onClick={send} disabled={!input.trim() || thinking}
            className="flex items-center justify-center w-11 h-11 rounded-2xl btn-aurora text-white disabled:opacity-40 shrink-0 transition-all">
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-slate-400 text-center mt-2">AI 基于知识块向量相似度检索，结果仅供参考</p>
      </div>
    </div>
  );
}

/* ── 新建/编辑知识库弹窗 ───────────────────────────────────────────── */
type KBFormData = { name: string; vectorDbUrl: string; description: string; kbType: KBType };

function KBFormDialog({ initial, lockedType, onClose, onSave }: {
  initial?: Partial<KnowledgeBase>; lockedType?: KBType; onClose: () => void;
  onSave: (d: KBFormData) => void;
}) {
  const [kbType, setKbType] = useState<KBType>(initial?.kbType ?? lockedType ?? 'vector');
  const [name, setName] = useState(initial?.name ?? '');
  const [vectorDbUrl, setVectorDbUrl] = useState(initial?.vectorDbUrl ?? 'http://localhost:6333');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [nameErr, setNameErr] = useState('');

  const urlPlaceholder: Record<KBType, string> = {
    vector:   'http://localhost:6333  (Qdrant / Milvus)',
    wiki:     'https://wiki.example.com',
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

/* ── 主模块 ─────────────────────────────────────────────────────────── */
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
        {uploadTarget && <KBUploadDialog kbName={uploadTarget.name} rules={DEFAULT_SLICE_RULES} onClose={() => setUploadTarget(null)} />}
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
