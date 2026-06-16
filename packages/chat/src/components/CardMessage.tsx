/* 结构化卡片（card 类型） */
import { cn } from '@owl-os/core';
import type { CardData } from '../types.js';

const CARD_BADGE_COLORS: Record<string, string> = {
  cyan:    'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
  emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  violet:  'bg-violet-500/15 text-violet-400 border-violet-500/25',
  amber:   'bg-amber-500/15 text-amber-400 border-amber-500/25',
};

export default function CardMessage({ data }: { data: CardData }) {
  return (
    <div className="mt-3 rounded-2xl overflow-hidden card-lift"
      style={{
        background: 'var(--glass-l3)',
        backdropFilter: 'var(--glass-blur-l3)',
        WebkitBackdropFilter: 'var(--glass-blur-l3)',
        border: '1px solid var(--border-l2)',
        boxShadow: 'var(--shadow-sm)',
      }}>
      {/* 卡头 */}
      <div className="px-4 py-3 flex items-start justify-between gap-2"
        style={{ borderBottom: '1px solid var(--border-l1)' }}>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-balance" style={{ color: 'var(--text-primary)' }}>{data.title}</p>
          {data.subtitle && <p className="text-xs mt-0.5 text-pretty" style={{ color: 'var(--text-tertiary)' }}>{data.subtitle}</p>}
        </div>
        {data.badge && (
          <span className={cn(
            'badge text-[10px] whitespace-nowrap shrink-0',
            CARD_BADGE_COLORS[data.badgeColor ?? 'cyan']
          )}>
            {data.badge}
          </span>
        )}
      </div>
      {/* 数据行 */}
      {data.rows && data.rows.length > 0 && (
        <div>
          {data.rows.map((row, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2.5 gap-4 table-row-base"
              style={{ borderBottom: i < (data.rows?.length ?? 0) - 1 ? '1px solid var(--border-l1)' : undefined }}>
              <span className="text-xs shrink-0" style={{ color: 'var(--text-tertiary)' }}>{row.label}</span>
              <span className={cn(
                'text-xs font-medium text-right truncate',
                row.highlight ? 'table-cell-highlight' : ''
              )} style={!row.highlight ? { color: 'var(--text-secondary)' } : undefined}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      )}
      {/* 操作按钮 */}
      {data.actions && data.actions.length > 0 && (
        <div className="px-4 py-3 flex items-center gap-2" style={{ borderTop: '1px solid var(--border-l1)' }}>
          {data.actions.map((act, i) => (
            <button key={i} className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 btn-lift',
              act.variant === 'primary'
                ? 'btn-aurora text-white'
                : ''
            )}
            style={act.variant !== 'primary' ? {
              background: 'var(--surface-hover)',
              border: '1px solid var(--border-l2)',
              color: 'var(--text-secondary)',
            } : undefined}>
              {act.label}
            </button>
          ))}
        </div>
      )}
      {data.footer && (
        <div className="px-4 pb-3">
          <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{data.footer}</p>
        </div>
      )}
    </div>
  );
}
