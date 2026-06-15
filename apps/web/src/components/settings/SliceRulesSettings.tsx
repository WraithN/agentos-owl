/* 切片规则管理页 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, Scissors, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { inputClsErr, btnPrimary } from '@/lib/ui-styles';

/* ── 类型 ─────────────────────────────────────────────────────────── */
type Strategy = 'fixed' | 'sentence' | 'paragraph' | 'semantic';

interface SliceRule {
  id: string;
  name: string;
  strategy: Strategy;
  chunkSize: number;
  overlap: number;
  separator: string;
  description: string;
}

/* ── 常量 ─────────────────────────────────────────────────────────── */
const STRATEGY_LABELS: Record<Strategy, string> = {
  fixed:     '固定长度',
  sentence:  '按句子',
  paragraph: '按段落',
  semantic:  '语义分割',
};

const STRATEGY_COLORS: Record<Strategy, string> = {
  fixed:     'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  sentence:  'text-violet-400 bg-violet-500/10 border-violet-500/20',
  paragraph: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  semantic:  'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};

const INIT_RULES: SliceRule[] = [
  { id: 'sr-1', name: '固定长度切片', strategy: 'fixed',     chunkSize: 512, overlap: 64,  separator: '\n',   description: '按固定 token 数切割，适合格式均匀的文档' },
  { id: 'sr-2', name: '段落切片',     strategy: 'paragraph', chunkSize: 800, overlap: 80,  separator: '\n\n', description: '按段落边界切割，保留语义完整性' },
  { id: 'sr-3', name: '语义切片',     strategy: 'semantic',  chunkSize: 600, overlap: 100, separator: '',     description: '基于语义相似度自动分割，效果最佳' },
];

const DIALOG_BG = 'var(--panel-bg-solid)';
const DIALOG_BD = 'var(--border-subtle)';

const inputCls = (err?: boolean) => inputClsErr(err);

/* ── 新建/编辑弹窗 ─────────────────────────────────────────────────── */
type FormData = Omit<SliceRule, 'id'>;

const emptyForm = (): FormData => ({
  name: '', strategy: 'fixed', chunkSize: 512, overlap: 64, separator: '\n', description: '',
});

function RuleFormDialog({
  initial, onClose, onSave,
}: {
  initial: FormData | null;
  onClose: () => void;
  onSave: (data: FormData) => void;
}) {
  const [form, setForm] = useState<FormData>(initial ?? emptyForm());
  const [nameErr, setNameErr] = useState('');

  const isEdit = initial !== null;

  function upd<K extends keyof FormData>(k: K, v: FormData[K]) {
    setForm(f => ({ ...f, [k]: v }));
    if (k === 'name') setNameErr('');
  }

  function save() {
    if (!form.name.trim()) { setNameErr('规则名称不能为空'); return; }
    onSave({ ...form, name: form.name.trim() });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.17 }}
        className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: DIALOG_BG, border: `1px solid ${DIALOG_BD}`, backdropFilter: 'blur(24px)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 顶部 */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${DIALOG_BD}` }}>
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {isEdit ? '编辑切片规则' : '新建切片规则'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 表单 */}
        <div className="p-5 space-y-4">
          {/* 名称 */}
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1">
              名称 <span className="text-rose-400">*</span>
            </label>
            <input value={form.name} onChange={e => upd('name', e.target.value)}
              placeholder="输入规则名称" className={inputCls(!!nameErr)} />
            {nameErr && <p className="text-[10px] text-rose-400 mt-1">{nameErr}</p>}
          </div>

          {/* 策略类型 */}
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1.5 block">切割策略</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(STRATEGY_LABELS) as Strategy[]).map(s => (
                <button key={s} onClick={() => upd('strategy', s)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all text-left',
                    form.strategy === s
                      ? cn('border-[2px]', STRATEGY_COLORS[s])
                      : 'border-[var(--border-subtle)] text-slate-500 hover:bg-black/5 dark:hover:bg-white/5'
                  )}>
                  <span className="flex-1">{STRATEGY_LABELS[s]}</span>
                  {form.strategy === s && (
                    <span className="w-2 h-2 rounded-full bg-current shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 块大小 + 重叠量 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1 block">块大小（token）</label>
              <input type="number" min={64} max={4096} value={form.chunkSize}
                onChange={e => upd('chunkSize', +e.target.value)} className={inputCls()} />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1 block">重叠量（token）</label>
              <input type="number" min={0} max={512} value={form.overlap}
                onChange={e => upd('overlap', +e.target.value)} className={inputCls()} />
            </div>
          </div>

          {/* 分隔符 */}
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">分隔符</label>
            <input value={form.separator} onChange={e => upd('separator', e.target.value)}
              placeholder="如 \n 或 \n\n，语义切割可留空" className={inputCls()} />
          </div>

          {/* 描述 */}
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">描述</label>
            <textarea value={form.description} onChange={e => upd('description', e.target.value)}
              rows={3} placeholder="简要描述该切片规则的使用场景..."
              className={cn(inputCls(), 'resize-none leading-relaxed')} />
          </div>
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-end gap-2 px-5 py-4"
          style={{ borderTop: `1px solid ${DIALOG_BD}` }}>
          <button onClick={onClose} className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 rounded-xl transition-colors">
            取消
          </button>
          <button onClick={save} className={btnPrimary}>
            <Plus className="w-3.5 h-3.5" />{isEdit ? '保存修改' : '创建规则'}
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
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-sm rounded-2xl shadow-2xl p-5 space-y-4"
        style={{ background: DIALOG_BG, border: `1px solid ${DIALOG_BD}`, backdropFilter: 'blur(24px)' }}
        onClick={e => e.stopPropagation()}
      >
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">确认删除</p>
        <p className="text-xs text-slate-500 leading-relaxed">
          确定要删除切片规则 <span className="font-medium text-slate-700 dark:text-slate-200">「{name}」</span> 吗？此操作不可撤销。
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 rounded-xl transition-colors">取消</button>
          <button onClick={onConfirm} className="px-4 py-2 text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-colors">确认删除</button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── 主页面 ─────────────────────────────────────────────────────────── */
export default function SliceRulesSettings() {
  const [rules, setRules] = useState<SliceRule[]>(INIT_RULES);
  const [dialogMode, setDialogMode] = useState<null | 'new' | SliceRule>(null);
  const [deleteTarget, setDeleteTarget] = useState<SliceRule | null>(null);

  function handleSave(data: FormData) {
    if (dialogMode === 'new') {
      const next: SliceRule = { ...data, id: `sr-${Date.now()}` };
      setRules(prev => [...prev, next]);
    } else if (dialogMode) {
      const target = dialogMode as SliceRule;
      setRules(prev => prev.map(r => r.id === target.id ? { ...r, ...data } : r));
    }
    setDialogMode(null);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    setRules(prev => prev.filter(r => r.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  return (
    <div className="p-6 max-w-4xl">
      {/* 页面头部 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Scissors className="w-5 h-5 text-violet-400" />切片规则管理
          </h1>
          <p className="text-sm text-slate-500 mt-1">管理文档向量化时使用的切片策略，上传文档时可选择对应规则</p>
        </div>
        <button
          onClick={() => setDialogMode('new')}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white btn-aurora rounded-xl"
        >
          <Plus className="w-3.5 h-3.5" />新建规则
        </button>      </div>

      {/* 规则列表表格 */}
      <div className="rounded-2xl border border-[var(--border-subtle)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px]">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-black/3 dark:bg-white/3">
                {['规则名称', '策略类型', '块大小', '重叠量', '描述', '操作'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rules.map((rule, i) => (
                <motion.tr
                  key={rule.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-black/2 dark:hover:bg-white/2 transition-colors"
                >
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{rule.name}</p>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className={cn('text-[11px] border px-2 py-0.5 rounded-full font-medium', STRATEGY_COLORS[rule.strategy])}>
                      {STRATEGY_LABELS[rule.strategy]}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                    {rule.chunkSize}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                    {rule.overlap}
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-xs text-slate-500 max-w-[240px] truncate text-pretty">{rule.description || '—'}</p>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setDialogMode(rule)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-500 hover:bg-cyan-500/10 transition-colors"
                        title="编辑"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(rule)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {rules.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">
                    暂无切片规则，点击右上角新建
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 说明卡片 */}
      <div className="mt-6 p-4 rounded-2xl border border-[var(--border-subtle)] bg-violet-500/5">
        <p className="text-xs font-semibold text-violet-400 mb-2">使用说明</p>
        <ul className="space-y-1 text-xs text-slate-500">
          <li>· <span className="text-slate-700 dark:text-slate-300">固定长度</span>：按 token 数硬切，速度快，适合结构均匀的文档</li>
          <li>· <span className="text-slate-700 dark:text-slate-300">按段落</span>：以段落分隔符为边界，保留段落完整语义</li>
          <li>· <span className="text-slate-700 dark:text-slate-300">按句子</span>：以句子为最小单位，适合问答型知识库</li>
          <li>· <span className="text-slate-700 dark:text-slate-300">语义分割</span>：基于嵌入相似度自动分组，效果最佳但耗时较长</li>
        </ul>
      </div>

      {/* 弹窗 */}
      <AnimatePresence>
        {dialogMode !== null && (
          <RuleFormDialog
            initial={dialogMode === 'new' ? null : ({ ...dialogMode } as FormData)}
            onClose={() => setDialogMode(null)}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {deleteTarget && (
          <DeleteConfirm
            name={deleteTarget.name}
            onCancel={() => setDeleteTarget(null)}
            onConfirm={handleDelete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
