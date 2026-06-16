import { useState } from 'react';
import { Database, X, ChevronDown as ChevronDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AVAILABLE_KBS } from '@/data/mockData';
import type { KBRef } from './constants';

// ── 知识库选择器（下拉多选） ──────────────────────────────────────────
export function KBPicker({ value, onChange }: { value: KBRef[]; onChange: (v: KBRef[]) => void }) {
  const [open, setOpen] = useState(false);
  const selectedIds = new Set(value.map(k => k.id));

  function toggle(kb: typeof AVAILABLE_KBS[number]) {
    if (selectedIds.has(kb.id)) onChange(value.filter(k => k.id !== kb.id));
    else onChange([...value, { id: kb.id, name: kb.name }]);
  }

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map(kb => (
            <span key={kb.id} className="flex items-center gap-1 text-[11px] bg-cyan-500/12 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/25">
              <Database className="w-3 h-3 shrink-0" />{kb.name}
              <button onClick={() => onChange(value.filter(k => k.id !== kb.id))} className="hover:text-rose-400 transition-colors ml-0.5"><X className="w-2.5 h-2.5" /></button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <button onClick={() => setOpen(v => !v)}
          className={cn('w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl border transition-colors',
            open ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-white/10 bg-white/5 hover:border-white/20')}>
          <span className={value.length ? 'text-slate-300' : 'text-slate-600'}>
            {value.length ? `已选 ${value.length} 个知识库` : '选择知识库…'}
          </span>
          <ChevronDownIcon className={cn('w-3.5 h-3.5 text-slate-500 transition-transform', open && 'rotate-180')} />
        </button>
        {open && (
          <div className="absolute z-20 top-full mt-1 w-full rounded-xl border border-white/10 overflow-hidden shadow-xl"
            style={{ background: 'var(--panel-bg-solid)', backdropFilter: 'blur(16px)' }}>
            {AVAILABLE_KBS.map(kb => {
              const selected = selectedIds.has(kb.id);
              return (
                <button key={kb.id} onClick={() => toggle(kb)}
                  className={cn('w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-white/8', selected && 'bg-cyan-500/8')}>
                  <div className={cn('w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all',
                    selected ? 'bg-cyan-500 border-cyan-500' : 'border-white/20')}>
                    {selected && <span className="text-white text-[10px] font-bold leading-none">✓</span>}
                  </div>
                  <Database className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-200 truncate">{kb.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono truncate">{kb.vectorDbUrl}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
