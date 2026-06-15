/* 智能体模块 - 包含智能体协作与智能体配置两个 Tab */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Settings2, ChevronLeft, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import TeamPanel from '@/components/squad/TeamPanel';
import TaskBoard from '@/components/squad/TaskBoard';
import ExecutionLog from '@/components/automation/ExecutionLog';

const TABS = [
  { id: 'collaborate', label: '智能体协作', icon: Users },
  { id: 'config',      label: '智能体配置', icon: Settings2 },
];

export default function AgentModule() {
  const [activeTab, setActiveTab] = useState<'collaborate' | 'config'>('collaborate');
  // 任务看板默认收缩
  const [taskBoardOpen, setTaskBoardOpen] = useState(false);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab 切换栏 */}
      <div
        className="shrink-0 flex items-center gap-1 px-4 py-2 border-b border-[var(--border-subtle)]"
        style={{ background: 'var(--topbar-bg)', backdropFilter: 'blur(16px)' }}
      >
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'collaborate' | 'config')}
              className={cn(
                'relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                active
                  ? 'text-slate-900 dark:text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              )}
            >
              {active && (
                <motion.div
                  layoutId="agent-tab-indicator"
                  className="absolute inset-0 rounded-lg bg-black/6 dark:bg-white/8"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <Icon className="w-4 h-4 relative z-10" />
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 内容区 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'collaborate' ? (
          <motion.div
            key="collaborate"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="flex h-full"
          >
            {/* 左侧：团队面板 */}
            <div className="w-64 shrink-0 h-full overflow-hidden">
              <TeamPanel />
            </div>

            {/* 中间：占位消息区 */}
            <div className="flex-1 min-w-0 h-full overflow-hidden relative">
              {/* nothing here — placeholder */}
            </div>

            {/* 任务看板（可收缩）*/}
            <motion.div
              animate={{ opacity: taskBoardOpen ? 1 : 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              className={cn(
                'shrink-0 overflow-hidden transition-all duration-300',
                taskBoardOpen ? 'w-full md:w-[60%] min-w-[320px]' : 'w-0'
              )}
            >
              {taskBoardOpen && <TaskBoard />}
            </motion.div>

            {/* 任务看板收缩/展开 边缘按钮 */}
            <button
              onClick={() => setTaskBoardOpen(v => !v)}
              className={cn(
                'shrink-0 flex flex-col items-center justify-center gap-1 w-4 border-l border-[var(--border-subtle)] transition-colors',
                taskBoardOpen
                  ? 'text-cyan-400 hover:bg-cyan-500/10'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              )}
              style={{ background: 'var(--panel-bg)' }}
              title={taskBoardOpen ? '收起任务看板' : '展开任务看板'}
            >
              <LayoutGrid className="w-3 h-3" />
              <ChevronLeft className={cn('w-3 h-3 transition-transform', !taskBoardOpen && 'rotate-180')} />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="config"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full overflow-hidden"
          >
            <ExecutionLog />
          </motion.div>
        )}
      </div>
    </div>
  );
}
