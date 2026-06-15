import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, FileText, FileCode, Trash2, Upload,
  Search, Layers, HardDrive, Files, Loader2, Server,
  BarChart2, TrendingUp, Clock, Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import KBPageShell from './KBPageShell';
import KBUploadDialog, { DEFAULT_SLICE_RULES } from './KBUploadDialog';

/* ── 类型 ─────────────────────────────────────────────── */
interface KnowledgeBase {
  id: string; name: string; vectorDbUrl: string; description?: string;
  docCount: number; chunkCount: number; storageSize: string;
  processingCount: number; isGlobal: boolean;
}

interface KnowledgeDoc {
  id: string; name: string; type: string; size: string;
  status: 'ready' | 'processing' | 'error'; chunks: number;
}

interface DocChunk {
  id: string; content: string; tokens: number;
}

/* ── Mock 数据 ─────────────────────────────────────────── */
const MOCK_DOCS: KnowledgeDoc[] = [
  { id: 'd1', name: 'ActaOS 架构设计文档.pdf',   type: 'pdf',  size: '2.3 MB',  status: 'ready',      chunks: 28 },
  { id: 'd2', name: 'API 接口规范 v2.md',         type: 'md',   size: '145 KB',  status: 'ready',      chunks: 12 },
  { id: 'd3', name: '需求分析报告.docx',           type: 'docx', size: '856 KB',  status: 'ready',      chunks: 35 },
  { id: 'd4', name: '测试用例集合.csv',            type: 'csv',  size: '62 KB',   status: 'processing', chunks: 0  },
  { id: 'd5', name: '安全审计报告.pdf',            type: 'pdf',  size: '1.1 MB',  status: 'ready',      chunks: 19 },
  { id: 'd6', name: '数据库设计规范.md',           type: 'md',   size: '88 KB',   status: 'error',      chunks: 0  },
  { id: 'd7', name: '用户手册 v3.pdf',             type: 'pdf',  size: '3.7 MB',  status: 'ready',      chunks: 56 },
  { id: 'd8', name: '部署运维手册.txt',            type: 'txt',  size: '34 KB',   status: 'ready',      chunks: 8  },
];

const MOCK_CHUNKS: DocChunk[] = [
  { id: 'c1', tokens: 312, content: '## 系统架构概述\n\nActaOS 采用意图驱动的多层架构设计，核心由三个层次组成：感知层（Intent Layer）、调度层（Orchestration Layer）和执行层（Execution Layer）。感知层负责理解用户自然语言输入，通过大语言模型提取任务意图和参数；调度层基于意图复杂度自动选择单聊、群聊或自动化模式；执行层包含具体的 Agent 实现和工具集成。' },
  { id: 'c2', tokens: 287, content: '## 核心组件\n\n**意图解析器（Intent Parser）**：使用微调后的 LLM 将用户输入转换为结构化意图对象，包含 action、entity、parameters 三个核心字段。\n\n**Agent 调度器（Agent Scheduler）**：基于意图复杂度和当前系统负载，动态分配最合适的 Agent 或 Agent 团队执行任务。' },
  { id: 'c3', tokens: 356, content: '## 数据流设计\n\n系统采用事件驱动架构，所有组件间通过消息队列进行异步通信。核心数据流如下：\n1. 用户输入 → 意图解析 → 路由决策\n2. 路由决策 → Agent 选择 → 任务分配\n3. 任务执行 → 结果聚合 → 响应生成\n4. 响应生成 → 流式输出 → 用户界面' },
  { id: 'c4', tokens: 198, content: '## 高可用设计\n\n系统所有关键组件均支持水平扩展。通过 Kubernetes 编排实现自动扩缩容，结合 Redis 实现分布式会话管理，保证在高并发场景下的稳定性和一致性。' },
  { id: 'c5', tokens: 421, content: '## 安全架构\n\n系统采用零信任安全模型，所有 Agent 间通信均经过加密和身份验证。访问控制基于 RBAC（角色权限控制），支持细粒度的权限管理。所有敏感操作均记录到不可篡改的审计日志中，满足企业级合规要求。' },
];

