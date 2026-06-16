/* 共享上传弹窗 — 含切片规则选择，供 VectorKBPage / KnowledgeModule 使用 */
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, X, FileText, CheckCircle2, Loader2, Scissors, ArrowRight, Plus,
} from 'lucide-react';
import { cn } from '@owl-os/core';
import { DEFAULT_SLICE_RULES, STRATEGY_LABELS, STRATEGY_COLORS, DIALOG_BG, DIALOG_BD } from '../constants.js';
import type { SliceRule, Strategy } from '../types.js';

/* ── 新建规则内联表单 ──────────────────────────────── */
const EMPTY_RULE_FORM = (): Omit<SliceRule, 'id'> => ({
  name: '', strategy: 'fixed', chunkSize: 512, overlap: 64, separator: '\n', preprocess: [], description: '',
});

function NewRuleInlineForm({ onCancel, onCreate }: {
  onCancel: () => void;
  onCreate: (r: SliceRule) => void;
}) {
  const [form, setForm] = useState(EMPTY_RULE_FORM());
  const [nameErr, setNameErr] = useState('');
  const inCls = 'w-full px-2.5 py-1.5 text-xs rounded-xl border border-[var(--border-subtle)] bg-black/5 dark:bg-white/5 text-slate-700 dark:text-slate-200 outline-none focus:border-violet-500/50 transition-colors';

  function submit() {
    if (!form.name.trim()) { setNameErr('请填写规则名称'); return; }
    onCreate({ ...form, id: `sr-${Date.now()}`, name: form.name.trim() });
  }

  return (
    <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-3 space-y-2.5">
      <p className="text-xs font-semibold text-violet-400 flex items-center gap-1.5">
        <Plus className="w-3.5 h-3.5" />新建切片规则
      </p>
      <div>
        <input value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setNameErr(''); }}
          placeholder="规则名称 *" className={cn(inCls, nameErr && 'border-rose-500/50')} />
        {nameErr && <p className="text-[10px] text-rose-400 mt-0.5">{nameErr}</p>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select value={form.strategy} onChange={e => setForm(f => ({ ...f, strategy: e.target.value as Strategy }))}
          className={inCls}>
          {(Object.keys(STRATEGY_LABELS) as Strategy[]).map(s => (
            <option key={s} value={s}>{STRATEGY_LABELS[s]}</option>
          ))}
        </select>
        <div className="flex gap-1.5">
          <input type="number" min={64} max={4096} value={form.chunkSize}
            onChange={e => setForm(f => ({ ...f, chunkSize: Number(e.target.value) }))}
            className={cn(inCls, 'flex-1')} placeholder="块大小" />
          <input type="number" min={0} max={512} value={form.overlap}
            onChange={e => setForm(f => ({ ...f, overlap: Number(e.target.value) }))}
            className={cn(inCls, 'flex-1')} placeholder="重叠" />
        </div>
      </div>
      <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
        placeholder="规则描述（可选）" className={inCls} />
      <div className="flex justify-end gap-1.5">
        <button onClick={onCancel}
          className="px-3 py-1.5 text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 rounded-lg transition-colors">
          取消
        </button>
        <button onClick={submit}
          className="px-3 py-1.5 text-[11px] font-semibold text-white btn-aurora rounded-lg">
          创建并选择
        </button>
      </div>
    </div>
  );
}

