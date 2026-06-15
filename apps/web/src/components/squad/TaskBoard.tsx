/* 任务看板 - 群聊模式右侧 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KANBAN_TASKS, getAgent } from '@/data/mockData';
import type { KanbanTask, TaskStatus } from '@/types';

const COLUMNS: { key: TaskStatus; label: string; color: string; bg: string }[] = [
  { key: 'todo',        label: '待办',   color: 'text-slate-400',   bg: 'bg-slate-500/10 border-slate-500/20' },
  { key: 'in-progress', label: '进行中', color: 'text-cyan-400',    bg: 'bg-cyan-500/10 border-cyan-500/20' },
  { key: 'review',      label: '审核中', color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
  { key: 'done',        label: '已完成', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
];

const PRIORITY_STYLE = {
  P0: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
  P1: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  P2: 'bg-slate-700/40 text-slate-400 border border-slate-600/30',
};

export default function TaskBoard() {
  const [view, setView] = useState<'kanban' | 'gantt'>('kanban');

  return (
    <div
      className="w-full h-full flex flex-col border-l border-[var(--border-subtle)] overflow-hidden"
      style={{ background: 'var(--panel-bg)', backdropFilter: 'blur(16px)' }}
    >
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] shrink-0">
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">任务看板</span>
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
        {view === 'kanban' ? <KanbanView /> : <GanttView />}
      </div>
    </div>
  );
}

function KanbanView() {
  return (
    /* 水平四列 Kanban，每列 = 状态，列内 = 任务卡片 */
    <div className="flex gap-3 h-full overflow-x-auto pb-1">
      {COLUMNS.map(col => {
        const tasks = KANBAN_TASKS.filter(t => t.status === col.key);
        return (
          <div key={col.key} className="flex flex-col shrink-0 w-44 min-w-[160px]">
            {/* 状态列头 */}
            <div className={cn('flex items-center justify-between px-2.5 py-1.5 rounded-xl mb-2 border', col.bg)}>
              <span className={cn('text-[11px] font-semibold', col.color)}>{col.label}</span>
              <span className={cn('text-[10px] px-1.5 rounded-md font-medium', col.color, 'opacity-70')}>
                {tasks.length}
              </span>
            </div>
            {/* 任务列表 */}
            <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
              {tasks.map(task => <TaskCard key={task.id} task={task} />)}
              {tasks.length === 0 && (
                <p className="text-[10px] text-slate-500 text-center py-4 italic">暂无任务</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TaskCard({ task }: { task: KanbanTask }) {
  const agent = getAgent(task.assigneeId);
  return (
    <motion.div
      whileHover={{ y: -1 }}
      className="p-3 rounded-xl cursor-pointer transition-all"
      style={{ background: 'var(--surface-hover)', border: '1px solid var(--border-subtle)' }}
    >
      <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-snug text-balance mb-2">{task.title}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {agent && (
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
              style={{ background: `${agent.color}25`, color: agent.color }}
            >{agent.avatar}</div>
          )}
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', PRIORITY_STYLE[task.priority])}>
            {task.priority}
          </span>
        </div>
        <span className="text-[10px] text-slate-600">{task.dueDate.slice(5)}</span>
      </div>
    </motion.div>
  );
}

function GanttView() {
  const start = new Date('2026-06-08');
  const end = new Date('2026-07-10');
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / 86400000);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[480px]">
        {/* 时间轴 */}
        <div className="flex text-[10px] text-slate-600 mb-2 ml-24">
          {['06-08', '06-14', '06-20', '06-26', '07-05'].map(d => (
            <div key={d} className="flex-1 text-center">{d}</div>
          ))}
        </div>
        <div className="space-y-2">
          {KANBAN_TASKS.map(task => {
            const agent = getAgent(task.assigneeId);
            const taskStart = new Date('2026-06-08');
            const taskEnd = new Date(task.dueDate);
            const left = Math.max(0, Math.ceil((taskStart.getTime() - start.getTime()) / 86400000));
            const width = Math.max(5, Math.ceil((taskEnd.getTime() - taskStart.getTime()) / 86400000));
            const leftPct = (left / totalDays) * 100;
            const widthPct = (width / totalDays) * 100;
            return (
              <div key={task.id} className="flex items-center gap-2">
                <div className="w-24 text-[10px] text-slate-400 truncate shrink-0">{task.title.slice(0, 8)}...</div>
                <div className="flex-1 relative h-5">
                  <div className="absolute inset-y-0 w-full bg-white/3 rounded" />
                  <motion.div
                    initial={{ scaleX: 0, originX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.2 }}
                    className="absolute top-0.5 bottom-0.5 rounded-full"
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      background: agent ? `linear-gradient(90deg, ${agent.color}80, ${agent.color}40)` : 'rgba(100,116,139,0.4)',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
