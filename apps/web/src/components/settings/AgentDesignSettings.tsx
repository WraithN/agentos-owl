/* 智能体设计 - 智能体配置 + 智能体协作 合并 Tab */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import AgentSettings from './AgentSettings';
import TeamSettings from './TeamSettings';

type DesignTab = 'agents' | 'teams';

const TABS: { id: DesignTab; label: string; icon: typeof Bot }[] = [
  { id: 'agents', label: '智能体配置', icon: Bot },
  { id: 'teams',  label: '智能体团队', icon: Users },
];

export default function AgentDesignSettings() {
  const [activeTab, setActiveTab] = useState<DesignTab>('agents');

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab 切换栏 */}
      <div className="shrink-0 flex items-center gap-1 px-5 pt-5 pb-0 border-b border-[var(--border-subtle)]">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all',
                active
                  ? 'text-slate-900 dark:text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {active && (
                <motion.div
                  layoutId="agent-design-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full"
                  style={{ background: 'linear-gradient(90deg, #00b89a, #7c3aed)' }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 内容区 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'agents' ? (
          <motion.div
            key="agents"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="h-full overflow-y-auto"
          >
            <AgentSettings />
          </motion.div>
        ) : (
          <motion.div
            key="teams"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="h-full overflow-hidden"
          >
            <TeamSettings />
          </motion.div>
        )}
      </div>
    </div>
  );
}
