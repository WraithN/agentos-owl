/* 多选标签组件：支持从候选列表选择，也支持新建标签 */
import { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { cn, inputCls } from '@owl-os/core';

interface TagMultiSelectProps {
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  allowCreate?: boolean;
  /** 默认标签，始终保留在候选列表中，不会被删除 */
  defaults?: string[];
}

export default function TagMultiSelect({
  options,
  value,
  onChange,
  placeholder = '选择标签…',
  allowCreate = true,
  defaults = [],
}: TagMultiSelectProps) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [err, setErr] = useState('');

  const allOptions = useMemo(
    () => Array.from(new Set([...defaults, ...options, ...value])),
    [defaults, options, value]
  );

  const unselected = useMemo(
    () => allOptions.filter((o) => !value.includes(o)),
    [allOptions, value]
  );

  const toggle = (tag: string) => {
    onChange(value.includes(tag) ? value.filter((v) => v !== tag) : [...value, tag]);
  };

  const confirmCreate = () => {
    const v = draft.trim();
    if (!v) {
      setErr('标签不能为空');
      return;
    }
    if (value.includes(v)) {
      setErr('标签已存在');
      return;
    }
    onChange([...value, v]);
    setAdding(false);
    setDraft('');
    setErr('');
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/25 hover:bg-cyan-500/25 transition-colors"
          >
            {tag}
            <X className="w-3 h-3" />
          </button>
        ))}
        {value.length === 0 && <span className="text-xs text-slate-400 py-1">{placeholder}</span>}
      </div>

      {adding ? (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setErr('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmCreate();
                if (e.key === 'Escape') {
                  setAdding(false);
                  setDraft('');
                  setErr('');
                }
              }}
              placeholder="输入新标签名称"
              className={cn(inputCls, 'flex-1')}
            />
            <button
              onClick={confirmCreate}
              className="px-3 py-2 text-xs font-medium text-white bg-cyan-500 rounded-xl hover:bg-cyan-600 transition-colors"
            >
              确认
            </button>
            <button
              onClick={() => {
                setAdding(false);
                setDraft('');
                setErr('');
              }}
              className="px-3 py-2 text-xs text-slate-500 hover:text-slate-700 rounded-xl transition-colors"
            >
              取消
            </button>
          </div>
          {err && <p className="text-[10px] text-rose-400">{err}</p>}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {unselected.length > 0 && (
            <div className="relative flex-1">
              <select
                value=""
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) return;
                  toggle(v);
                  e.currentTarget.value = '';
                }}
                className={cn(inputCls, 'appearance-none cursor-pointer pr-8 w-full')}
              >
                <option value="">{placeholder}</option>
                {unselected.map((o) => (
                  <option key={o} value={o}>
                    {o}{defaults.includes(o) ? '（默认）' : ''}
                  </option>
                ))}
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                <Plus className="w-3 h-3 text-slate-400" />
              </div>
            </div>
          )}
          {allowCreate && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex items-center gap-1 px-2 py-2 rounded-xl text-xs text-slate-500 hover:text-cyan-500 border border-dashed border-[var(--border-subtle)] hover:border-cyan-500/40 transition-colors"
            >
              <Plus className="w-3 h-3" />
              新建标签
            </button>
          )}
        </div>
      )}
    </div>
  );
}
