/* Agent 运行状态监控面板 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { MetricCards } from './MetricCards';
import { AgentStatusTable } from './AgentStatusTable';

/* ── 主组件 ───────────────────────────────────────────────────── */
export default function MonitorModule() {
  const [refreshKey, setRefreshKey] = useState(0);

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
        <MetricCards refreshKey={refreshKey} />

        {/* 数据表格 */}
        <AgentStatusTable />
      </div>
    </div>
  );
}
