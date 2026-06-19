import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Pencil, Save, Zap } from 'lucide-react';
import { cn, inputCls } from '@owl-os/core';
import CategorySelect from './CategorySelect.js';
import { DIALOG_BG, DIALOG_BD } from '../constants.js';
import type { SkillItem } from '../types.js';

export default function EditSkillDialog({
  item,
  onClose,
  onSave,
}: {
  item: SkillItem;
  onClose: () => void;
  onSave: (s: SkillItem) => void;
}) {
  const [name, setName] = useState(item.name);
  const [desc, setDesc] = useState(item.description);
  const [category, setCategory] = useState(item.category);
  const [tags, setTags] = useState(item.tags.join(', '));

  function submit() {
    if (!name.trim()) return;
    onSave({
      ...item,
      name: name.trim(),
      description: desc.trim(),
      category,
      tags: tags.split(/[,，\s]+/).map(t => t.trim()).filter(Boolean),
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-[calc(100%-2rem)] md:max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: DIALOG_BG, border: `1px solid ${DIALOG_BD}`, backdropFilter: 'blur(24px)' }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid ${DIALOG_BD}` }}
        >
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">编辑技能</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">名称</label>
            <input value={name} onChange={e => setName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">标签</label>
            <CategorySelect
              categories={['文档', '代码', '分析', '通信', '数据', '通用']}
              value={category}
              onChange={setCategory}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">描述</label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              rows={3}
              className={cn(inputCls, 'resize-none leading-relaxed')}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">标签（逗号分隔）</label>
            <input value={tags} onChange={e => setTags(e.target.value)} className={inputCls} />
          </div>
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
            onClick={submit}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white btn-aurora rounded-xl"
          >
            <Save className="w-3 h-3" />
            保存
          </button>
        </div>
      </motion.div>
    </div>
  );
}
