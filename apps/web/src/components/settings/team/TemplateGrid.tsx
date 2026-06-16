import { Plus, Search, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { btnPrimary } from '@/lib/ui-styles';
import type { TeamTemplate } from '@/types';
import { TemplateCard } from './TemplateCard';

interface TemplateGridProps {
  teams: TeamTemplate[];
  filteredCount: number;
  search: string;
  setSearch: (v: string) => void;
  page: number;
  setPage: (v: number) => void;
  totalPages: number;
  safePage: number;
  enabledMap: Record<string, boolean>;
  onToggleEnabled: (id: string) => void;
  onEdit: (t: TeamTemplate) => void;
  onCopy: (t: TeamTemplate) => void;
  onDelete: (t: TeamTemplate) => void;
  onCreate: () => void;
}

// ── 模板列表/网格 ──────────────────────────────────────────────────────────────
export function TemplateGrid({
  teams, filteredCount, search, setSearch, page, setPage, totalPages, safePage,
  enabledMap, onToggleEnabled, onEdit, onCopy, onDelete, onCreate,
}: TemplateGridProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 pt-5 pb-0 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-100">智能体团队</h1>
            <p className="text-sm text-slate-500 mt-0.5">配置 Agent 协作模式与触发规则</p>
          </div>
          <button onClick={onCreate} className={btnPrimary}>
            <Plus className="w-3.5 h-3.5" />新建团队
          </button>
        </div>
        <div className="flex items-center gap-3 py-2">
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
              placeholder="搜索团队..." className="w-full bg-black/5 dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl pl-9 pr-3 py-2 text-xs text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-600 outline-none focus:border-cyan-500/40 transition-colors" />
          </div>
          <span className="text-xs text-slate-500">{filteredCount} 个团队</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-6 pb-4">
        {teams.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <Users className="w-8 h-8 text-slate-500" />
            <p className="text-sm text-slate-500">暂无团队，点击「新建团队」开始</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {teams.map((t, i) => (
              <TemplateCard
                key={t.id}
                team={t}
                index={i}
                enabled={enabledMap[t.id] ?? t.enabled}
                onEdit={onEdit}
                onCopy={onCopy}
                onDelete={onDelete}
                onToggle={() => onToggleEnabled(t.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-[var(--border-subtle)] shrink-0">
          <span className="text-xs text-slate-500">第 {safePage + 1} / {totalPages} 页</span>
          <div className="flex items-center gap-1">
            <button disabled={safePage === 0} onClick={() => setPage(page - 1)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/8 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i} onClick={() => setPage(i)}
                className={cn('w-7 h-7 rounded-lg text-xs font-medium transition-all',
                  i === safePage ? 'btn-aurora text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/8')}>
                {i + 1}
              </button>
            ))}
            <button disabled={safePage >= totalPages - 1} onClick={() => setPage(page + 1)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/8 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
