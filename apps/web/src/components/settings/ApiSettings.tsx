/* API 与开发者设置 — LLM 管理 */
import { useState } from 'react';
import { Eye, EyeOff, Plus, Trash2, Brain, Mic, Database, Pencil, AlertTriangle, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { inputCls as globalInputCls, btnPrimary } from '@/lib/ui-styles';

/* ── 模型类型定义 ─────────────────────────────────────────────────────── */
type ModelCategory = 'llm' | 'embedding' | 'voice';
interface LLMModel {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  category: ModelCategory;
  isDefault?: boolean;
}

const CATEGORY_CFG: Record<ModelCategory, { label: string; icon: typeof Brain; color: string; bg: string }> = {
  llm:       { label: '对话模型',   icon: Brain,    color: 'text-violet-400',  bg: 'bg-violet-500/15 border-violet-500/25' },
  embedding: { label: 'Embedding', icon: Database, color: 'text-cyan-400',    bg: 'bg-cyan-500/15 border-cyan-500/25' },
  voice:     { label: '语音模型',   icon: Mic,      color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/25' },
};

const PRESET_MODELS: LLMModel[] = [
  { id: 'm1', name: 'GPT-4o',           baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-xxxxxxxxxxxxxxxxxxxx', category: 'llm',       isDefault: true },
  { id: 'm2', name: 'text-embedding-3', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-xxxxxxxxxxxxxxxxxxxx', category: 'embedding', isDefault: true },
  { id: 'm3', name: 'Whisper-1',        baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-xxxxxxxxxxxxxxxxxxxx', category: 'voice',     isDefault: true },
];

const DIALOG_BG = 'var(--panel-bg-solid)';
const DIALOG_BD = 'var(--border-subtle)';

/* ── 删除确认弹窗 ─────────────────────────────────────────────────────── */
function DeleteConfirm({ name, onCancel, onConfirm }: { name: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }}
        className="relative w-full max-w-[calc(100%-2rem)] md:max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: DIALOG_BG, border: `1px solid ${DIALOG_BD}`, backdropFilter: 'blur(24px)' }}
        onClick={e => e.stopPropagation()}>
        <div className="p-5 flex flex-col items-center gap-3 text-center">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-rose-500/15">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200">确认删除</p>
            <p className="text-xs text-slate-500 mt-1">确定要删除模型 <span className="text-slate-300 font-medium">「{name}」</span>？此操作不可撤销。</p>
          </div>
          <div className="flex items-center gap-2 w-full pt-1">
            <button onClick={onCancel} className="flex-1 px-4 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-white/8 rounded-xl transition-colors border border-white/10">取消</button>
            <button onClick={onConfirm} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-colors">
              <Trash2 className="w-3.5 h-3.5" />删除
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ── 模型卡片（点击行 = 编辑） ────────────────────────────────────────── */
function ModelCard({ model, onDelete, onSave, onToggleDefault }: {
  model: LLMModel;
  onDelete: (id: string) => void;
  onSave: (id: string, data: Partial<LLMModel>) => void;
  onToggleDefault: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState(model.name);
  const [baseUrl, setBaseUrl] = useState(model.baseUrl);
  const [apiKey, setApiKey] = useState(model.apiKey);
  const cfg = CATEGORY_CFG[model.category];
  const Icon = cfg.icon;

  const inputCls = 'w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-cyan-500/50 transition-colors font-mono';

  function save() {
    if (!name.trim() || !baseUrl.trim()) return;
    onSave(model.id, { name: name.trim(), baseUrl: baseUrl.trim(), apiKey: apiKey.trim() });
    setEditing(false);
  }

  function cancel() {
    setName(model.name); setBaseUrl(model.baseUrl); setApiKey(model.apiKey);
    setEditing(false);
  }

  return (
    <>
      <div className={cn('glass rounded-xl overflow-hidden transition-all', editing && 'ring-1 ring-cyan-500/40')}>
        {/* 行头 — 点击开启编辑 */}
        <div
          className={cn('flex items-center gap-3 px-4 py-3 cursor-pointer select-none', !editing && 'hover:bg-white/4')}
          onClick={() => !editing && setEditing(true)}>
          <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border', cfg.bg)}>
            <Icon className={cn('w-3.5 h-3.5', cfg.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-200 truncate">{model.name}</span>
              {model.isDefault && (
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0', cfg.bg, cfg.color)}>默认</span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">{model.baseUrl}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
            <button onClick={() => onToggleDefault(model.id)}
              className="text-[10px] text-slate-500 hover:text-slate-300 px-2 py-1 rounded hover:bg-white/8 transition-colors">
              {model.isDefault ? '取消默认' : '设为默认'}
            </button>
            <button onClick={() => setEditing(v => !v)}
              className={cn('p-1.5 rounded-lg transition-colors', editing ? 'text-cyan-400 bg-cyan-500/15' : 'text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10')}>
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setConfirmDelete(true)}
              className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 rounded-lg transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 编辑展开区 */}
        <AnimatePresence>
          {editing && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
              <div className="px-4 pb-4 space-y-2.5 border-t border-white/6 pt-3">
                <div>
                  <label className="text-[11px] text-slate-500 font-medium block mb-1">模型名称</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="如 gpt-4o" className={inputCls} />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 font-medium block mb-1">Base URL</label>
                  <input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="https://api.openai.com/v1" className={inputCls} />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 font-medium block mb-1">API Key</label>
                  <div className="flex items-center gap-2 bg-white/4 border border-white/10 rounded-lg px-3 py-1.5">
                    <input
                      value={apiKey} onChange={e => setApiKey(e.target.value)}
                      type={showKey ? 'text' : 'password'}
                      placeholder="sk-..."
                      className="flex-1 text-xs font-mono text-slate-200 bg-transparent outline-none placeholder-slate-600" />
                    <button onClick={() => setShowKey(v => !v)} className="text-slate-500 hover:text-slate-300 transition-colors shrink-0">
                      {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <button onClick={cancel} className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-white/8 rounded-lg transition-colors">
                    <X className="w-3 h-3" />取消
                  </button>
                  <button onClick={save} disabled={!name.trim() || !baseUrl.trim()}
                    className={cn(btnPrimary, 'rounded-xl py-2')}>
                    <Save className="w-3 h-3" />保存
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {confirmDelete && (
          <DeleteConfirm name={model.name} onCancel={() => setConfirmDelete(false)} onConfirm={() => { setConfirmDelete(false); onDelete(model.id); }} />
        )}
      </AnimatePresence>
    </>
  );
}

/* ── 新增表单 ─────────────────────────────────────────────────────────── */
function AddModelForm({ onAdd, onCancel }: { onAdd: (m: Omit<LLMModel, 'id'>) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [category, setCategory] = useState<ModelCategory>('llm');

  function submit() {
    if (!name.trim() || !baseUrl.trim()) return;
    onAdd({ name: name.trim(), baseUrl: baseUrl.trim(), apiKey: apiKey.trim(), category });
  }

  const inputCls = globalInputCls;
  return (
    <div className="glass rounded-xl p-4 space-y-3 border border-cyan-500/20">
      <p className="text-xs font-semibold text-slate-300">新增模型</p>
      <div className="grid grid-cols-3 gap-1 p-1 bg-white/4 rounded-xl">
        {(Object.entries(CATEGORY_CFG) as [ModelCategory, typeof CATEGORY_CFG[ModelCategory]][]).map(([k, v]) => (
          <button key={k} onClick={() => setCategory(k)}
            className={cn('flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-all', category === k ? cn('bg-white/10', v.color) : 'text-slate-500 hover:text-slate-300')}>
            <v.icon className="w-3 h-3" />{v.label}
          </button>
        ))}
      </div>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="模型名称（如 gpt-4o）" className={inputCls} />
      <input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="Base URL（如 https://api.openai.com/v1）" className={inputCls} />
      <input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="API Key" type="password" className={inputCls} />
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-300 hover:bg-white/8 rounded-lg transition-colors">取消</button>
        <button onClick={submit} disabled={!name.trim() || !baseUrl.trim()}
          className={btnPrimary}>
          <Plus className="w-3 h-3" />添加
        </button>
      </div>
    </div>
  );
}

export default function ApiSettings() {
  const [models, setModels] = useState<LLMModel[]>(PRESET_MODELS);
  const [adding, setAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<ModelCategory | 'all'>('all');

  function addModel(m: Omit<LLMModel, 'id'>) {
    setModels(prev => [...prev, { ...m, id: `m-${Date.now()}` }]);
    setAdding(false);
  }

  function deleteModel(id: string) {
    setModels(prev => prev.filter(m => m.id !== id));
  }

  function saveModel(id: string, data: Partial<LLMModel>) {
    setModels(prev => prev.map(m => m.id === id ? { ...m, ...data } : m));
  }

  function toggleDefault(id: string) {
    setModels(prev => prev.map(m => m.id === id ? { ...m, isDefault: !m.isDefault } : m));
  }

  const TABS: { key: ModelCategory | 'all'; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'llm', label: '对话模型' },
    { key: 'embedding', label: 'Embedding' },
    { key: 'voice', label: '语音模型' },
  ];
  const filtered = activeTab === 'all' ? models : models.filter(m => m.category === activeTab);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">LLM 管理</h1>
        <p className="text-sm text-slate-400 mt-1">配置对话、Embedding 及语音模型，点击列表项可编辑</p>
      </div>

      {/* 分类 tab + 新增按钮 */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1 p-1 bg-white/4 rounded-xl flex-1">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={cn('flex-1 py-1.5 text-[11px] font-medium rounded-lg transition-all',
                activeTab === t.key ? 'bg-white/10 text-slate-200' : 'text-slate-500 hover:text-slate-300')}>
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={() => setAdding(true)} className={cn(btnPrimary, 'shrink-0')}>
          <Plus className="w-3 h-3" />新增模型
        </button>
      </div>

      {adding && <AddModelForm onAdd={addModel} onCancel={() => setAdding(false)} />}

      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-xs text-slate-500 text-center py-8">暂无模型，点击「新增模型」添加</p>}
        {filtered.map(m => (
          <ModelCard key={m.id} model={m} onDelete={deleteModel} onSave={saveModel} onToggleDefault={toggleDefault} />
        ))}
      </div>
    </div>
  );
}
