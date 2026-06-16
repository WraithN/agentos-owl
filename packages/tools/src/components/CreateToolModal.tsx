/* 新建工具弹窗 - 支持技能 / MCP / CLI 三种工具类型 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Server, Terminal, ChevronRight, Plus, Info } from 'lucide-react';
import { cn, inputCls as globalInputCls } from '@owl-os/core';
import type { NewToolType, FieldDef } from '../types.js';

interface ToolTypeOption {
  id: NewToolType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
  badge: string;
  badgeColor: string;
  fields: FieldDef[];
}

const TOOL_TYPES: ToolTypeOption[] = [
  {
    id: 'mcp',
    label: 'MCP',
    icon: Server,
    desc: '接入符合 Model Context Protocol 的外部服务端点',
    badge: 'MCP',
    badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    fields: [
      { key: 'name', label: '服务名称', type: 'text', placeholder: 'filesystem-server', required: true },
      {
        key: 'category',
        label: '分类',
        type: 'select',
        options: ['搜索', '代码', '数据分析', '文档', '通信', '通用'],
        required: true,
        allowCreate: true,
      },
      {
        key: 'endpoint',
        label: '服务地址',
        type: 'text',
        placeholder: 'http://localhost:8080/mcp',
        required: true,
        hint: 'SSE 或 HTTP Streamable 均可',
      },
      { key: 'transport', label: '传输协议', type: 'select', options: ['HTTP Streamable', 'SSE (旧版)', 'stdio'] },
      { key: 'auth', label: '认证方式', type: 'select', options: ['无认证', 'Bearer Token', 'API Key', 'OAuth 2.0'] },
      { key: 'token', label: 'Token / Key', type: 'text', placeholder: '留空则不需要认证', hint: '保存后加密存储' },
      { key: 'desc', label: '备注描述', type: 'textarea', placeholder: '该 MCP 服务提供文件系统读写能力' },
    ],
  },
  {
    id: 'cli',
    label: 'CLI',
    icon: Terminal,
    desc: '将本地或容器内的命令行程序封装为可调用工具',
    badge: 'CLI',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    fields: [
      { key: 'name', label: '工具名称', type: 'text', placeholder: 'run_python_script', required: true },
      {
        key: 'category',
        label: '分类',
        type: 'select',
        options: ['搜索', '代码', '数据分析', '文档', '通信', '通用'],
        required: true,
        allowCreate: true,
      },
      {
        key: 'command',
        label: '执行命令',
        type: 'code',
        placeholder: 'python /workspace/scripts/analyze.py --input {{input}}',
        required: true,
        hint: '使用 {{参数名}} 插入动态参数',
      },
      { key: 'workdir', label: '工作目录', type: 'text', placeholder: '/workspace', hint: '默认为项目根目录' },
      { key: 'timeout', label: '超时（秒）', type: 'text', placeholder: '30' },
      { key: 'description', label: '功能描述', type: 'textarea', placeholder: '运行 Python 脚本进行数据分析', required: true },
      { key: 'env', label: '环境变量', type: 'code', placeholder: 'API_KEY=sk-xxx\nDEBUG=false', hint: '每行一条 KEY=VALUE' },
    ],
  },
];

interface CreateToolModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (type: NewToolType, name: string) => void;
}

export default function CreateToolModal({ open, onClose, onCreated }: CreateToolModalProps) {
  const [step, setStep] = useState<'select' | 'form'>('select');
  const [selected, setSelected] = useState<NewToolType | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const selectedType = TOOL_TYPES.find(t => t.id === selected);

  function handleSelectType(id: NewToolType) {
    setSelected(id);
    setFormData({});
    setStep('form');
  }

  function handleBack() {
    setStep('select');
    setSelected(null);
  }

  function handleClose() {
    setStep('select');
    setSelected(null);
    setFormData({});
    onClose();
  }

  async function handleSave() {
    if (!selectedType) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setSaving(false);
    onCreated?.(selectedType.id, formData['name'] || selectedType.label);
    handleClose();
  }

  const isFormValid = selectedType?.fields
    .filter(f => f.required)
    .every(f => (formData[f.key] ?? '').trim().length > 0);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={e => e.target === e.currentTarget && handleClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-full max-w-[calc(100%-2rem)] md:max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]"
            style={{ background: 'var(--panel-bg)', backdropFilter: 'blur(24px)', border: '1px solid var(--border-subtle)' }}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] shrink-0">
              <div className="flex items-center gap-2.5">
                {step === 'form' && (
                  <button
                    onClick={handleBack}
                    className="p-1 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                  </button>
                )}
                <Plus className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {step === 'select' ? '新建工具' : `新建 ${selectedType?.label} 工具`}
                </span>
                {step === 'form' && selectedType && (
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-medium', selectedType.badgeColor)}>
                    {selectedType.badge}
                  </span>
                )}
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 内容区 */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <AnimatePresence mode="wait">
                {step === 'select' ? (
                  <motion.div
                    key="select"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.18 }}
                    className="p-5 space-y-3"
                  >
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">选择要创建的工具类型</p>
                    {TOOL_TYPES.map(type => {
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.id}
                          onClick={() => handleSelectType(type.id)}
                          className="w-full flex items-center gap-4 p-4 rounded-xl border border-[var(--border-subtle)] hover:border-cyan-500/40 hover:bg-black/3 dark:hover:bg-white/4 transition-all group text-left"
                        >
                          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border', type.badgeColor)}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{type.label}</span>
                              <span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-mono', type.badgeColor)}>
                                {type.badge}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 text-pretty">{type.desc}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-600 group-hover:text-cyan-400 transition-colors shrink-0" />
                        </button>
                      );
                    })}
                  </motion.div>
                ) : (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.18 }}
                    className="p-5 space-y-4"
                  >
                    {selectedType?.fields.map(field => (
                      <FormField
                        key={field.key}
                        field={field}
                        value={formData[field.key] ?? ''}
                        onChange={v => setFormData(prev => ({ ...prev, [field.key]: v }))}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 底部操作栏（仅 form 步骤显示） */}
            {step === 'form' && (
              <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[var(--border-subtle)] shrink-0">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={!isFormValid || saving}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all',
                    isFormValid && !saving ? 'btn-aurora' : 'bg-black/5 dark:bg-white/8 text-slate-400 cursor-not-allowed'
                  )}
                >
                  {saving ? (
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {saving ? '创建中…' : '创建工具'}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* 单字段渲染 */
function FormField({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: string;
  onChange: (v: string) => void;
}) {
  const baseInput = globalInputCls;
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [err, setErr] = useState('');
  const [opts, setOpts] = useState(field.options ?? []);

  const confirm = () => {
    const v = draft.trim();
    if (!v) {
      setErr('分类不能为空');
      return;
    }
    if (!opts.includes(v)) setOpts(prev => [...prev, v]);
    onChange(v);
    setAdding(false);
    setDraft('');
    setErr('');
  };

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
          {field.label}
          {field.required && <span className="text-rose-400 ml-0.5">*</span>}
        </label>
        {field.hint && (
          <span className="flex items-center gap-0.5 text-[10px] text-slate-400 dark:text-slate-600">
            <Info className="w-3 h-3" />
            {field.hint}
          </span>
        )}
      </div>

      {field.type === 'textarea' && (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className={cn(baseInput, 'resize-none leading-relaxed')}
        />
      )}
      {field.type === 'code' && (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={4}
          className={cn(baseInput, 'resize-none font-mono text-xs leading-relaxed')}
        />
      )}
      {field.type === 'select' && field.allowCreate ? (
        adding ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={draft}
                onChange={e => {
                  setDraft(e.target.value);
                  setErr('');
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') confirm();
                  if (e.key === 'Escape') setAdding(false);
                }}
                placeholder="输入新分类名称"
                className={cn(baseInput, 'flex-1')}
              />
              <button onClick={confirm} className="px-3 py-2 text-xs font-medium text-white bg-cyan-500 rounded-xl hover:bg-cyan-600 transition-colors">
                确认
              </button>
              <button
                onClick={() => setAdding(false)}
                className="px-3 py-2 text-xs text-slate-500 hover:text-slate-700 rounded-xl transition-colors"
              >
                取消
              </button>
            </div>
            {err && <p className="text-[10px] text-rose-400">{err}</p>}
          </div>
        ) : (
          <div className="relative">
            <select
              value={value}
              onChange={e => {
                const v = e.target.value;
                if (v === '__new__') {
                  setAdding(true);
                  setDraft('');
                  setErr('');
                } else onChange(v);
              }}
              className={cn(baseInput, 'appearance-none cursor-pointer pr-8')}
            >
              {!value && <option value="">请选择…</option>}
              {opts.map(o => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
              <option value="__new__">+ 新建分类</option>
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
              <Plus className="w-3 h-3 text-slate-400" />
            </div>
          </div>
        )
      ) : (
        field.type === 'select' && (
          <select value={value} onChange={e => onChange(e.target.value)} className={cn(baseInput)}>
            {!value && <option value="">请选择…</option>}
            {field.options?.map(o => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        )
      )}
      {field.type === 'text' && (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={cn(baseInput)}
        />
      )}
    </div>
  );
}
