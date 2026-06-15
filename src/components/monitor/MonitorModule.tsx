/* Agent 运行状态监控面板 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Clock, CheckCircle2, XCircle, Zap, TrendingUp,
  TrendingDown, Minus, RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AGENTS } from '@/data/mockData';

/* ── 模拟运行数据 ─────────────────────────────────────────────── */
interface AgentMetrics {
  agentId: string;
  totalTasks: number;
  successTasks: number;
  failedTasks: number;
  avgDurationMs: number;
  totalTokens: number;
  tokensPerTask: number;
  trend: 'up' | 'down' | 'flat';
  recentErrors: string[];
  hourlyTasks: number[];
}

const METRICS: AgentMetrics[] = [
  {
    agentId: 'aria',
    totalTasks: 312,
    successTasks: 298,
    failedTasks: 14,
    avgDurationMs: 2340,
    totalTokens: 1_842_000,
    tokensPerTask: 5904,
    trend: 'up',
    recentErrors: ['超时: 任务 #312', '上下文溢出: 任务 #305'],
    hourlyTasks: [12, 18, 22, 15, 8, 25, 30, 28, 20, 16, 24, 32],
  },
  {
    agentId: 'coder',
    totalTasks: 187,
    successTasks: 179,
    failedTasks: 8,
    avgDurationMs: 4820,
    totalTokens: 2_610_000,
    tokensPerTask: 13_957,
    trend: 'up',
    recentErrors: ['编译错误: 任务 #187'],
    hourlyTasks: [8, 10, 14, 12, 6, 18, 22, 20, 16, 10, 14, 19],
  },
  {
    agentId: 'analyst',
    totalTasks: 254,
    successTasks: 241,
    failedTasks: 13,
    avgDurationMs: 3150,
    totalTokens: 980_000,
    tokensPerTask: 3858,
    trend: 'flat',
    recentErrors: ['数据源不可用: 任务 #250', 'SQL 超时: 任务 #244'],
    hourlyTasks: [6, 8, 10, 14, 18, 12, 20, 18, 14, 12, 16, 21],
  },
  {
    agentId: 'muse',
    totalTasks: 98,
    successTasks: 96,
    failedTasks: 2,
    avgDurationMs: 5600,
    totalTokens: 540_000,
    tokensPerTask: 5510,
    trend: 'down',
    recentErrors: [],
    hourlyTasks: [2, 4, 6, 8, 10, 8, 12, 14, 10, 6, 8, 10],
  },
  {
    agentId: 'writer',
    totalTasks: 143,
    successTasks: 139,
    failedTasks: 4,
    avgDurationMs: 2080,
    totalTokens: 720_000,
    tokensPerTask: 5035,
    trend: 'up',
    recentErrors: ['内容过滤: 任务 #143'],
    hourlyTasks: [4, 6, 8, 10, 8, 14, 16, 12, 10, 8, 12, 14],
  },
];

/* ── 迷你折线图 ─────────────────────────────────────────────── */
function SparkLine({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80, h = 28, pad = 3;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
      <polyline
        points={`${pad},${h} ${pts} ${w - pad},${h}`}
        fill={color} opacity="0.08" stroke="none"
      />
    </svg>
  );
}

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

/* ── 格式化 ──────────────────────────────────────────────────── */
const fmtDuration = (ms: number) =>
  ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
const fmtTokens = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : `${(n / 1000).toFixed(0)}K`;

