import { motion } from 'framer-motion';

const DIALOG_BG = 'var(--panel-bg-solid)';
const DIALOG_BD = 'var(--border-subtle)';

// ── 删除确认弹窗 ──────────────────────────────────────────────────────────────
export function DeleteConfirm({ name, onCancel, onConfirm }: { name: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.15 }}
        className="relative w-full max-w-sm rounded-2xl shadow-2xl p-5 space-y-4"
        style={{ background: DIALOG_BG, border: `1px solid ${DIALOG_BD}`, backdropFilter: 'blur(24px)' }}
        onClick={e => e.stopPropagation()}>
        <p className="text-sm font-semibold text-slate-100">确认删除</p>
        <p className="text-xs text-slate-400">确定要删除团队 <span className="text-slate-200 font-medium">「{name}」</span> 吗？此操作不可撤销。</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-white/8 rounded-xl transition-colors">取消</button>
          <button onClick={onConfirm} className="px-4 py-2 text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-colors">删除</button>
        </div>
      </motion.div>
    </div>
  );
}
