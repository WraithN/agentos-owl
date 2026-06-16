import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Zap } from 'lucide-react';
import { cn, inputCls } from '@owl-os/core';
import CategorySelect from './CategorySelect.js';
import { ICON_COLORS, DIALOG_BG, DIALOG_BD } from '../constants.js';
import type { SkillItem } from '../types.js';

export default function CreateSkillDialog({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: (s: SkillItem) => void;
}) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('通用');
  const [tags, setTags] = useState('');
  const [nameErr, setNameErr] = useState('');

  function submit() {
    if (!name.trim()) {
      setNameErr('名称为必填项');
      return;
    }
    onConfirm({
      id: `skill-${Date.now()}`,
      name: name.trim(),
      category,
      description: desc || '暂无描述',
      stars: 5,
      installs: 0,
      official: false,
      iconBg: ICON_COLORS[Math.floor(Math.random() * ICON_COLORS.length)],
      icon: 'Zap',
      tags: tags.split(/[,，\s]+/).map(t => t.trim()).filter(Boolean),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.16 }}
        className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: DIALOG_BG, border: `1px solid ${DIALOG_BD}`, backdropFilter: 'blur(24px)' }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid ${DIALOG_BD}` }}
        >
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-500" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">新建技能</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1">
              名称 <span className="text-rose-400">*</span>
            </label>
            <input
              value={name}
              onChange={e => {
                setName(e.target.value);
                setNameErr('');
              }}
              placeholder="技能名称"
              className={inputCls}
            />
            {nameErr && <p className="text-[10px] text-rose-400 mt-1">{nameErr}</p>}
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">分类</label>
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
              placeholder="技能功能描述..."
              className={cn(inputCls, 'resize-none leading-relaxed')}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">
              标签 <span className="text-slate-400 font-normal">（逗号分隔）</span>
            </label>
            <input
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="NLP, 文本, 分析"
              className={inputCls}
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
            <Plus className="w-3.5 h-3.5" />
            创建技能
          </button>
        </div>
      </motion.div>
    </div>
  );
}
