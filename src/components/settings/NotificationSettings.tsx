/* 通知与集成设置 */
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Bell, Webhook as WebhookIcon, Plus, Trash2, AlertTriangle, CheckCircle2, Info, ExternalLink, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { inputCls as globalInputCls, btnPrimary } from '@/lib/ui-styles';

type NotifLevel = 'info' | 'success' | 'warning';

interface NotifRule {
  id: string;
  label: string;
  desc: string;
  enabled: boolean;
  level: NotifLevel;
}

const LEVEL_CFG: Record<NotifLevel, { color: string; bg: string; Icon: typeof Bell }> = {
  info:    { color: 'text-cyan-400',    bg: 'bg-cyan-500/12 border-cyan-500/20',    Icon: Info },
  success: { color: 'text-emerald-400', bg: 'bg-emerald-500/12 border-emerald-500/20', Icon: CheckCircle2 },
  warning: { color: 'text-amber-400',   bg: 'bg-amber-500/12 border-amber-500/20',  Icon: AlertTriangle },
};

const PRESET_RULES: NotifRule[] = [
  { id: 'r1', label: '任务完成通知',   desc: '当 Agent 完成任务时推送通知',      enabled: true,  level: 'success' },
  { id: 'r2', label: '需要审批',       desc: '有待审批内容时立即通知',            enabled: true,  level: 'warning' },
  { id: 'r3', label: '工作流执行结果', desc: '工作流执行完成后推送摘要',          enabled: true,  level: 'info' },
  { id: 'r4', label: '文档处理状态',   desc: '知识库文档解析成功/失败',           enabled: false, level: 'info' },
  { id: 'r5', label: 'Token 用量告警', desc: '当月使用超过预算 80% 时警告',       enabled: true,  level: 'warning' },
  { id: 'r6', label: '模型服务异常',   desc: 'LLM API 不可用时立即告警',         enabled: true,  level: 'warning' },
];

/* ── Webhook 平台预设 ─────────────────────────────────────────────── */
interface WebhookEntry { id: string; url: string; label: string; platform: string }

interface PlatformPreset {
  key: string;
  label: string;
  color: string;
  bg: string;
  placeholder: string;
  docsUrl: string;
  logo: string; // emoji fallback
}

