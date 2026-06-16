import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AGENTS } from '@/data/mockData';
import { fmtDuration, fmtTokens } from './utils';
import { METRICS, type AgentMetrics } from './data';
import { RequestChart } from './RequestChart';
import { ResourceCharts } from './ResourceCharts';
import { LogPanel } from './LogPanel';

/* ── 成功率进度条 ─────────────────────────────────────────────── */
function SuccessBar({ rate }: { rate: number }) {
  const color = rate >= 98 ? '#10b981' : rate >= 92 ? '#f59e0b' : '#f43f5e';
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden min-w-[60px]"
        style={{ background: 'var(--surface-active)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${rate}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums shrink-0"
        style={{ color }}>{rate.toFixed(1)}%</span>
    </div>
  );
}

/* ── 趋势图标 ─────────────────────────────────────────────────── */
function TrendIcon({ trend }: { trend: 'up' | 'down' | 'flat' }) {
  if (trend === 'up') return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
  if (trend === 'down') return <TrendingDown className="w-3.5 h-3.5 text-rose-400" />;
  return <Minus className="w-3.5 h-3.5 text-slate-400" />;
}

/* ── 行展开详情 ───────────────────────────────────────────────── */
function ExpandedRow({ m }: { m: AgentMetrics }) {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <td colSpan={8} className="px-0 py-0">
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: 'auto' }}
          exit={{ height: 0 }}
          transition={{ duration: 0.22 }}
          className="overflow-hidden"
        >
          <div className="mx-4 mb-3 mt-1 p-4 rounded-xl grid grid-cols-2 gap-4"
            style={{
              background: 'var(--surface-hover)',
              border: '1px solid var(--border-l1)',
            }}>
            <LogPanel errors={m.recentErrors} />
            <div>
              <p className="text-xs font-semibold mb-2 flex items-center gap-1.5"
                style={{ color: 'var(--text-secondary)' }}>
                近12小时任务量
              </p>
              <ResourceCharts hourlyTasks={m.hourlyTasks} />
              <div className="flex justify-between mt-1">
                <span className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>-11h</span>
                <span className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>现在</span>
              </div>
            </div>
          </div>
        </motion.div>
      </td>
    </motion.tr>
  );
}

const COLUMNS: { label: string; key: keyof AgentMetrics | null }[] = [
  { label: 'Agent', key: null },
  { label: '总任务', key: 'totalTasks' },
  { label: '成功率', key: null },
  { label: '平均耗时', key: 'avgDurationMs' },
  { label: 'Token/任务', key: 'tokensPerTask' },
  { label: 'Token 总量', key: 'totalTokens' },
  { label: '趋势', key: null },
  { label: '', key: null },
];

