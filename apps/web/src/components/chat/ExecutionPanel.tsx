/* 右侧「执行过程」面板：任务流 + 智能体团队 + 生成文件 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid, Bot, FileText } from 'lucide-react';
import { AgentWorkStatus } from '@owl-os/core';
import type { AgentTaskView } from '@owl-os/core';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';
import { useChatRuntime } from './chat-runtime-context';
import AgentWorkflowPanel from './AgentWorkflowPanel';
import { FileResultCards } from './FileResultCards';

export type TabKey = 'tasks' | 'team' | 'files';

function useExecutionTabs(t: ReturnType<typeof useT>): { key: TabKey; icon: typeof LayoutGrid; label: string }[] {
  return [
    { key: 'tasks', icon: LayoutGrid, label: t('execution.taskFlow') },
    { key: 'team', icon: Bot, label: t('execution.team') },
    { key: 'files', icon: FileText, label: t('execution.files') },
  ];
}

const COLUMNS: { key: AgentWorkStatus; color: string; bg: string }[] = [
  { key: AgentWorkStatus.NOT_STARTED, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' },
  { key: AgentWorkStatus.WAITING, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  { key: AgentWorkStatus.IN_PROGRESS, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
  { key: AgentWorkStatus.COMPLETED, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  { key: AgentWorkStatus.FAILED, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
  { key: AgentWorkStatus.CANCELLED, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' },
];

function TaskBoardKanban({ tasks }: { tasks: AgentTaskView[] }) {
  const t = useT();
  return (
    <div className="flex gap-3 h-full overflow-x-auto pb-1">
      {COLUMNS.map((col) => {
        const columnTasks = tasks.filter((task) => task.status === col.key);
        return (
          <div key={col.key} className="flex flex-col shrink-0 w-52 min-w-[180px]">
            <div className={cn('flex items-center justify-between px-2.5 py-1.5 rounded-xl mb-2 border', col.bg)}>
              <span className={cn('text-[11px] font-semibold', col.color)}>{t(`status.${col.key}` as Parameters<ReturnType<typeof useT>>[0])}</span>
              <span className={cn('text-[10px] px-1.5 rounded-md font-medium', col.color, 'opacity-70')}>
                {columnTasks.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
              {columnTasks.map((task) => (
                <ExecutionTaskCard key={task.taskId} task={task} />
              ))}
              {columnTasks.length === 0 && (
                <p className="text-[10px] text-slate-500 text-center py-4 italic">{t('common.empty')}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ExecutionTaskCard({ task }: { task: AgentTaskView }) {
  return (
    <motion.div
      whileHover={{ y: -1 }}
      className="p-3 rounded-xl cursor-pointer transition-all"
      style={{ background: 'var(--surface-hover)', border: '1px solid var(--border-subtle)' }}
    >
      <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-snug text-balance mb-1">
        {task.title || task.instruction}
      </p>
      {task.description && task.description !== task.instruction && (
        <p className="text-[10px] text-slate-500 leading-snug line-clamp-2 mb-2">{task.description}</p>
      )}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {task.assignee && (
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold bg-cyan-500/20 text-cyan-400 shrink-0">
              {task.assignee.slice(0, 1)}
            </div>
          )}
          <span className="text-[10px] text-slate-500 truncate">{task.assignee || task.assigneeAgentId}</span>
        </div>
        {typeof task.progress === 'number' && (
          <span className="text-[10px] text-slate-500 shrink-0">{task.progress}%</span>
        )}
      </div>
    </motion.div>
  );
}

interface ExecutionPanelProps {
  sessionId: string;
  activeTab?: TabKey;
  onTabChange?: (tab: TabKey) => void;
}

export default function ExecutionPanel({ sessionId, activeTab: controlledTab, onTabChange }: ExecutionPanelProps) {
  const t = useT();
  const [internalTab, setInternalTab] = useState<TabKey>('tasks');
  const isControlled = controlledTab !== undefined;
  const activeTab = isControlled ? controlledTab : internalTab;
  const setActiveTab = (tab: TabKey) => {
    if (isControlled) {
      onTabChange?.(tab);
    } else {
      setInternalTab(tab);
    }
  };
  const {
    tasks, agentOutputs, rounds, teamStatus, generatedFiles, isRunning,
  } = useChatRuntime();
  const tabs = useExecutionTabs(t);

  const hasTeamData = Object.keys(agentOutputs).length > 0 || (teamStatus?.members.length ?? 0) > 0;

  return (
    <div
      className="w-full h-full flex overflow-hidden"
      style={{ background: 'var(--panel-bg)', backdropFilter: 'blur(16px)' }}
    >
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] shrink-0">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{t('execution.title')}</span>
          {isRunning && (
            <span className="flex items-center gap-1.5 text-[11px] text-cyan-400">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              {t('execution.running')}
            </span>
          )}
        </div>
        <div className="flex-1 overflow-hidden min-h-0 p-3">
          {activeTab === 'tasks' && <TaskBoardKanban tasks={tasks} />}
          {activeTab === 'team' && (
            <div className="h-full overflow-y-auto">
              {hasTeamData || rounds.length > 0 || tasks.length > 0 ? (
                <AgentWorkflowPanel
                  agentOutputs={agentOutputs}
                  tasks={tasks}
                  rounds={rounds}
                  teamStatus={teamStatus}
                  sessionId={sessionId}
                  teammateName={teamStatus?.teammateName}
                  hideIfOnlyBoss={false}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  {t('execution.emptyTeam')}
                </div>
              )}
            </div>
          )}
          {activeTab === 'files' && (
            <div className="h-full overflow-y-auto">
              {generatedFiles.length > 0 ? (
                <FileResultCards sessionId={sessionId} filePaths={generatedFiles} />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  {t('execution.emptyFiles')}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 右侧垂直 Tabs */}
      <div className="w-14 shrink-0 border-l border-[var(--border-subtle)] flex flex-col py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 py-3 px-1 text-[10px] transition-colors',
                isActive
                  ? 'text-cyan-400 bg-cyan-500/10'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="leading-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
