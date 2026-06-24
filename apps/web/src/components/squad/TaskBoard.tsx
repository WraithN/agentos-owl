/* 任务看板 - 展示当前会话的实时任务流 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid, BarChart3 } from 'lucide-react';
import { AgentWorkStatus } from '@owl-os/core';
import type { AgentTaskView } from '@owl-os/core';
import { cn } from '@/lib/utils';
import { useChatRuntime } from '@/components/chat/chat-runtime-context';
import { useT } from '@/lib/i18n';

const COLUMNS: { key: AgentWorkStatus; color: string; bg: string }[] = [
  { key: AgentWorkStatus.NOT_STARTED, color: 'text-slate-400',   bg: 'bg-slate-500/10 border-slate-500/20' },
  { key: AgentWorkStatus.WAITING,     color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20' },
  { key: AgentWorkStatus.IN_PROGRESS, color: 'text-cyan-400',    bg: 'bg-cyan-500/10 border-cyan-500/20' },
  { key: AgentWorkStatus.COMPLETED,   color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  { key: AgentWorkStatus.FAILED,      color: 'text-rose-400',    bg: 'bg-rose-500/10 border-rose-500/20' },
  { key: AgentWorkStatus.CANCELLED,   color: 'text-slate-400',   bg: 'bg-slate-500/10 border-slate-500/20' },
];

export default function TaskBoard() {
  const t = useT();
  const [view, setView] = useState<'kanban' | 'gantt'>('kanban');
  const { tasks } = useChatRuntime();

  return (
    <div
      className="w-full h-full flex flex-col border-l border-[var(--border-subtle)] overflow-hidden"
      style={{ background: 'var(--panel-bg)', backdropFilter: 'blur(16px)' }}
    >
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] shrink-0">
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{t('agent.title')}</span>
        <div className="flex rounded-lg overflow-hidden border border-[var(--border-subtle)]">
          <button
            onClick={() => setView('kanban')}
            className={cn('p-1.5 transition-colors', view === 'kanban' ? 'bg-white/12 text-cyan-400' : 'text-slate-500 hover:text-slate-300')}
          ><LayoutGrid className="w-3.5 h-3.5" /></button>
          <button
            onClick={() => setView('gantt')}
            className={cn('p-1.5 transition-colors', view === 'gantt' ? 'bg-white/12 text-cyan-400' : 'text-slate-500 hover:text-slate-300')}
          ><BarChart3 className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0 p-3">
        {view === 'kanban' ? <KanbanView tasks={tasks} /> : <GanttView tasks={tasks} />}
      </div>
    </div>
  );
}

function KanbanView({ tasks }: { tasks: AgentTaskView[] }) {
  const t = useT();
  return (
    <div className="flex gap-3 h-full overflow-x-auto pb-1">
      {COLUMNS.map((col) => {
        const columnTasks = tasks.filter((t) => t.status === col.key);
        return (
          <div key={col.key} className="flex flex-col shrink-0 w-52 min-w-[180px]">
            <div className={cn('flex items-center justify-between px-2.5 py-1.5 rounded-xl mb-2 border', col.bg)}>
              <span className={cn('text-[11px] font-semibold', col.color)}>{t(`status.${col.key}` as Parameters<ReturnType<typeof useT>>[0])}</span>
              <span className={cn('text-[10px] px-1.5 rounded-md font-medium', col.color, 'opacity-70')}>
                {columnTasks.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
              {columnTasks.map((task) => <TaskCard key={task.taskId} task={task} />)}
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

function TaskCard({ task }: { task: AgentTaskView }) {
  const t = useT();
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
      <div className="mt-1.5">
        <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', 'bg-slate-700/40 text-slate-400 border border-slate-600/30')}>
          {t(`status.${task.status}` as Parameters<ReturnType<typeof useT>>[0])}
        </span>
      </div>
    </motion.div>
  );
}

function GanttView({ tasks }: { tasks: AgentTaskView[] }) {
  const t = useT();
  const start = Date.now();
  const totalMs = 7 * 24 * 60 * 60 * 1000;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[480px]">
        <div className="flex text-[10px] text-slate-600 mb-2 ml-32">
          {Array.from({ length: 8 }).map((_, i) => {
            const d = new Date(start + i * 24 * 60 * 60 * 1000);
            return <div key={i} className="flex-1 text-center">{`${d.getMonth() + 1}/${d.getDate()}`}</div>;
          })}
        </div>
        <div className="space-y-2">
          {tasks.map((task, index) => {
            const leftPct = (index % 8) * 12;
            const widthPct = 12;
            return (
              <div key={task.taskId} className="flex items-center gap-2">
                <div className="w-32 text-[10px] text-slate-400 truncate shrink-0">{(task.title || task.instruction).slice(0, 10)}…</div>
                <div className="flex-1 relative h-5">
                  <div className="absolute inset-y-0 w-full bg-white/3 rounded" />
                  <motion.div
                    initial={{ scaleX: 0, originX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.2 }}
                    className="absolute top-0.5 bottom-0.5 rounded-full bg-cyan-500/40"
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
          {tasks.length === 0 && (
            <p className="text-[10px] text-slate-500 text-center py-4 italic">{t('common.empty')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
