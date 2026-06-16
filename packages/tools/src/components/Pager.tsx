import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@owl-os/core';

export default function Pager({
  total,
  current,
  onChange,
}: {
  total: number;
  current: number;
  onChange: (p: number) => void;
}) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center justify-between px-6 py-3 border-t border-[var(--border-subtle)] shrink-0">
      <span className="text-xs text-slate-500">
        第 {current + 1} / {total} 页
      </span>
      <div className="flex items-center gap-1">
        <button
          disabled={current === 0}
          onClick={() => onChange(current - 1)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {Array.from({ length: total }, (_, i) => (
          <button
            key={i}
            onClick={() => onChange(i)}
            className={cn(
              'w-7 h-7 rounded-lg text-xs font-medium transition-all',
              i === current
                ? 'btn-aurora text-white'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8'
            )}
          >
            {i + 1}
          </button>
        ))}
        <button
          disabled={current >= total - 1}
          onClick={() => onChange(current + 1)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