/* ── 切片规则选择器 ──────────────────────────────────── */
function SliceRulePickerDialog({ rules: initialRules, onClose, onSelect }: {
  rules: SliceRule[]; onClose: () => void; onSelect: (r: SliceRule) => void;
}) {
  const [rules, setRules] = useState(initialRules);
  const [creating, setCreating] = useState(false);

  function handleCreate(r: SliceRule) {
    setRules(prev => [...prev, r]);
    onSelect(r);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.16 }}
        className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: DIALOG_BG, border: `1px solid ${DIALOG_BD}`, backdropFilter: 'blur(24px)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${DIALOG_BD}` }}>
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">选择切片规则</h2>
          </div>
          <div className="flex items-center gap-1">
            {!creating && (
              <button onClick={() => setCreating(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-violet-500 dark:text-violet-400 hover:bg-violet-500/10 rounded-lg transition-colors">
                <Plus className="w-3.5 h-3.5" />新建规则
              </button>
            )}
            <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="p-4 space-y-2 max-h-[70vh] overflow-y-auto">
          {creating && (
            <NewRuleInlineForm onCancel={() => setCreating(false)} onCreate={handleCreate} />
          )}
          {rules.map(r => (
            <button key={r.id} onClick={() => onSelect(r)}
              className="w-full flex items-start gap-3 p-3 rounded-xl border border-[var(--border-subtle)] hover:border-cyan-500/40 hover:bg-cyan-500/5 text-left transition-all group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{r.name}</span>
                  <span className={cn('text-[10px] border px-1.5 py-0.5 rounded font-medium', STRATEGY_COLORS[r.strategy])}>
                    {STRATEGY_LABELS[r.strategy]}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{r.description}</p>
                <div className="flex gap-3 mt-1 text-[10px] text-slate-500">
                  <span>块大小 {r.chunkSize}</span>
                  <span>重叠 {r.overlap}</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 shrink-0 mt-1 transition-colors" />
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ── 上传弹窗（主） ──────────────────────────────────── */
export default function KBUploadDialog({ kbName, rules = DEFAULT_SLICE_RULES, onClose }: {
  kbName: string; rules?: SliceRule[]; onClose: () => void;
}) {
  const [step, setStep] = useState<'file' | 'rule'>('file');
  const [files, setFiles] = useState<File[]>([]);
  const [selectedRule, setSelectedRule] = useState<SliceRule | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function pickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      const picked = Array.from(e.target.files);
      setFiles(prev => { const s = new Set(prev.map(f => f.name)); return [...prev, ...picked.filter(f => !s.has(f.name))]; });
    }
    e.target.value = '';
  }

  function upload() {
    if (!files.length || !selectedRule) return;
    setUploading(true);
    setProgress(files.map(() => 0));
    files.forEach((_, idx) => {
      let pct = 0;
      const interval = setInterval(() => {
        pct += Math.floor(Math.random() * 18) + 8;
        if (pct >= 100) { pct = 100; clearInterval(interval); }
        setProgress(prev => { const next = [...prev]; next[idx] = pct; return next; });
      }, 180 + idx * 60);
    });
    setTimeout(() => {
      setProgress(files.map(() => 100));
      setTimeout(() => { setUploading(false); setDone(true); setTimeout(onClose, 1200); }, 400);
    }, 1800 + files.length * 150);
  }

  const allDone = progress.length > 0 && progress.every(p => p === 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <AnimatePresence>
        {step === 'rule' && (
          <SliceRulePickerDialog rules={rules} onClose={() => setStep('file')} onSelect={r => { setSelectedRule(r); setStep('file'); }} />
        )}
      </AnimatePresence>
      {step === 'file' && (
        <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.16 }}
          className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
          style={{ background: DIALOG_BG, border: `1px solid ${DIALOG_BD}`, backdropFilter: 'blur(24px)' }}
          onClick={e => e.stopPropagation()}>
          {/* 标题栏 */}
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${DIALOG_BD}` }}>
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">批量上传文档 · {kbName}</h2>
              {files.length > 0 && !uploading && (
                <span className="text-[10px] bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded font-medium">
                  {files.length} 个文件
                </span>
              )}
            </div>
            <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 内容区 */}
          <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
            {done ? (
              <div className="flex flex-col items-center gap-2 py-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">全部上传成功</p>
                <p className="text-xs text-slate-500">{files.length} 个文档正在后台解析中...</p>
              </div>
            ) : (
              <>
                {/* 拖放区 */}
                <div onClick={() => !uploading && fileRef.current?.click()}
                  className={cn('border-2 border-dashed rounded-xl p-5 flex flex-col items-center gap-2 transition-colors group',
                    uploading
                      ? 'border-[var(--border-subtle)] cursor-not-allowed opacity-50'
                      : 'border-[var(--border-subtle)] hover:border-cyan-500/40 cursor-pointer')}>
                  <Upload className="w-7 h-7 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                  <p className="text-sm text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300">
                    点击选择文件 <span className="text-slate-400 font-normal text-xs">（可多选）</span>
                  </p>
                  <p className="text-xs text-slate-400">支持 PDF、DOCX、MD、TXT、CSV</p>
                  <input ref={fileRef} type="file" multiple accept=".pdf,.docx,.md,.txt,.csv" className="hidden" onChange={pickFiles} />
                </div>

                {/* 文件列表 */}
                {files.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-medium">待上传文件</span>
                      {!uploading && (
                        <button onClick={() => setFiles([])} className="text-[10px] text-slate-400 hover:text-rose-400 transition-colors">清空全部</button>
                      )}
                    </div>
                    {files.map((f, i) => (
                      <div key={i} className="flex flex-col gap-1 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border-subtle)]">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-xs text-slate-700 dark:text-slate-200 flex-1 truncate">{f.name}</span>
                          <span className="text-[10px] text-slate-500 shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                          {!uploading ? (
                            <button onClick={() => setFiles(p => p.filter((_, j) => j !== i))} className="text-slate-400 hover:text-rose-400 transition-colors shrink-0">
                              <X className="w-3 h-3" />
                            </button>
                          ) : (
                            <span className={cn('text-[10px] font-medium shrink-0', progress[i] === 100 ? 'text-emerald-400' : 'text-cyan-400')}>
                              {progress[i] === 100 ? '✓' : `${progress[i] ?? 0}%`}
                            </span>
                          )}
                        </div>
                        {uploading && (
                          <div className="h-1 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                            <motion.div className={cn('h-full rounded-full', progress[i] === 100 ? 'bg-emerald-400' : 'bg-cyan-400')}
                              initial={{ width: 0 }} animate={{ width: `${progress[i] ?? 0}%` }} transition={{ duration: 0.3, ease: 'easeOut' }} />
                          </div>
                        )}
                      </div>
                    ))}
                    {uploading && (
                      <p className="text-[10px] text-slate-500 text-center">
                        已完成 {progress.filter(p => p === 100).length} / {files.length} 个文件{allDone && ' · 处理中...'}
                      </p>
                    )}
                  </div>
                )}

                {/* 切片规则 */}
                <div>
                  <label className="text-xs text-slate-500 font-medium mb-1.5 block">
                    切片规则 <span className="text-rose-400">*</span>
                  </label>
                  {selectedRule ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-black/5 dark:bg-white/5">
                      <Scissors className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                      <span className="text-xs text-slate-700 dark:text-slate-200 flex-1">{selectedRule.name}</span>
                      <span className={cn('text-[10px] border px-1.5 rounded', STRATEGY_COLORS[selectedRule.strategy])}>
                        {STRATEGY_LABELS[selectedRule.strategy]}
                      </span>
                      <button onClick={() => setStep('rule')} className="text-xs text-cyan-500 hover:text-cyan-400 transition-colors">更换</button>
                    </div>
                  ) : (
                    <button onClick={() => setStep('rule')}
                      className="w-full flex items-center gap-1.5 px-3 py-2 text-xs text-slate-500 border border-dashed border-[var(--border-subtle)] hover:border-violet-500/40 hover:text-violet-400 rounded-xl transition-colors">
                      <Scissors className="w-3.5 h-3.5" />选择切片规则（必选）
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* 底部按钮 */}
          {!done && (
            <div className="flex items-center justify-end gap-2 px-5 py-4" style={{ borderTop: `1px solid ${DIALOG_BD}` }}>
              <button onClick={onClose} disabled={uploading}
                className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 rounded-xl transition-colors disabled:opacity-40">
                取消
              </button>
              <button onClick={upload} disabled={!files.length || !selectedRule || uploading}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white btn-aurora rounded-xl disabled:opacity-40">
                {uploading
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />上传中 ({progress.filter(p => p === 100).length}/{files.length})</>
                  : <><Upload className="w-3.5 h-3.5" />开始上传{files.length > 0 ? ` (${files.length} 个)` : ''}</>}
              </button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
