/* LLM 配置 — 模型管理（含默认模型选择） */
import { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, Plus, Trash2, Brain, Mic, Database, Pencil, AlertTriangle, Save, X, Loader2 } from 'lucide-react';
import type { LlmModelConfig } from '@owl-os/core';
import { LLM_PROVIDERS, getLlmProvider, inferLlmProvider } from '@owl-os/core';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { inputCls as globalInputCls, btnPrimary } from '@/lib/ui-styles';
import {
  getSettings,
  saveSettings,
  getSecret,
  setSecret,
  deleteSecret,
} from '@/services/electron';
import { toast } from 'sonner';

/* ── 模型类型定义 ─────────────────────────────────────────────────────── */
export type { LlmModelConfig } from '@owl-os/core';
export type ModelCategory = LlmModelConfig['category'];

type LLMModel = LlmModelConfig & { apiKey: string };

const CATEGORY_CFG: Record<ModelCategory, { label: string; icon: typeof Brain; color: string; bg: string }> = {
  llm:       { label: '对话模型',   icon: Brain,    color: 'text-violet-400',  bg: 'bg-violet-500/15 border-violet-500/25' },
  embedding: { label: 'Embedding', icon: Database, color: 'text-cyan-400',    bg: 'bg-cyan-500/15 border-cyan-500/25' },
  voice:     { label: '语音模型',   icon: Mic,      color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/25' },
};

const DIALOG_BG = 'var(--panel-bg-solid)';
const DIALOG_BD = 'var(--border-subtle)';

const SECRET_PREFIX = 'llm_model_key/';

function parseModels(value: unknown): LlmModelConfig[] {
  if (!Array.isArray(value)) return [];
  return value.filter((m): m is LlmModelConfig => {
    if (!m || typeof m !== 'object') return false;
    const v = m as Record<string, unknown>;
    return (
      typeof v.id === 'string' &&
      typeof v.name === 'string' &&
      typeof v.baseUrl === 'string' &&
      typeof v.provider === 'string' &&
      (v.category === 'llm' || v.category === 'embedding' || v.category === 'voice')
    );
  });
}

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
            <button type="button" onClick={onCancel} className="flex-1 px-4 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-white/8 rounded-xl transition-colors border border-white/10">取消</button>
            <button type="button" onClick={onConfirm} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-colors">
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
  const [provider, setProvider] = useState(model.provider);
  const [baseUrl, setBaseUrl] = useState(model.baseUrl);
  const [apiKey, setApiKey] = useState(model.apiKey);
  const cfg = CATEGORY_CFG[model.category];
  const Icon = cfg.icon;
  const providerMeta = getLlmProvider(provider);

  useEffect(() => {
    setName(model.name);
    setProvider(model.provider);
    setBaseUrl(model.baseUrl);
    setApiKey(model.apiKey);
  }, [model.id, model.name, model.provider, model.baseUrl, model.apiKey]);

  const inputCls = 'w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-cyan-500/50 transition-colors font-mono';
  const selectCls = 'w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500/50 transition-colors appearance-none';

  function updateProvider(nextProvider: string) {
    setProvider(nextProvider);
    const meta = getLlmProvider(nextProvider);
    if (!meta) return;
    const currentDefault = getLlmProvider(provider)?.defaultBaseUrl;
    // 仅在当前 baseUrl 为空或仍等于旧供应商默认地址时自动替换，避免覆盖用户自定义地址
    if (!baseUrl.trim() || baseUrl.trim() === currentDefault) {
      setBaseUrl(meta.defaultBaseUrl);
    }
  }

  function save() {
    if (!name.trim() || !baseUrl.trim() || !provider.trim()) return;
    onSave(model.id, { name: name.trim(), provider: provider.trim(), baseUrl: baseUrl.trim(), apiKey: apiKey.trim() });
    setEditing(false);
  }

  function cancel() {
    setName(model.name); setProvider(model.provider); setBaseUrl(model.baseUrl); setApiKey(model.apiKey);
    setEditing(false);
  }

  return (
    <>
      <div className={cn('glass rounded-xl overflow-hidden transition-all', editing && 'ring-1 ring-cyan-500/40')}>
        {/* 行头 — 点击内容区开启编辑 */}
        <div
          className={cn('w-full text-left flex items-center gap-3 px-4 py-3 select-none cursor-pointer hover:bg-white/4')}
          onClick={() => setEditing(v => !v)}>
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
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] px-1.5 py-0.5 rounded border bg-white/5 border-white/10 text-slate-400 shrink-0">
                {providerMeta?.name ?? model.provider}
              </span>
              <p className="text-[11px] text-slate-500 truncate">{model.baseUrl}</p>
            </div>
          </div>
          <span className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
            <button type="button" onClick={() => onToggleDefault(model.id)}
              className="text-[10px] text-slate-500 hover:text-slate-300 px-2 py-1 rounded hover:bg-white/8 transition-colors">
              {model.isDefault ? '取消默认' : '设为默认'}
            </button>
            <button type="button" onClick={() => setEditing(v => !v)}
              className={cn('p-1.5 rounded-lg transition-colors', editing ? 'text-cyan-400 bg-cyan-500/15' : 'text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10')}>
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={() => setConfirmDelete(true)}
              className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 rounded-lg transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </span>
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
                  <label className="text-[11px] text-slate-500 font-medium block mb-1">供应商</label>
                  <select value={provider} onChange={e => updateProvider(e.target.value)} className={selectCls}>
                    {LLM_PROVIDERS.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
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
                    <button type="button" onClick={() => setShowKey(v => !v)} className="text-slate-500 hover:text-slate-300 transition-colors shrink-0">
                      {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <button type="button" onClick={cancel} className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-white/8 rounded-lg transition-colors">
                    <X className="w-3 h-3" />取消
                  </button>
                  <button type="button" onClick={save} disabled={!name.trim() || !baseUrl.trim() || !provider.trim()}
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
  const [provider, setProvider] = useState('openai');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [category, setCategory] = useState<ModelCategory>('llm');

  function updateProvider(nextProvider: string) {
    setProvider(nextProvider);
    const meta = getLlmProvider(nextProvider);
    if (meta) setBaseUrl(meta.defaultBaseUrl);
  }

  function submit() {
    if (!name.trim() || !baseUrl.trim() || !provider.trim()) return;
    onAdd({ name: name.trim(), provider: provider.trim(), baseUrl: baseUrl.trim(), apiKey: apiKey.trim(), category });
  }

  const inputCls = globalInputCls;
  const selectCls = 'w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500/50 transition-colors appearance-none';
  return (
    <div className="glass rounded-xl p-4 space-y-3 border border-cyan-500/20">
      <p className="text-xs font-semibold text-slate-300">新增模型</p>
      <div className="grid grid-cols-3 gap-1 p-1 bg-white/4 rounded-xl">
        {(Object.entries(CATEGORY_CFG) as [ModelCategory, typeof CATEGORY_CFG[ModelCategory]][]).map(([k, v]) => (
          <button type="button" key={k} onClick={() => setCategory(k)}
            className={cn('flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-all', category === k ? cn('bg-white/10', v.color) : 'text-slate-500 hover:text-slate-300')}>
            <v.icon className="w-3 h-3" />{v.label}
          </button>
        ))}
      </div>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="模型名称（如 gpt-4o）" className={inputCls} />
      <select value={provider} onChange={e => updateProvider(e.target.value)} className={selectCls}>
        {LLM_PROVIDERS.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="Base URL（如 https://api.openai.com/v1）" className={inputCls} />
      <input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="API Key" type="password" className={inputCls} />
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-300 hover:bg-white/8 rounded-lg transition-colors">取消</button>
        <button type="button" onClick={submit} disabled={!name.trim() || !baseUrl.trim() || !provider.trim()}
          className={btnPrimary}>
          <Plus className="w-3 h-3" />添加
        </button>
      </div>
    </div>
  );
}

export default function ApiSettings() {
  const [models, setModels] = useState<LLMModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<ModelCategory | 'all'>('all');

  /* ── 初始化：从 SQLite + safeStorage 加载 ── */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getSettings()
      .then(async (settings) => {
        const metaList = parseModels(settings['llmModels']);
        const withKeys = await Promise.all(
          metaList.map(async (meta) => {
            const apiKey = (await getSecret(`${SECRET_PREFIX}${meta.id}`)) ?? '';
            return { ...meta, apiKey };
          })
        );
        if (!cancelled) setModels(withKeys);
      })
      .catch(() => {
        if (!cancelled) toast.error('加载 LLM 配置失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* ── 持久化辅助 ── */
  async function persist(next: LLMModel[]) {
    const metadata: LlmModelConfig[] = next.map(({ apiKey: _omit, ...meta }) => meta);
    await saveSettings({ llmModels: metadata });
    window.dispatchEvent(new CustomEvent('owl:llm-models-changed', { detail: { metadata } }));
  }

  async function addModel(m: Omit<LLMModel, 'id'>) {
    const id = `m-${Date.now()}`;
    const next: LLMModel[] = [...models, { ...m, id }];
    setModels(next);
    setAdding(false);
    try {
      await persist(next);
      if (m.apiKey.trim()) {
        await setSecret(`${SECRET_PREFIX}${id}`, m.apiKey.trim());
      }
      toast.success('已添加模型');
    } catch {
      toast.error('保存失败');
    }
  }

  async function deleteModel(id: string) {
    const next = models.filter((m) => m.id !== id);
    setModels(next);
    try {
      await persist(next);
      await deleteSecret(`${SECRET_PREFIX}${id}`);
    } catch {
      toast.error('删除失败');
    }
  }

  async function saveModel(id: string, data: Partial<LLMModel>) {
    const next = models.map((m) => (m.id === id ? { ...m, ...data } : m));
    setModels(next);
    try {
      await persist(next);
      if (data.apiKey !== undefined) {
        const trimmed = (data.apiKey ?? '').trim();
        if (trimmed) await setSecret(`${SECRET_PREFIX}${id}`, trimmed);
        else await deleteSecret(`${SECRET_PREFIX}${id}`);
      }
      toast.success('已保存');
    } catch {
      toast.error('保存失败');
    }
  }

  async function toggleDefault(id: string) {
    const target = models.find((m) => m.id === id);
    if (!target) return;
    // 每个 category 至多一个默认；toggle 时同分类其它项的 default 置 false
    const next = models.map((m) => {
      if (m.id === id) return { ...m, isDefault: !target.isDefault };
      if (m.category === target.category && !target.isDefault) return { ...m, isDefault: false };
      return m;
    });
    setModels(next);
    try {
      await persist(next);
    } catch {
      toast.error('保存失败');
    }
  }

  const TABS: { key: ModelCategory | 'all'; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'llm', label: '对话模型' },
    { key: 'embedding', label: 'Embedding' },
    { key: 'voice', label: '语音模型' },
  ];
  const filtered = activeTab === 'all' ? models : models.filter((m) => m.category === activeTab);

  const noDefaultLlm = useMemo(
    () => !models.some((m) => m.category === 'llm' && m.isDefault),
    [models]
  );

  if (loading) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          加载中...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-cyan-500/15 border border-cyan-500/25 shrink-0">
          <Brain className="w-4 h-4 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">LLM配置</h1>
          <p className="text-sm text-slate-500 mt-0.5">配置对话、Embedding 及语音模型，点击列表项可编辑</p>
        </div>
      </div>

      {/* ── 未设置默认对话模型横幅 ── */}
      {noDefaultLlm && (
        <div
          className="flex items-start gap-3 rounded-2xl px-4 py-3 border border-rose-500/30 bg-rose-500/10"
          role="alert"
        >
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-rose-500/20 shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-rose-300">尚未设置默认对话模型</p>
            <p className="text-xs text-rose-300/80 mt-1 leading-relaxed">
              在「对话模型」中点击任意模型右侧「设为默认」即可启用。未设置前，与 AI 的对话功能不可用。
            </p>
          </div>
        </div>
      )}

      {/* 分类 tab + 新增按钮 */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1 p-1 bg-white/4 rounded-xl flex-1">
          {TABS.map((t) => (
            <button type="button" key={t.key} onClick={() => setActiveTab(t.key)}
              className={cn('flex-1 py-1.5 text-[11px] font-medium rounded-lg transition-all',
                activeTab === t.key ? 'bg-white/10 text-slate-200' : 'text-slate-500 hover:text-slate-300')}>
              {t.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setAdding(true)} className={cn(btnPrimary, 'shrink-0')}>
          <Plus className="w-3 h-3" />新增模型
        </button>
      </div>

      {adding && <AddModelForm onAdd={addModel} onCancel={() => setAdding(false)} />}

      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-xs text-slate-500 text-center py-8">暂无模型，点击「新增模型」添加</p>}
        {filtered.map((m) => (
          <ModelCard key={m.id} model={m} onDelete={deleteModel} onSave={saveModel} onToggleDefault={toggleDefault} />
        ))}
      </div>
    </div>
  );
}
