import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Pencil, Save } from 'lucide-react';
import { cn, inputCls } from '@owl-os/core';
import TagMultiSelect from './TagMultiSelect.js';
import { DIALOG_BG, DIALOG_BD, PROMPT_TAGS_DEFAULT } from '../constants.js';
import type { PromptItem } from '../types.js';

export default function EditPromptDialog({
  item,
  onClose,
  onSave,
}: {
  item: PromptItem;
  onClose: () => void;
  onSave: (p: PromptItem) => void;
}) {
  const [name, setName] = useState(item.name);
  const [content, setContent] = useState(item.content);
  const [tags, setTags] = useState(item.tags);

  function submit() {
    if (!name.trim() || !content.trim()) return;
    onSave({
      ...item,
      name: name.trim(),
      content: content.trim(),
      tags,
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
            <Pencil className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">编辑提示词</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3 max-h-[65vh] overflow-y-auto">
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">名称</label>
            <input value={name} onChange={e => setName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">提示词内容</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={6}
              className={cn(inputCls, 'resize-none leading-relaxed')}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">标签</label>
            <TagMultiSelect
              options={PROMPT_TAGS_DEFAULT}
              value={tags}
              onChange={setTags}
              defaults={PROMPT_TAGS_DEFAULT}
              placeholder="选择标签…"
            />
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
