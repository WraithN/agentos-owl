/* 智能体配置页 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, ChevronLeft, ChevronRight, Pencil, Trash2, Database, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AGENTS, AVAILABLE_KBS } from '@/data/mockData';
import type { Agent } from '@/types';
import { useT } from '@/lib/i18n';

const MODELS = ['GPT-4o', 'Claude 3.5 Sonnet', 'Claude 3 Haiku', 'Gemini 1.5 Pro', '自定义'];
const AVAILABLE_TOOLS = ['web_search', 'code_runner', 'file_reader', 'calculator', 'browser', 'image_gen', 'api_caller'];
const PAGE_SIZE = 6;

const DIALOG_BG = 'var(--panel-bg-solid)';
const DIALOG_BD = 'var(--border-subtle)';

interface KBRef { id: string; name: string }

interface AgentFormData {
  name: string;
  description: string;
  enabled: boolean;
  prompt: string;
  model: string;
  tools: string[];
  triggerRule: string;
  knowledgeBases: KBRef[];
}

const inputCls = (err?: string) => cn(
  'w-full border rounded-xl px-3 py-2 text-xs placeholder-slate-500 outline-none focus:border-cyan-500/50 transition-colors',
  'bg-black/10 dark:bg-white/5 text-slate-800 dark:text-slate-200',
  err ? 'border-rose-500/50' : 'border-[var(--border-subtle)]'
);

/* ── KB选择器（下拉多选） ───────────────────────────────────────────── */
function KBPicker({ value, onChange }: { value: KBRef[]; onChange: (v: KBRef[]) => void }) {
  const [open, setOpen] = useState(false);
  const selectedIds = new Set(value.map(k => k.id));

  function toggle(kb: typeof AVAILABLE_KBS[number]) {
    if (selectedIds.has(kb.id)) {
      onChange(value.filter(k => k.id !== kb.id));
    } else {
      onChange([...value, { id: kb.id, name: kb.name }]);
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-xs text-slate-500 font-medium block">知识库（选填）</label>
      {/* 已选标签 */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map(kb => (
            <span key={kb.id} className="flex items-center gap-1 text-[11px] bg-cyan-500/12 text-cyan-600 dark:text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/25">
              <Database className="w-3 h-3 shrink-0" />{kb.name}
              <button onClick={() => onChange(value.filter(k => k.id !== kb.id))} className="hover:text-rose-400 transition-colors ml-0.5"><X className="w-2.5 h-2.5" /></button>
            </span>
          ))}
        </div>
      )}
      {/* 下拉触发 */}
      <div className="relative">
        <button onClick={() => setOpen(v => !v)}
          className={cn('w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl border transition-colors',
            open ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-[var(--border-subtle)] bg-black/5 dark:bg-white/5 hover:border-slate-400/40')}>
          <span className={value.length ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}>
            {value.length ? `已选 ${value.length} 个知识库` : '选择知识库…'}
          </span>
          <ChevronDown className={cn('w-3.5 h-3.5 text-slate-400 transition-transform', open && 'rotate-180')} />
        </button>
        {open && (
          <div className="absolute z-20 top-full mt-1 w-full rounded-xl border border-[var(--border-subtle)] overflow-hidden shadow-xl"
            style={{ background: 'var(--panel-bg-solid)', backdropFilter: 'blur(16px)' }}>
            {AVAILABLE_KBS.map(kb => {
              const selected = selectedIds.has(kb.id);
              return (
                <button key={kb.id} onClick={() => toggle(kb)}
                  className={cn('w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-black/8 dark:hover:bg-white/8',
                    selected && 'bg-cyan-500/8')}>
                  <div className={cn('w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all',
                    selected ? 'bg-cyan-500 border-cyan-500' : 'border-[var(--border-subtle)]')}>
                    {selected && <span className="text-white text-[10px] font-bold leading-none">✓</span>}
                  </div>
                  <Database className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-100 truncate">{kb.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono truncate">{kb.vectorDbUrl}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Agent弹窗 ─────────────────────────────────────────────────────── */
function AgentDialog({ title, initial, confirmLabel, onClose, onConfirm }: {
  title: string; initial: AgentFormData; confirmLabel: string;
  onClose: () => void; onConfirm: (data: AgentFormData) => void;
}) {
  const [form, setForm] = useState<AgentFormData>(initial);
  const [toolInput, setToolInput] = useState('');
  const [errors, setErrors] = useState<{ name?: string; model?: string }>({});

  function handleSubmit() {
    const errs: typeof errors = {};
    if (!form.name.trim()) errs.name = '名称为必填项';
    if (!form.model) errs.model = '请选择模型';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onConfirm(form);
  }

  function addTool(t: string) {
    if (t && !form.tools.includes(t)) setForm(f => ({ ...f, tools: [...f.tools, t] }));
    setToolInput('');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 16 }} transition={{ duration: 0.18 }}
        className="relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: DIALOG_BG, border: `1px solid ${DIALOG_BD}`, backdropFilter: 'blur(24px)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${DIALOG_BD}` }}>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* 名称 + 生效开关 */}
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <label className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1">名称 <span className="text-rose-400">*</span></label>
              <input value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors(p => ({ ...p, name: undefined })); }}
                placeholder="输入智能体名称" className={inputCls(errors.name)} />
              {errors.name && <p className="text-[10px] text-rose-400 mt-1">{errors.name}</p>}
            </div>
            <div className="flex flex-col items-center gap-1 pt-4 shrink-0">
              <span className="text-[10px] text-slate-500">生效</span>
              <button onClick={() => setForm(f => ({ ...f, enabled: !f.enabled }))}
                className={cn('w-9 h-5 rounded-full relative transition-all duration-200', form.enabled ? 'bg-gradient-to-r from-cyan-500 to-purple-600' : 'bg-black/15 dark:bg-white/15')}>
                <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200', form.enabled ? 'left-4' : 'left-0.5')} />
              </button>
            </div>
          </div>
          {/* 描述 */}
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">描述</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="简短描述该 Agent 的职责" className={inputCls()} />
          </div>
          {/* 提示词 */}
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">系统提示词</label>
            <textarea value={form.prompt} onChange={e => setForm(f => ({ ...f, prompt: e.target.value }))}
              rows={4} placeholder="输入系统提示词，定义 Agent 的行为与角色..." className={cn(inputCls(), 'resize-none leading-relaxed')} />
          </div>
          {/* 模型 */}
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1">连接模型 <span className="text-rose-400">*</span></label>
            <select value={form.model} onChange={e => { setForm(f => ({ ...f, model: e.target.value })); setErrors(p => ({ ...p, model: undefined })); }}
              className={cn(inputCls(errors.model), 'appearance-none cursor-pointer')}>
              <option value="">— 请选择模型 —</option>
              {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            {errors.model && <p className="text-[10px] text-rose-400 mt-1">{errors.model}</p>}
          </div>
          {/* 工具 */}
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">绑定工具</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.tools.map(t => (
                <span key={t} className="flex items-center gap-1 text-[10px] bg-cyan-500/12 text-cyan-600 dark:text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/25">
                  {t}<button onClick={() => setForm(f => ({ ...f, tools: f.tools.filter(x => x !== t) }))} className="hover:text-rose-400 transition-colors"><X className="w-2.5 h-2.5" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <select value={toolInput} onChange={e => setToolInput(e.target.value)}
                className="flex-1 border rounded-xl px-3 py-2 text-xs outline-none focus:border-cyan-500/50 appearance-none bg-black/10 dark:bg-white/5 text-slate-700 dark:text-slate-200 border-[var(--border-subtle)]">
                <option value="">— 选择工具 —</option>
                {AVAILABLE_TOOLS.filter(t => !form.tools.includes(t)).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <button onClick={() => addTool(toolInput)} disabled={!toolInput}
                className="px-3 py-2 text-xs font-medium btn-aurora rounded-xl text-white disabled:opacity-40">添加</button>
            </div>
          </div>
          {/* 知识库 */}
          <KBPicker value={form.knowledgeBases} onChange={v => setForm(f => ({ ...f, knowledgeBases: v }))} />
          {/* 触发规则 */}
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">触发规则</label>
            <textarea value={form.triggerRule} onChange={e => setForm(f => ({ ...f, triggerRule: e.target.value }))}
              rows={2} placeholder="描述何时触发该 Agent" className={cn(inputCls(), 'resize-none leading-relaxed')} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4" style={{ borderTop: `1px solid ${DIALOG_BD}` }}>
          <button onClick={onClose} className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 rounded-xl transition-colors">取消</button>
          <button onClick={handleSubmit} className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white btn-aurora rounded-xl">
            <Plus className="w-3.5 h-3.5" />{confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── 删除确认弹窗 ──────────────────────────────────────────────────── */
function DeleteConfirm({ name, onCancel, onConfirm }: { name: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.15 }}
        className="relative w-full max-w-sm rounded-2xl shadow-2xl p-5 space-y-4"
        style={{ background: DIALOG_BG, border: `1px solid ${DIALOG_BD}`, backdropFilter: 'blur(24px)' }}
        onClick={e => e.stopPropagation()}>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">确认删除</p>
        <p className="text-xs text-slate-500">确定要删除智能体 <span className="text-slate-700 dark:text-slate-200 font-medium">「{name}」</span> 吗？此操作不可撤销。</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 rounded-xl transition-colors">取消</button>
          <button onClick={onConfirm} className="px-4 py-2 text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-colors">删除</button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── 主体 ──────────────────────────────────────────────────────────── */
export default function AgentSettings() {
  const [agents, setAgents] = useState<Agent[]>(AGENTS);
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>(Object.fromEntries(AGENTS.map(a => [a.id, a.enabled])));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Agent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null);
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(agents.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageAgents = agents.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const emptyForm: AgentFormData = { name: '', description: '', enabled: true, prompt: '', model: '', tools: [], triggerRule: '', knowledgeBases: [] };

  function handleCreate(data: AgentFormData) {
    const colors = ['#00F5A0', '#00D4FF', '#A78BFA', '#F472B6', '#FB923C', '#34D399'];
    const newAgent: Agent = {
      id: `agent-${Date.now()}`, name: data.name, role: 'custom',
      description: data.description || '暂无描述',
      avatar: data.name.slice(0, 1).toUpperCase(),
      color: colors[agents.length % colors.length],
      bgColor: 'bg-slate-800', textColor: 'text-slate-200', borderColor: 'border-slate-600',
      status: 'idle', model: data.model, tools: data.tools, capabilities: [],
      triggerRule: data.triggerRule, enabled: data.enabled,
    };
    setAgents(prev => [...prev, newAgent]);
    setEnabledMap(prev => ({ ...prev, [newAgent.id]: data.enabled }));
    setDialogOpen(false);
    setPage(Math.ceil((agents.length + 1) / PAGE_SIZE) - 1);
  }

  function handleEdit(data: AgentFormData) {
    if (!editTarget) return;
    setAgents(prev => prev.map(a => a.id === editTarget.id
      ? { ...a, name: data.name, description: data.description, model: data.model, tools: data.tools, triggerRule: data.triggerRule, enabled: data.enabled }
      : a));
    setEnabledMap(prev => ({ ...prev, [editTarget.id]: data.enabled }));
    setEditTarget(null);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    setAgents(prev => prev.filter(a => a.id !== deleteTarget.id));
    setDeleteTarget(null);
    setPage(p => Math.min(p, Math.max(0, Math.ceil((agents.length - 1) / PAGE_SIZE) - 1)));
  }

  const t = useT();
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('agent.title')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('agent.subtitle')}</p>
        </div>
        <button onClick={() => setDialogOpen(true)} className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white btn-aurora rounded-xl">
          <Plus className="w-3.5 h-3.5" />新建 Agent
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {pageAgents.map((agent, i) => (
          <motion.div key={agent.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            onClick={() => setEditTarget(agent)}
            className="glass rounded-2xl p-4 flex flex-col gap-3 h-full cursor-pointer hover:ring-1 hover:ring-cyan-500/30 transition-all">
            {/* 顶部：头像 + 名称 + 操作按钮（右上） */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                style={{ background: `${agent.color}25`, border: `2px solid ${agent.color}60`, color: agent.color }}>
                {agent.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{agent.name}</p>
                <p className="text-xs text-slate-500 truncate mt-0.5">{agent.description}</p>
              </div>
              {/* 操作按钮 - 右上角：开关 → 编辑 → 删除 */}
              <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                <button onClick={() => setEnabledMap(prev => ({ ...prev, [agent.id]: !prev[agent.id] }))}
                  title={enabledMap[agent.id] ? '停用' : '启用'}
                  className={cn('w-9 h-5 rounded-full relative transition-all duration-200 shrink-0 mr-0.5', enabledMap[agent.id] ? 'bg-gradient-to-r from-cyan-500 to-purple-600' : 'bg-black/15 dark:bg-white/15')}>
                  <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200', enabledMap[agent.id] ? 'left-4' : 'left-0.5')} />
                </button>
                <button onClick={() => setEditTarget(agent)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-500 hover:bg-cyan-500/10 transition-colors" title="编辑">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setDeleteTarget(agent)}
                  className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 transition-colors" title="删除">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div onClick={e => e.stopPropagation()}>
              <label className="text-xs text-slate-500 font-medium">基础模型</label>
              <select defaultValue={agent.model}
                className="w-full mt-1 bg-black/5 dark:bg-white/5 border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 outline-none focus:border-cyan-500/50">
                {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium">绑定工具</label>
              <div className="flex flex-wrap gap-1 mt-1">
                {agent.tools.map(t => (
                  <span key={t} className="text-[10px] bg-black/5 dark:bg-white/8 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full border border-[var(--border-subtle)]">{t}</span>
                ))}
                <button onClick={e => { e.stopPropagation(); setEditTarget(agent); }}
                  className="text-[10px] text-cyan-500 dark:text-cyan-400 border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 rounded-full hover:bg-cyan-500/20 transition-colors">+ 添加</button>
              </div>
            </div>
            <div onClick={e => e.stopPropagation()}>
              <label className="text-xs text-slate-500 font-medium">触发规则</label>
              <textarea defaultValue={agent.triggerRule} rows={2}
                className="w-full mt-1 bg-black/5 dark:bg-white/5 border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-xs text-slate-700 dark:text-slate-300 outline-none focus:border-cyan-500/50 resize-none leading-relaxed" />
            </div>
          </motion.div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={safePage === 0}
            className={cn('p-1.5 rounded-lg transition-colors', safePage === 0 ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8')}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} onClick={() => setPage(i)}
              className={cn('w-7 h-7 rounded-lg text-xs font-semibold transition-colors', i === safePage ? 'btn-aurora text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8')}>
              {i + 1}
            </button>
          ))}
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={safePage === totalPages - 1}
            className={cn('p-1.5 rounded-lg transition-colors', safePage === totalPages - 1 ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8')}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <AnimatePresence>
        {dialogOpen && <AgentDialog title="新建 Agent" confirmLabel="创建 Agent" initial={emptyForm} onClose={() => setDialogOpen(false)} onConfirm={handleCreate} />}
      </AnimatePresence>
      <AnimatePresence>
        {editTarget && (
          <AgentDialog title={`编辑 Agent · ${editTarget.name}`} confirmLabel="保存修改"
            initial={{ name: editTarget.name, description: editTarget.description, enabled: enabledMap[editTarget.id] ?? editTarget.enabled, prompt: '', model: editTarget.model, tools: [...editTarget.tools], triggerRule: editTarget.triggerRule, knowledgeBases: [] }}
            onClose={() => setEditTarget(null)} onConfirm={handleEdit} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {deleteTarget && <DeleteConfirm name={deleteTarget.name} onCancel={() => setDeleteTarget(null)} onConfirm={handleDelete} />}
      </AnimatePresence>
    </div>
  );
}