/* ── Agent 状态表格 ───────────────────────────────────────────── */
export function AgentStatusTable() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<keyof AgentMetrics>('totalTasks');
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...METRICS].sort((a, b) => {
    const av = a[sortKey] as number;
    const bv = b[sortKey] as number;
    return sortAsc ? av - bv : bv - av;
  });

  const toggleSort = (key: keyof AgentMetrics) => {
    if (sortKey === key) setSortAsc(v => !v);
    else { setSortKey(key); setSortAsc(false); }
  };

  const SortIcon = ({ k }: { k: keyof AgentMetrics }) =>
    sortKey === k
      ? (sortAsc ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />)
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.22 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'var(--glass-l3)',
        backdropFilter: 'var(--glass-blur-l3)',
        WebkitBackdropFilter: 'var(--glass-blur-l3)',
        border: '1px solid var(--border-l2)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-l2)' }}>
              {COLUMNS.map(({ label, key }, i) => (
                <th key={i}
                  className={cn(
                    'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap select-none',
                    key ? 'cursor-pointer hover:text-cyan-400 transition-colors' : ''
                  )}
                  style={{ color: 'var(--text-tertiary)' }}
                  onClick={() => key && toggleSort(key)}
                >
                  <span className="flex items-center">
                    {label}
                    {key && <SortIcon k={key} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((m, rowIdx) => {
              const agent = AGENTS.find(a => a.id === m.agentId);
              if (!agent) return null;
              const rate = (m.successTasks / m.totalTasks) * 100;
              const isExpanded = expandedId === m.agentId;
              return (
                <AnimatePresence key={m.agentId} mode="sync">
                  <motion.tr
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: rowIdx * 0.05 }}
                    className={cn(
                      'group transition-colors cursor-pointer',
                      isExpanded ? '' : 'hover:bg-white/4'
                    )}
                    style={isExpanded ? { background: 'rgba(0,242,195,0.04)' } : {}}
                    onClick={() => setExpandedId(isExpanded ? null : m.agentId)}
                  >
                    {/* Agent 名称 */}
                    <td className="px-4 py-3 whitespace-nowrap"
                      style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--border-l1)' }}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ background: `${agent.color}22`, border: `2px solid ${agent.color}44`, color: agent.color }}>
                          {agent.avatar}
                        </div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{agent.name}</p>
                          <p className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>{agent.model}</p>
                        </div>
                      </div>
                    </td>

                    {/* 总任务 */}
                    <td className="px-4 py-3 whitespace-nowrap"
                      style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--border-l1)' }}>
                      <span className="text-sm font-semibold tabular-nums table-cell-highlight">
                        {m.totalTasks.toLocaleString()}
                      </span>
                      <span className="text-xs ml-1.5 table-cell-muted">
                        ({m.failedTasks} 失败)
                      </span>
                    </td>

                    {/* 成功率 */}
                    <td className="px-4 py-3 min-w-[140px]"
                      style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--border-l1)' }}>
                      <SuccessBar rate={rate} />
                    </td>

                    {/* 平均耗时 */}
                    <td className="px-4 py-3 whitespace-nowrap"
                      style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--border-l1)' }}>
                      <span className={cn(
                        'text-sm font-semibold tabular-nums',
                        m.avgDurationMs > 4000 ? 'table-cell-warn' : 'table-cell-highlight'
                      )}>
                        {fmtDuration(m.avgDurationMs)}
                      </span>
                    </td>

                    {/* Token/任务 */}
                    <td className="px-4 py-3 whitespace-nowrap"
                      style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--border-l1)' }}>
                      <span className="text-sm tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                        {m.tokensPerTask.toLocaleString()}
                      </span>
                    </td>

                    {/* Token 总量 */}
                    <td className="px-4 py-3 whitespace-nowrap"
                      style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--border-l1)' }}>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'text-sm font-semibold tabular-nums',
                          m.totalTokens > 2_000_000 ? 'table-cell-warn' : ''
                        )} style={m.totalTokens <= 2_000_000 ? { color: 'var(--text-secondary)' } : undefined}>
                          {fmtTokens(m.totalTokens)}
                        </span>
                        <RequestChart data={m.hourlyTasks} color={agent.color} />
                      </div>
                    </td>

                    {/* 趋势 */}
                    <td className="px-4 py-3 whitespace-nowrap"
                      style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--border-l1)' }}>
                      <div className="flex items-center gap-1">
                        <TrendIcon trend={m.trend} />
                        <span className={cn(
                          'text-xs font-medium',
                          m.trend === 'up' ? 'text-emerald-400' :
                          m.trend === 'down' ? 'text-rose-400' : 'text-slate-400'
                        )}>
                          {m.trend === 'up' ? '上升' : m.trend === 'down' ? '下降' : '平稳'}
                        </span>
                      </div>
                    </td>

                    {/* 展开箭头 */}
                    <td className="px-4 py-3 whitespace-nowrap"
                      style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--border-l1)' }}>
                      <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                      </motion.div>
                    </td>
                  </motion.tr>

                  {/* 展开行 */}
                  {isExpanded && <ExpandedRow key={`${m.agentId}-exp`} m={m} />}
                </AnimatePresence>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 表底提示 */}
      <div className="px-4 py-3 flex items-center gap-2"
        style={{ borderTop: '1px solid var(--border-l1)' }}>
        <span className="text-xs" style={{ color: 'var(--text-disabled)' }}>
          共 {METRICS.length} 个 Agent · 点击行展开详情 · 点击列标题排序
        </span>
        <span className="ml-auto badge badge-info">实时</span>
      </div>
    </motion.div>
  );
}
