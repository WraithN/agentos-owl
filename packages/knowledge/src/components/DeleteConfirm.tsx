import { motion } from 'framer-motion';
import { DIALOG_BG, DIALOG_BD } from '../constants.js';

export default function DeleteConfirm({ title, desc, onCancel, onConfirm }: {
  title: string;
  desc: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.15 }}
        className="relative w-full max-w-sm rounded-2xl shadow-2xl p-5 space-y-4"
        style={{ background: DIALOG_BG, border: `1px solid ${DIALOG_BD}`, backdropFilter: 'blur(24px)' }}
        onClick={e => e.stopPropagation()}>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</p>
        <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 rounded-xl transition-colors">取消</button>
          <button onClick={onConfirm} className="px-4 py-2 text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-colors">确认删除</button>
        </div>
      </motion.div>
    </div>
  );
}