const PLATFORM_PRESETS: PlatformPreset[] = [
  { key: 'slack',   label: 'Slack',      color: 'text-[#36C5F0]', bg: 'bg-[#36C5F0]/10 border-[#36C5F0]/25', placeholder: 'https://hooks.slack.com/services/T.../B.../...', docsUrl: 'https://api.slack.com/messaging/webhooks', logo: '💬' },
  { key: 'dingtalk',label: '钉钉',        color: 'text-[#1677FF]', bg: 'bg-[#1677FF]/10 border-[#1677FF]/25', placeholder: 'https://oapi.dingtalk.com/robot/send?access_token=...', docsUrl: 'https://open.dingtalk.com/document/robots/custom-robot-access', logo: '📎' },
  { key: 'feishu',  label: '飞书',        color: 'text-[#00B96B]', bg: 'bg-[#00B96B]/10 border-[#00B96B]/25', placeholder: 'https://open.feishu.cn/open-apis/bot/v2/hook/...', docsUrl: 'https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot', logo: '🪶' },
  { key: 'wecom',   label: '企业微信',    color: 'text-[#07C160]', bg: 'bg-[#07C160]/10 border-[#07C160]/25', placeholder: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=...', docsUrl: 'https://developer.work.weixin.qq.com/document/path/91770', logo: '💼' },
  { key: 'teams',   label: 'Teams',      color: 'text-[#6264A7]', bg: 'bg-[#6264A7]/10 border-[#6264A7]/25', placeholder: 'https://xxx.webhook.office.com/webhookb2/...', docsUrl: 'https://learn.microsoft.com/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook', logo: '🟣' },
  { key: 'custom',  label: '自定义',      color: 'text-slate-400',  bg: 'bg-slate-500/10 border-slate-500/25', placeholder: 'https://your-webhook-endpoint.com/notify', docsUrl: '', logo: '🔗' },
];

const PRESET_WEBHOOKS: WebhookEntry[] = [
  { id: 'wh1', label: 'Slack 通知', url: 'https://hooks.slack.com/services/...', platform: 'slack' },
];

const DIALOG_BG = 'var(--panel-bg-solid)';
const DIALOG_BD = 'var(--border-subtle)';

function AddWebhookDialog({ onClose, onConfirm }: { onClose: () => void; onConfirm: (entry: Omit<WebhookEntry, 'id'>) => void }) {
  const [platform, setPlatform] = useState('slack');
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [err, setErr] = useState('');

  const preset = PLATFORM_PRESETS.find(p => p.key === platform)!;

  function submit() {
    if (!url.trim()) { setErr('Webhook URL 不能为空'); return; }
    onConfirm({ url: url.trim(), label: label.trim() || preset.label, platform });
  }

  const inputCls = globalInputCls;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.15 }}
        className="relative w-full max-w-[calc(100%-2rem)] md:max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: DIALOG_BG, border: `1px solid ${DIALOG_BD}`, backdropFilter: 'blur(24px)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${DIALOG_BD}` }}>
          <div className="flex items-center gap-2">
            <WebhookIcon className="w-4 h-4 text-cyan-400" />
            <p className="text-sm font-semibold text-slate-200">添加 Webhook</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/8 transition-colors">✕</button>
        </div>
        <div className="p-5 space-y-4">
          {/* 平台选择 */}
          <div>
            <label className="text-[11px] text-slate-500 font-medium block mb-2">选择平台</label>
            <div className="grid grid-cols-3 gap-2">
              {PLATFORM_PRESETS.map(p => (
                <button key={p.key} onClick={() => { setPlatform(p.key); setUrl(''); setErr(''); }}
                  className={cn('flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border text-xs font-medium transition-all',
                    platform === p.key ? cn(p.bg, p.color) : 'border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300')}>
                  <span className="text-base leading-none">{p.logo}</span>
                  <span className="text-[10px]">{p.label}</span>
                </button>
              ))}
            </div>
          </div>
          {/* 标签 */}
          <div>
            <label className="text-[11px] text-slate-500 font-medium block mb-1">名称标签</label>
            <input value={label} onChange={e => setLabel(e.target.value)} placeholder={`${preset.label} 通知`} className={inputCls} />
          </div>
          {/* URL */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] text-slate-500 font-medium">Webhook URL <span className="text-rose-400">*</span></label>
              {preset.docsUrl && (
                <a href={preset.docsUrl} target="_blank" rel="noreferrer"
                  className="flex items-center gap-0.5 text-[10px] text-cyan-500 hover:text-cyan-400 transition-colors">
                  <ExternalLink className="w-2.5 h-2.5" />查看文档
                </a>
              )}
            </div>
            <input value={url} onChange={e => { setUrl(e.target.value); setErr(''); }} placeholder={preset.placeholder} className={inputCls} />
            {err && <p className="text-[10px] text-rose-400 mt-1">{err}</p>}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4" style={{ borderTop: `1px solid ${DIALOG_BD}` }}>
          <button onClick={onClose} className="px-4 py-2 text-xs text-slate-500 hover:text-slate-200 hover:bg-white/8 rounded-xl transition-colors">取消</button>
          <button onClick={submit} className={btnPrimary}>
            <Plus className="w-3.5 h-3.5" />添加
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function NotificationSettings() {
  const [rules, setRules] = useState<NotifRule[]>(PRESET_RULES);
  const [webhooks, setWebhooks] = useState<WebhookEntry[]>(PRESET_WEBHOOKS);
  const [addWebhookOpen, setAddWebhookOpen] = useState(false);
  const [deleteWebhookId, setDeleteWebhookId] = useState<string | null>(null);

  function toggleRule(id: string) {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  }

  function removeWebhook(id: string) {
    setWebhooks(prev => prev.filter(w => w.id !== id));
    setDeleteWebhookId(null);
  }

  function getPlatformPreset(platform: string) {
    return PLATFORM_PRESETS.find(p => p.key === platform) ?? PLATFORM_PRESETS[PLATFORM_PRESETS.length - 1];
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">通知与集成</h1>
        <p className="text-sm text-slate-400 mt-1">配置通知渠道与推送规则</p>
      </div>

      {/* 通知规则 */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/6">
          <p className="text-xs text-slate-400 font-medium">通知规则</p>
        </div>
        <div className="divide-y divide-white/5">
          {rules.map(rule => {
            const cfg = LEVEL_CFG[rule.level];
            const LevelIcon = cfg.Icon;
            return (
              <div key={rule.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/3 transition-colors">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center border shrink-0', rule.enabled ? cfg.bg : 'bg-white/5 border-white/8')}>
                  <LevelIcon className={cn('w-3.5 h-3.5', rule.enabled ? cfg.color : 'text-slate-600')} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium', rule.enabled ? 'text-slate-200' : 'text-slate-500')}>{rule.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{rule.desc}</p>
                </div>
                <span className={cn('text-[10px] px-2 py-0.5 rounded border font-medium shrink-0 hidden md:block', rule.enabled ? cfg.bg + ' ' + cfg.color : 'bg-white/5 border-white/10 text-slate-600')}>
                  {rule.level === 'info' ? '信息' : rule.level === 'success' ? '成功' : '告警'}
                </span>
                <button onClick={() => toggleRule(rule.id)}
                  className={cn('rounded-full relative transition-all shrink-0', rule.enabled ? 'bg-gradient-to-r from-cyan-500 to-violet-500' : 'bg-white/15')}
                  style={{ height: '22px', width: '40px' }}>
                  <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all', rule.enabled ? 'left-5' : 'left-0.5')} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Webhook 集成 */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WebhookIcon className="w-3.5 h-3.5 text-slate-400" />
            <p className="text-xs text-slate-400 font-medium">Webhook 集成</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-500">{webhooks.length} 个已配置</span>
            <button onClick={() => setAddWebhookOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium btn-aurora text-white rounded-lg">
              <Plus className="w-3 h-3" />添加
            </button>
          </div>
        </div>
        <div className="p-5 space-y-3">
          {/* 平台图例 */}
          <div className="flex flex-wrap gap-2 pb-1">
            {PLATFORM_PRESETS.filter(p => p.key !== 'custom').map(p => (
              <span key={p.key} className={cn('flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border font-medium', p.bg, p.color)}>
                {p.logo} {p.label}
              </span>
            ))}
          </div>

          {webhooks.length === 0 && (
            <p className="text-xs text-slate-600 text-center py-4">暂无 Webhook，点击「添加」配置推送渠道</p>
          )}

          {webhooks.map(wh => {
            const p = getPlatformPreset(wh.platform);
            return (
              <div key={wh.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/4 border border-white/8">
                <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-sm border shrink-0', p.bg)}>
                  {p.logo}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-slate-200">{wh.label}</p>
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-medium', p.bg, p.color)}>{p.label}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono truncate mt-0.5">{wh.url}</p>
                </div>
                <button onClick={() => setDeleteWebhookId(wh.id)}
                  className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 rounded-lg transition-colors shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {addWebhookOpen && (
          <AddWebhookDialog
            onClose={() => setAddWebhookOpen(false)}
            onConfirm={entry => { setWebhooks(prev => [...prev, { ...entry, id: `wh-${Date.now()}` }]); setAddWebhookOpen(false); }}
          />
        )}
      </AnimatePresence>

      {/* Webhook 删除二次确认 */}
      <AnimatePresence>
        {deleteWebhookId && (() => {
          const wh = webhooks.find(w => w.id === deleteWebhookId);
          const p = wh ? getPlatformPreset(wh.platform) : null;
          return (
            <motion.div
              key="wh-delete-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
              onClick={() => setDeleteWebhookId(null)}
            >
              <motion.div
                key="wh-delete-modal"
                initial={{ opacity: 0, scale: 0.93, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.93, y: 12 }}
                transition={{ type: 'spring', stiffness: 340, damping: 30 }}
                className="w-full max-w-[calc(100%-2rem)] md:max-w-sm rounded-2xl shadow-2xl overflow-hidden"
                style={{ background: 'var(--panel-bg-solid)', border: '1px solid var(--border-subtle)', backdropFilter: 'blur(24px)' }}
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-rose-500/10">
                      <Trash2 className="w-4 h-4 text-rose-400" />
                    </div>
                    <span className="text-sm font-semibold text-slate-200">删除 Webhook</span>
                  </div>
                  <button onClick={() => setDeleteWebhookId(null)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/8 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="px-5 py-4">
                  <p className="text-sm text-slate-300 leading-relaxed">
                    确定要删除 Webhook&nbsp;
                    <span className="font-semibold text-slate-100">「{wh?.label}」</span>
                    {p && <span className={cn('ml-1 text-[11px] px-1.5 py-0.5 rounded border font-medium', p.bg, p.color)}>{p.logo} {p.label}</span>}
                    &nbsp;吗？
                  </p>
                  <p className="text-xs text-slate-500 mt-1.5">删除后将停止向该地址推送通知，此操作不可撤销。</p>
                </div>
                <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/8">
                  <button onClick={() => setDeleteWebhookId(null)}
                    className="px-4 py-2 text-xs font-medium text-slate-300 border border-white/15 rounded-xl hover:bg-white/8 transition-colors">
                    取消
                  </button>
                  <button onClick={() => removeWebhook(deleteWebhookId)}
                    className="px-4 py-2 text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-colors flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5" />确认删除
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
