/* 团队面板 - 智能体协作左侧 */
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AGENTS, KANBAN_TASKS } from '@/data/mockData';

const statusConfig = {
  working: { label: '工作中', dotClass: 'bg-amber-400 pulse-amber' },
  idle:    { label: '空闲',   dotClass: 'bg-emerald-400 pulse-emerald' },
  blocked: { label: '阻塞',   dotClass: 'bg-rose-400' },
  offline: { label: '离线',   dotClass: 'bg-slate-600' },
};

export default function TeamPanel() {
  const doneTasks = KANBAN_TASKS.filter(t => t.status === 'done').length;
  const progress = KANBAN_TASKS.length === 0 ? 0 : Math.round((doneTasks / KANBAN_TASKS.length) * 100);

  return (
    <div
      className="w-full h-full flex flex-col border-r border-[var(--border-subtle)] overflow-hidden"
      style={{ background: 'var(--panel-bg)', backdropFilter: 'blur(16px)' }}
    >
      {/* 顶部任务信息 */}
      <div className="p-4 border-b border-[var(--border-subtle)] shrink-0">
        <p className="text-xs text-slate-500 mb-1 font-medium">当前项目</p>
        <p className="text-sm text-slate-100 font-semibold text-balance mb-3">用户增长方案设计</p>
        {/* 进度条 */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, delay: 0.3 }}
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #00f2c3, #7c3aed)' }}
            />
          </div>
          <span className="text-xs text-slate-400 shrink-0">{progress}%</span>
        </div>
      </div>

      {/* Agent 列表 */}
      <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-2">
        {AGENTS.map((agent, i) => {
          const sc = statusConfig[agent.status as keyof typeof statusConfig] ?? statusConfig.idle;
          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl glass glass-hover cursor-pointer"
            >
              {/* 头像 */}
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: `${agent.color}25`, border: `2px solid ${agent.color}50`, color: agent.color }}
              >
                {agent.avatar}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-slate-100 font-medium">{agent.name}</span>
                  <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', sc.dotClass)} />
                </div>
                <p className="text-xs text-slate-500 truncate">{sc.label}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* 添加 Agent */}
      <div className="p-3 shrink-0 border-t border-white/5">
        <button className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs text-slate-500 border border-dashed border-white/15 hover:border-cyan-500/40 hover:text-cyan-400 transition-colors">
          <Plus className="w-3.5 h-3.5" />
          添加 Agent
        </button>
      </div>
    </div>
  );
}
