/* 设置模块主入口 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette, Cpu, GitBranch, Bell,
  Shield, CreditCard, Code, ChevronRight, ChevronLeft,
  Settings2, Bot,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AppearanceSettings from './AppearanceSettings';
import AgentDesignSettings from './AgentDesignSettings';
import WorkflowSettings from './WorkflowSettings';
import BillingSettings from './BillingSettings';
import NotificationSettings from './NotificationSettings';
import SecuritySettings from './SecuritySettings';
import ApiSettings from './ApiSettings';
import LlmAgentSettings from './LlmAgentSettings';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useT } from '@/lib/i18n';

export default function SettingsModule() {
  const [activePage, setActivePage] = useState('agentDesign');
  const t = useT();

  const SUB_NAV = [
    { id: 'appearance',    icon: Palette,    label: t('settings.appearance') },
    { id: 'agentDesign',   icon: Cpu,        label: t('settings.agent') },
    { id: 'agentLlm',      icon: Bot,        label: 'Agent LLM' },
    { id: 'workflows',     icon: GitBranch,  label: '工作流编排' },
    { id: 'api',           icon: Code,       label: t('settings.api') },
    { id: 'billing',       icon: CreditCard, label: t('settings.billing') },
    { id: 'security',      icon: Shield,     label: '安全与审计' },
    { id: 'notifications', icon: Bell,       label: '通知与集成' },
  ];
  const [collapsed, setCollapsed] = useState(true);

  const PAGE_MAP: Record<string, React.ReactElement> = {
    appearance:    <AppearanceSettings />,
    agentDesign:   <AgentDesignSettings />,
    agentLlm:      <LlmAgentSettings />,
    workflows:     <WorkflowSettings />,
    api:           <ApiSettings />,
    billing:       <BillingSettings />,
    security:      <SecuritySettings />,
    notifications: <NotificationSettings />,
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-full overflow-hidden">
        {/* 配置层导航 */}
        <motion.div
          animate={{ width: collapsed ? 52 : 220 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          className="shrink-0 flex flex-col border-r border-[var(--border-subtle)] overflow-hidden"
          style={{ background: 'var(--panel-bg)', backdropFilter: 'blur(16px)' }}
        >
          {/* 顶栏：标题 + 展开/收缩按钮 */}
          <div className={cn(
            'flex items-center border-b border-[var(--border-subtle)] shrink-0 h-12',
            collapsed ? 'justify-center px-0' : 'justify-between px-3'
          )}>
            {!collapsed && (
              <div className="flex items-center gap-2 min-w-0">
                <Settings2 className="w-4 h-4 text-slate-400 shrink-0" />
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">设置</h2>
              </div>
            )}
            <button
              onClick={() => setCollapsed(v => !v)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/8 transition-colors shrink-0"
              title={collapsed ? '展开侧边栏' : '收缩侧边栏'}
            >
              {collapsed
                ? <ChevronRight className="w-3.5 h-3.5" />
                : <ChevronLeft  className="w-3.5 h-3.5" />
              }
            </button>
          </div>

          {/* 导航列表 */}
          <nav className="flex-1 overflow-y-auto min-h-0 p-1.5 space-y-0.5">
            {SUB_NAV.map(item => {
              const Icon = item.icon;
              const active = activePage === item.id;
              const btn = (
                <button
                  key={item.id}
                  onClick={() => setActivePage(item.id)}
                  className={cn(
                    'w-full flex items-center rounded-xl text-left transition-all',
                    collapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2.5',
                    active
                      ? 'bg-white/8 text-slate-100 border border-white/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                  )}
                >
                  <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-cyan-400' : '')} />
                  {!collapsed && (
                    <>
                      <span className="text-sm truncate flex-1">{item.label}</span>
                      {active && <ChevronRight className="w-3 h-3 ml-auto text-slate-600 shrink-0" />}
                    </>
                  )}
                </button>
              );

              return collapsed ? (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>{btn}</TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">{item.label}</TooltipContent>
                </Tooltip>
              ) : btn;
            })}
          </nav>
        </motion.div>

        {/* 内容区 */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              className="h-full overflow-y-auto"
            >
              {PAGE_MAP[activePage]}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </TooltipProvider>
  );
}