/* ── 汇总卡片 ─────────────────────────────────────────────────── */
function SummaryCard({
  icon, label, value, sub, delay,
}: {
  icon: React.ReactNode; label: string; value: string; sub?: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className="rounded-2xl p-4 flex flex-col gap-2 card-lift"
      style={{
        background: 'var(--glass-l3)',
        backdropFilter: 'var(--glass-blur-l3)',
        WebkitBackdropFilter: 'var(--glass-blur-l3)',
        border: '1px solid var(--border-l2)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl" style={{ background: 'var(--surface-active)' }}>
          {icon}
        </div>
        <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      </div>
      <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{value}</p>
      {sub && <p className="text-xs" style={{ color: 'var(--text-disabled)' }}>{sub}</p>}
    </motion.div>
  );
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
            {/* 最近错误 */}
            <div>
              <p className="text-xs font-semibold mb-2 flex items-center gap-1.5"
                style={{ color: 'var(--text-secondary)' }}>
                <XCircle className="w-3.5 h-3.5 text-rose-400" />最近错误
              </p>
              {m.recentErrors.length === 0
                ? <p className="text-xs" style={{ color: 'var(--text-disabled)' }}>暂无错误记录</p>
                : m.recentErrors.map((e, i) => (
                  <p key={i} className="text-xs mb-1 flex items-start gap-1.5">
                    <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                    <span style={{ color: 'var(--text-tertiary)' }}>{e}</span>
                  </p>
                ))}
            </div>
            {/* 每小时任务趋势 */}
            <div>
              <p className="text-xs font-semibold mb-2 flex items-center gap-1.5"
                style={{ color: 'var(--text-secondary)' }}>
                <Activity className="w-3.5 h-3.5 text-cyan-400" />近12小时任务量
              </p>
              <div className="flex items-end gap-1 h-10">
                {m.hourlyTasks.map((v, i) => {
                  const max = Math.max(...m.hourlyTasks);
                  const pct = (v / max) * 100;
                  return (
                    <motion.div key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${pct}%` }}
                      transition={{ duration: 0.4, delay: i * 0.03 }}
                      className="flex-1 rounded-sm"
                      style={{ background: 'rgba(0,242,195,0.35)', minWidth: 4 }}
                    />
                  );
                })}
              </div>
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

/* ── 主组件 ───────────────────────────────────────────────────── */
export default function MonitorModule() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<keyof AgentMetrics>('totalTasks');
  const [sortAsc, setSortAsc] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const totalTasks   = METRICS.reduce((s, m) => s + m.totalTasks, 0);
  const totalSuccess = METRICS.reduce((s, m) => s + m.successTasks, 0);
  const totalTokens  = METRICS.reduce((s, m) => s + m.totalTokens, 0);
  const avgDuration  = METRICS.reduce((s, m) => s + m.avgDurationMs, 0) / METRICS.length;
  const overallRate  = (totalSuccess / totalTasks) * 100;

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
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">

        {/* 页头 */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex items-start justify-between gap-4"
        >
          <div>
            <h1 className="text-xl font-bold text-balance" style={{ color: 'var(--text-primary)' }}>
              Agent 运行监控
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              实时追踪各 Agent 的任务量、成功率、平均耗时与 Token 消耗
            </p>
          </div>
          <motion.button
            onClick={() => setRefreshKey(k => k + 1)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium btn-lift"
            style={{
              background: 'var(--surface-hover)',
              border: '1px solid var(--border-l2)',
              color: 'var(--text-secondary)',
            }}
            whileTap={{ rotate: 180 }}
            transition={{ duration: 0.4 }}
          >
            <RefreshCw className="w-3.5 h-3.5" />刷新
          </motion.button>
        </motion.div>

        {/* 汇总卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" key={refreshKey}>
          <SummaryCard
            icon={<Activity className="w-4 h-4 text-cyan-400" />}
            label="总任务数" value={totalTasks.toLocaleString()}
            sub="累计执行" delay={0}
          />
          <SummaryCard
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            label="综合成功率" value={`${overallRate.toFixed(1)}%`}
            sub={`${totalSuccess} 成功 / ${totalTasks - totalSuccess} 失败`} delay={0.06}
          />
          <SummaryCard
            icon={<Clock className="w-4 h-4 text-blue-400" />}
            label="平均耗时" value={fmtDuration(avgDuration)}
            sub="全 Agent 均值" delay={0.12}
          />
          <SummaryCard
            icon={<Zap className="w-4 h-4 text-amber-400" />}
            label="总 Token 消耗" value={fmtTokens(totalTokens)}
            sub="本周累计" delay={0.18}
          />
        </div>

        {/* 数据表格 */}
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
                  {[
                    { label: 'Agent', key: null },
                    { label: '总任务', key: 'totalTasks' },
                    { label: '成功率', key: null },
                    { label: '平均耗时', key: 'avgDurationMs' },
                    { label: 'Token/任务', key: 'tokensPerTask' },
                    { label: 'Token 总量', key: 'totalTokens' },
                    { label: '趋势', key: null },
                    { label: '', key: null },
                  ].map(({ label, key }, i) => (
                    <th key={i}
                      className={cn(
                        'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap select-none',
                        key ? 'cursor-pointer hover:text-cyan-400 transition-colors' : ''
                      )}
                      style={{ color: 'var(--text-tertiary)' }}
                      onClick={() => key && toggleSort(key as keyof AgentMetrics)}
                    >
                      <span className="flex items-center">
                        {label}
                        {key && <SortIcon k={key as keyof AgentMetrics} />}
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
                            <SparkLine data={m.hourlyTasks} color={agent.color} />
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
      </div>
    </div>
  );
}
