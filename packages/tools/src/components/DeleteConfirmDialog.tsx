import { motion } from 'framer-motion';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { DIALOG_BG, DIALOG_BD } from '../constants.js';

export default function DeleteConfirmDialog({
  name,
  onCancel,
  onConfirm,
}: {
  name: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-[calc(100%-2rem)] md:max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: DIALOG_BG, border: `1px solid ${DIALOG_BD}`, backdropFilter: 'blur(24px)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 flex flex-col items-center gap-3 text-center">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-rose-500/15">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">确认删除</p>
            <p className="text-xs text-slate-500 mt-1">
              确定要删除 <span className="text-slate-700 dark:text-slate-200 font-medium">「{name}」</span> 吗？此操作不可撤销。
            </p>
          </div>
          <div className="flex items-center gap-2 w-full pt-1">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 rounded-xl transition-colors border border-[var(--border-subtle)]"
            >
              取消
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              删除
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
