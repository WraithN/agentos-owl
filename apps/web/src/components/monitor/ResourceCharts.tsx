import { motion } from 'framer-motion';

/* ── 资源/任务量柱状图 ─────────────────────────────────────────── */
export function ResourceCharts({ hourlyTasks }: { hourlyTasks: number[] }) {
  const max = Math.max(...hourlyTasks);
  return (
    <div className="flex items-end gap-1 h-10">
      {hourlyTasks.map((v, i) => {
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
  );
}
