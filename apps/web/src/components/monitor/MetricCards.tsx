import { motion } from 'framer-motion';
import {
  Activity, Clock, CheckCircle2, Zap,
} from 'lucide-react';
import { fmtDuration, fmtTokens } from './utils';
import { METRICS, type AgentMetrics } from './data';

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

interface MetricCardsProps {
  refreshKey?: number;
}

/* ── 顶部指标卡片 ─────────────────────────────────────────────── */
export function MetricCards({ refreshKey = 0 }: MetricCardsProps) {
  const totalTasks = METRICS.reduce((s: number, m: AgentMetrics) => s + m.totalTasks, 0);
  const totalSuccess = METRICS.reduce((s: number, m: AgentMetrics) => s + m.successTasks, 0);
  const totalTokens = METRICS.reduce((s: number, m: AgentMetrics) => s + m.totalTokens, 0);
  const avgDuration = METRICS.reduce((s: number, m: AgentMetrics) => s + m.avgDurationMs, 0) / METRICS.length;
  const overallRate = (totalSuccess / totalTasks) * 100;

  return (
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
  );
}
