import { useState } from 'react';
import { Plus } from 'lucide-react';
import { cn, inputCls } from '@owl-os/core';

export default function CategorySelect({
  categories,
  value,
  onChange,
}: {
  categories: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [all, setAll] = useState(categories);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [err, setErr] = useState('');

  const confirm = () => {
    const v = draft.trim();
    if (!v) {
      setErr('标签不能为空');
      return;
    }
    if (!all.includes(v)) setAll(prev => [...prev, v]);
    onChange(v);
    setAdding(false);
    setDraft('');
    setErr('');
  };

  if (adding) {
    return (
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
            placeholder="输入新标签名称"
            className={cn(inputCls, 'flex-1')}
          />
          <button
            onClick={confirm}
            className="px-3 py-2 text-xs font-medium text-white bg-cyan-500 rounded-xl hover:bg-cyan-600 transition-colors"
          >
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
    );
  }

  return (
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
        className={cn(inputCls, 'appearance-none cursor-pointer pr-8')}
      >
        {all.map(c => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
        <option value="__new__">+ 新建标签</option>
      </select>
      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
        <Plus className="w-3 h-3 text-slate-400" />
      </div>
    </div>
  );
}