const docTypeIcon: Record<string, typeof FileText> = { pdf: FileCode, md: FileText, docx: FileText, csv: FileText, txt: FileText };
const statusConfig: Record<string, { label: string; cls: string }> = {
  ready:      { label: '就绪',   cls: 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border-emerald-500/25' },
  processing: { label: '处理中', cls: 'bg-cyan-500/15 text-cyan-500 dark:text-cyan-400 border-cyan-500/25' },
  error:      { label: '失败',   cls: 'bg-rose-500/15 text-rose-500 dark:text-rose-400 border-rose-500/25' },
};

/* ── 删除确认弹窗 ─────────────────────────────────────── */
function DeleteConfirm({ title, desc, onCancel, onConfirm }: {
  title: string; desc: string; onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
        className="relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden z-10"
        style={{ background: 'rgba(15,15,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(24px)' }}>
        <div className="p-5">
          <h3 className="text-sm font-semibold text-slate-100 mb-1.5">{title}</h3>
          <p className="text-xs text-slate-400 text-pretty">{desc}</p>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 pb-5">
          <button onClick={onCancel} className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-white/8 rounded-xl transition-colors">取消</button>
          <button onClick={onConfirm} className="px-4 py-2 text-xs font-semibold text-white bg-rose-500/80 hover:bg-rose-500 rounded-xl transition-colors">确认删除</button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── VectorKBPage ─────────────────────────────────────── */
export default function VectorKBPage({ kb: initialKb, isGlobal: initialGlobal, onBack, onRename, onSetGlobal }: {
  kb: KnowledgeBase; isGlobal: boolean; onBack: () => void;
  onRename: (name: string) => void; onSetGlobal: () => void;
}) {
  const [kb, setKb] = useState(initialKb);
  const [isGlobal, setIsGlobal] = useState(initialGlobal);
  const [activeTab, setActiveTab] = useState('detail');
  const [docs, setDocs] = useState<KnowledgeDoc[]>(MOCK_DOCS);
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeDoc | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeDoc | null>(null);

  const filtered = docs.filter(d => d.name.toLowerCase().includes(searchQ.toLowerCase()));
  const chunks = selectedDoc ? MOCK_CHUNKS : [];

  function handleRename(name: string) { setKb(k => ({ ...k, name })); onRename(name); }
  function handleSetGlobal() { setIsGlobal(v => !v); onSetGlobal(); }

  const TABS = [
    { id: 'detail', label: '详情', icon: <Layers className="w-4 h-4" /> },
    { id: 'dashboard', label: '数据大盘', icon: <BarChart2 className="w-4 h-4" /> },
  ];

  return (
    <>
      <KBPageShell
        name={kb.name}
        isGlobal={isGlobal}
        icon={<div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-cyan-500 to-blue-600 shrink-0"><Database className="w-4 h-4 text-white" /></div>}
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onBack={onBack}
        onRename={handleRename}
        onSetGlobal={handleSetGlobal}
      >
        {/* ── 详情 Tab ── */}
        {activeTab === 'detail' && (
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* 左侧 */}
            <div className="w-72 shrink-0 flex flex-col border-r border-[var(--border-subtle)] overflow-hidden" style={{ background: 'var(--panel-bg)' }}>
              <div className="p-3 shrink-0 border-b border-[var(--border-subtle)] flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="搜索文档..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-black/5 dark:bg-white/5 text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-cyan-500/40" />
                </div>
                <button onClick={() => setUploadOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg hover:opacity-90 transition-opacity shrink-0">
                  <Upload className="w-3.5 h-3.5" />上传
                </button>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-0.5">
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
                      <button onClick={e => { e.stopPropagation(); setDeleteTarget(doc); }}
                        className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                    <FileText className="w-8 h-8 opacity-40" />
                    <p className="text-xs">暂无文档</p>
                  </div>
                )}
              </div>
            </div>

            {/* 右侧切块详情 */}
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
              {selectedDoc ? (
                <>
                  <div className="px-5 py-3.5 shrink-0 border-b border-[var(--border-subtle)] flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex-1 min-w-0 truncate">{selectedDoc.name}</span>
                    <span className="text-xs text-slate-500 shrink-0">{selectedDoc.chunks} 个知识块</span>
                    <span className={cn('text-[10px] border px-1.5 py-0.5 rounded shrink-0', statusConfig[selectedDoc.status].cls)}>{statusConfig[selectedDoc.status].label}</span>
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
                  <Layers className="w-12 h-12 opacity-20" />
                  <p className="text-sm">选择左侧文档查看切块详情</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 数据大盘 Tab ── */}
        {activeTab === 'dashboard' && (
          <div className="flex-1 overflow-y-auto min-h-0 p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: '文档总数',   value: `${kb.docCount}`,      sub: '篇',  icon: <Files     className="w-5 h-5 text-cyan-400"    />, color: 'from-cyan-500/20 to-blue-500/10' },
                { label: '知识块总数', value: `${kb.chunkCount}`,    sub: '块',  icon: <Layers    className="w-5 h-5 text-violet-400"  />, color: 'from-violet-500/20 to-purple-500/10' },
                { label: '存储占用',   value: kb.storageSize,         sub: '',    icon: <HardDrive className="w-5 h-5 text-amber-400"   />, color: 'from-amber-500/20 to-orange-500/10' },
                { label: '处理中',     value: `${kb.processingCount}`,sub: '篇',  icon: <Loader2   className="w-5 h-5 text-emerald-400" />, color: 'from-emerald-500/20 to-teal-500/10' },
              ].map(s => (
                <div key={s.label} className={cn('glass rounded-2xl p-4 bg-gradient-to-br', s.color)}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-500">{s.label}</span>
                    {s.icon}
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}<span className="text-sm font-normal text-slate-400 ml-1">{s.sub}</span></p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 文件类型分布 */}
              <div className="glass rounded-2xl p-5 h-full">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-cyan-400" />文件类型分布</h3>
                {[
                  { label: 'PDF 文档', count: 3, pct: 38, color: 'bg-cyan-500' },
                  { label: 'Markdown', count: 2, pct: 25, color: 'bg-violet-500' },
                  { label: 'Word 文档', count: 1, pct: 12, color: 'bg-amber-500' },
                  { label: 'CSV 数据', count: 1, pct: 12, color: 'bg-emerald-500' },
                  { label: '纯文本', count: 1, pct: 13, color: 'bg-slate-500' },
                ].map(r => (
                  <div key={r.label} className="flex items-center gap-3 mb-3">
                    <span className="text-xs text-slate-500 w-20 shrink-0">{r.label}</span>
                    <div className="flex-1 h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${r.pct}%` }} transition={{ duration: 0.6, delay: 0.1 }}
                        className={cn('h-full rounded-full', r.color)} />
                    </div>
                    <span className="text-xs text-slate-400 w-8 text-right">{r.count}篇</span>
                  </div>
                ))}
              </div>
              {/* 近期动态 */}
              <div className="glass rounded-2xl p-5 h-full">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-violet-400" />近期动态</h3>
                {[
                  { text: '上传 ActaOS 架构设计文档.pdf', time: '10分钟前', color: 'text-cyan-400' },
                  { text: '处理完成 API 接口规范 v2.md', time: '25分钟前', color: 'text-emerald-400' },
                  { text: '处理失败 数据库设计规范.md', time: '1小时前', color: 'text-rose-400' },
                  { text: '上传 安全审计报告.pdf', time: '2小时前', color: 'text-cyan-400' },
                  { text: '删除 旧版接口文档.pdf', time: '昨天', color: 'text-slate-400' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2 mb-3">
                    <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0', item.color.replace('text-', 'bg-'))} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-700 dark:text-slate-200 truncate">{item.text}</p>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" />{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              {/* 连接信息 */}
              <div className="glass rounded-2xl p-5 md:col-span-2">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2"><Server className="w-4 h-4 text-amber-400" />连接信息</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  {[
                    { label: '向量库地址', value: kb.vectorDbUrl },
                    { label: '嵌入模型', value: 'text-embedding-3-small' },
                    { label: '向量维度', value: '1536' },
                    { label: '相似度算法', value: 'Cosine' },
                    { label: '索引类型', value: 'HNSW' },
                    { label: '最大返回数', value: '10' },
                  ].map(item => (
                    <div key={item.label}>
                      <p className="text-slate-500 mb-0.5">{item.label}</p>
                      <p className="text-slate-800 dark:text-slate-100 font-mono font-medium truncate">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </KBPageShell>

      <AnimatePresence>
        {uploadOpen && (
          <KBUploadDialog kbName={kb.name} rules={DEFAULT_SLICE_RULES} onClose={() => setUploadOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <DeleteConfirm title="删除文档" desc={`确定删除「${deleteTarget.name}」吗？所有知识块将同步删除，且不可恢复。`}
            onCancel={() => setDeleteTarget(null)}
            onConfirm={() => { setDocs(p => p.filter(d => d.id !== deleteTarget.id)); if (selectedDoc?.id === deleteTarget.id) setSelectedDoc(null); setDeleteTarget(null); }} />
        )}
      </AnimatePresence>
    </>
  );
}
