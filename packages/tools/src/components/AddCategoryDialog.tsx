import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { inputCls } from '@owl-os/core';
import { DIALOG_BG, DIALOG_BD } from '../constants.js';

export default function AddCategoryDialog({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: (name: string) => void;
}) {
  const [val, setVal] = useState('');
  const [err, setErr] = useState('');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-[calc(100%-2rem)] md:max-w-xs rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: DIALOG_BG, border: `1px solid ${DIALOG_BD}`, backdropFilter: 'blur(24px)' }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid ${DIALOG_BD}` }}
        >
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">新增标签</p>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <input
            autoFocus
            value={val}
            onChange={e => {
              setVal(e.target.value);
              setErr('');
            }}
            placeholder="输入标签名称..."
            className={inputCls}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                if (!val.trim()) {
                  setErr('标签名称不能为空');
                  return;
                }
                onConfirm(val.trim());
              }
            }}
          />
          {err && <p className="text-[10px] text-rose-400">{err}</p>}
        </div>
        <div
          className="flex items-center justify-end gap-2 px-5 py-4"
          style={{ borderTop: `1px solid ${DIALOG_BD}` }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 rounded-xl transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => {
              if (!val.trim()) {
                setErr('标签名称不能为空');
                return;
              }
              onConfirm(val.trim());
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white btn-aurora rounded-xl"
          >
            <Plus className="w-3.5 h-3.5" />
            确认添加
          </button>
        </div>
      </motion.div>
    </div>
  );
}
