/* 计费中心页 */
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { BILLING_DATA, MONTHLY_COST } from '@/data/mockData';
import { useT } from '@/lib/i18n';

const MODEL_DIST = [
  { name: 'GPT-4o',          value: 68, color: '#00f2c3' },
  { name: 'Claude 3.5',      value: 24, color: '#38bdf8' },
  { name: 'Gemini 1.5 Pro',  value: 8,  color: '#7c3aed' },
];

const STAT_CARDS = [
  { label: '本月消费', value: `¥${MONTHLY_COST}`, sub: '预算 ¥50', color: 'text-cyan-400' },
  { label: '本月 Token', value: '151,730', sub: '较上月 +18%', color: 'text-purple-400' },
  { label: '平均日费', value: `¥${(MONTHLY_COST / 12).toFixed(2)}`, sub: '12天', color: 'text-emerald-400' },
  { label: '调用次数', value: '1,284', sub: '本月', color: 'text-amber-400' },
];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) => {
  if (active && payload?.length) {
    return (
      <div className="glass rounded-xl px-3 py-2 text-xs">
        <p className="text-slate-300 font-medium mb-1">{label}</p>
        <p className="text-cyan-400">{payload[0].value.toLocaleString()} tokens</p>
      </div>
    );
  }
  return null;
};

export default function BillingSettings() {
  const t = useT();
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('billing.title')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('billing.subtitle')}</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STAT_CARDS.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass rounded-xl p-4"
          >
            <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-xs text-slate-800 dark:text-slate-200 font-medium mt-0.5">{card.label}</p>
            <p className="text-[10px] text-slate-500 mt-1">{card.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Token 趋势图 */}
      <div className="glass rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">近 7 天 Token 使用趋势</h2>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={BILLING_DATA} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="tokenGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00b89a" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00b89a" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" />
            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
              tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="tokens" stroke="#00b89a" strokeWidth={2}
              fill="url(#tokenGrad)" dot={{ fill: '#00b89a', r: 3 }} activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 模型分布 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">模型调用分布</h2>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={MODEL_DIST} cx="50%" cy="50%" innerRadius={45} outerRadius={65}
                dataKey="value" stroke="none">
                {MODEL_DIST.map((entry, i) => (
                  <Cell key={i} fill={entry.color} fillOpacity={0.8} />
                ))}
              </Pie>
              <Legend
                formatter={(value) => <span className="text-xs text-slate-400">{value}</span>}
                layout="horizontal"
                wrapperStyle={{ paddingTop: 8 }}
              />
              <Tooltip formatter={(value) => [`${value}%`, '占比']} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 明细列表 */}
        <div className="glass rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">每日明细</h2>
          <div className="space-y-2">
            {BILLING_DATA.slice(-5).map(r => (
              <div key={r.date} className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-mono">{r.date}</span>
                <span className="text-slate-500 dark:text-slate-400">{r.tokens.toLocaleString()} tokens</span>
                <span className="text-slate-700 dark:text-slate-300">¥{r.cost.toFixed(2)}</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-600">{r.model}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-[var(--border-subtle)] pt-3 mt-3 flex justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">本月合计</span>
            <span className="aurora-text font-bold text-sm">¥{MONTHLY_COST}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
