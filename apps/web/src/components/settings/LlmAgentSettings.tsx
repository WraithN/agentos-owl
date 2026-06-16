/* Pi Agent LLM 后端设置 */
import { useEffect, useState } from 'react';
import { Bot, Eye, EyeOff, Loader2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { inputCls, btnPrimary } from '@/lib/ui-styles';
import { getSettings, saveSettings, getSecret, setSecret, deleteSecret } from '@/services/electron';
import { toast } from 'sonner';

const PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'google', label: 'Google' },
  { value: 'groq', label: 'Groq' },
  { value: 'mistral', label: 'Mistral' },
  { value: 'xai', label: 'xAI' },
  { value: 'together', label: 'Together' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'custom', label: '自定义' },
] as const;

type Provider = (typeof PROVIDERS)[number]['value'];

interface FormState {
  llmProvider: Provider;
  defaultModel: string;
  llmApiKey: string;
  llmBaseUrl: string;
  agentSystemPrompt: string;
}

const DEFAULTS: FormState = {
  llmProvider: 'openai',
  defaultModel: 'gpt-4o-mini',
  llmApiKey: '',
  llmBaseUrl: '',
  agentSystemPrompt: 'You are a helpful coding assistant.',
};

function isProvider(value: unknown): value is Provider {
  return typeof value === 'string' && PROVIDERS.some(p => p.value === value);
}

export default function LlmAgentSettings() {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([getSettings(), getSecret('llm_api_key')])
      .then(([settings, secretKey]) => {
        if (cancelled) return;
        setForm({
          llmProvider: isProvider(settings['llmProvider']) ? settings['llmProvider'] : DEFAULTS.llmProvider,
          defaultModel: typeof settings['defaultModel'] === 'string' ? settings['defaultModel'] : DEFAULTS.defaultModel,
          llmApiKey: secretKey ?? (typeof settings['llmApiKey'] === 'string' ? settings['llmApiKey'] : DEFAULTS.llmApiKey),
          llmBaseUrl: typeof settings['llmBaseUrl'] === 'string' ? settings['llmBaseUrl'] : DEFAULTS.llmBaseUrl,
          agentSystemPrompt: typeof settings['agentSystemPrompt'] === 'string' ? settings['agentSystemPrompt'] : DEFAULTS.agentSystemPrompt,
        });
      })
      .catch(() => {
        if (!cancelled) toast.error('加载设置失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.llmProvider || !form.defaultModel.trim()) {
      toast.error('提供商和模型为必填项');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        llmProvider: form.llmProvider,
        defaultModel: form.defaultModel.trim(),
        llmBaseUrl: form.llmBaseUrl.trim() || undefined,
        agentSystemPrompt: form.agentSystemPrompt,
      };
      const key = form.llmApiKey.trim();
      if (key) {
        await setSecret('llm_api_key', key);
      } else {
        await deleteSecret('llm_api_key');
      }
      await saveSettings(payload);
      toast.success('保存成功');
    } catch {
      toast.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  }

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
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-cyan-500/15 border border-cyan-500/25">
          <Bot className="w-4 h-4 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Agent LLM</h1>
          <p className="text-sm text-slate-500">配置 Pi Agent 使用的 LLM 后端</p>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <label className="text-xs text-slate-500 font-medium mb-1.5 block">提供商</label>
          <select
            value={form.llmProvider}
            onChange={e => update('llmProvider', e.target.value as Provider)}
            className={cn(inputCls, 'appearance-none cursor-pointer')}
          >
            {PROVIDERS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-slate-500 font-medium mb-1.5 block">默认模型</label>
          <input
            value={form.defaultModel}
            onChange={e => update('defaultModel', e.target.value)}
            placeholder="如 gpt-4o-mini"
            className={inputCls}
          />
        </div>

        <div>
          <label className="text-xs text-slate-500 font-medium mb-1.5 block">API Key</label>
          <div className="flex items-center gap-2 bg-black/5 dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl px-3 py-2 focus-within:border-cyan-500/50 transition-colors">
            <input
              type={showKey ? 'text' : 'password'}
              value={form.llmApiKey}
              onChange={e => update('llmApiKey', e.target.value)}
              placeholder="留空则使用系统密钥存储中的值"
              className="flex-1 bg-transparent outline-none text-xs text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600"
            />
            <button
              type="button"
              onClick={() => setShowKey(v => !v)}
              className="text-slate-400 hover:text-slate-200 transition-colors shrink-0"
              title={showKey ? '隐藏' : '显示'}
            >
              {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">将写入桌面端安全密钥存储（electron.safeStorage），不会以明文保存在 SQLite 中。</p>
        </div>

        <div>
          <label className="text-xs text-slate-500 font-medium mb-1.5 block">Base URL（可选）</label>
          <input
            value={form.llmBaseUrl}
            onChange={e => update('llmBaseUrl', e.target.value)}
            placeholder="如 https://api.openai.com/v1"
            className={inputCls}
          />
        </div>

        <div>
          <label className="text-xs text-slate-500 font-medium mb-1.5 block">系统提示词</label>
          <textarea
            value={form.agentSystemPrompt}
            onChange={e => update('agentSystemPrompt', e.target.value)}
            rows={5}
            placeholder="定义 Agent 的行为与角色..."
            className={cn(inputCls, 'resize-none leading-relaxed')}
          />
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={btnPrimary}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
