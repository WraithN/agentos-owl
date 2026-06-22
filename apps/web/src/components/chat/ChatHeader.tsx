/* Chat 标题栏 */
import { useEffect, useState } from 'react';
import { LayoutGrid, Plus, Bot, Activity, History } from 'lucide-react';
import type { AgentWorkStatus, TeammateAgentStatus, TeammateStatus } from '@owl-os/core';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getTeammateStatus, onAgentStatus } from '@/services/electron';
import { cn } from '@/lib/utils';

const OWLERY_STATUS_EVENT = 'owlery:teammate-status';

const TITLE_LABEL: Record<string, string> = {
  boss: '老板',
  planner: '规划师',
  supervisor: '监督者',
  coordinator: '协调者',
  cto: 'CTO',
  developer: '开发者',
  tester: '测试员',
  designer: '设计师',
  writer: '撰写者',
  researcher: '研究员',
  analyst: '分析师',
  marketer: '营销员',
  operator: '操作员',
  reviewer: '审核员',
  debugger: '调试员',
};

const STATUS_META: Record<AgentWorkStatus, { label: string; className: string }> = {
  not_started: { label: '未开始', className: 'bg-slate-500' },
  in_progress: { label: '工作中', className: 'bg-amber-400' },
  completed: { label: '已完成', className: 'bg-emerald-400' },
  failed: { label: '失败', className: 'bg-destructive' },
  cancelled: { label: '已取消', className: 'bg-slate-400' },
};

function AgentStatusRow({ agent }: { agent: TeammateAgentStatus }) {
  const meta = STATUS_META[agent.status];
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/20 p-2 text-xs">
      <div className="min-w-0">
        <div className="truncate text-foreground">
          角色：{TITLE_LABEL[agent.title] ?? agent.title}，名称：{agent.name}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
        <span className={cn('h-2 w-2 rounded-full', meta.className)} />
        {meta.label}
      </div>
    </div>
  );
}

/* ── Chat 标题栏 ───────────────────────────────────────────────────────── */
interface ChatHeaderProps {
  title: string;
  currentId?: string;
  onSelect: () => void;
  onNew: () => void;
  taskBoardOpen: boolean;
  onToggleTaskBoard: () => void;
  monitorOpen: boolean;
  onToggleMonitor: () => void;
}
export default function ChatHeader({
  title, currentId, onSelect, onNew,
  taskBoardOpen, onToggleTaskBoard, monitorOpen, onToggleMonitor,
}: ChatHeaderProps) {
  const [teammateStatus, setTeammateStatus] = useState<TeammateStatus | null>(null);

  useEffect(() => {
    if (!currentId) {
      setTeammateStatus(null);
      return;
    }
    let disposed = false;
    getTeammateStatus(currentId)
      .then((status) => {
        if (!disposed) setTeammateStatus(status);
      })
      .catch(() => {
        if (!disposed) setTeammateStatus(null);
      });
    const handleWebSocketStatus = (event: Event) => {
      const detail = (event as CustomEvent<{ sessionId: string; status: TeammateStatus }>).detail;
      if (detail.sessionId !== currentId) return;
      setTeammateStatus(detail.status);
    };
    window.addEventListener(OWLERY_STATUS_EVENT, handleWebSocketStatus);
    const unsubscribe = onAgentStatus((wrapper) => {
      if (wrapper.sessionId !== currentId) return;
      setTeammateStatus(wrapper.status);
    });
    return () => {
      disposed = true;
      window.removeEventListener(OWLERY_STATUS_EVENT, handleWebSocketStatus);
      unsubscribe();
    };
  }, [currentId]);

  return (
    <div
      className="shrink-0 flex items-center gap-2 px-4 h-11 border-b border-[var(--border-subtle)] z-20 relative drag-region"
      style={{
        background: 'var(--topbar-bg)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* 标题 */}
      <span className="flex-1 min-w-0 text-sm font-medium text-slate-200 truncate drag-region">{title}</span>

      {/* 右侧操作按钮 */}
      <div className="flex items-center gap-0.5 shrink-0 no-drag-region">

        {/* 1. Teammate 状态 */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              className={cn(
                'p-2 rounded-lg transition-colors',
                'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              )}
              title="智能体团队"
            >
              <Bot className="w-4 h-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 border-border/60 bg-background/95 p-3">
            <div className="mb-2 text-sm font-medium text-foreground">智能体团队</div>
            {!teammateStatus ? (
              <div className="rounded-lg border border-dashed border-border/50 p-3 text-xs text-muted-foreground">暂无智能体团队状态</div>
            ) : (
              <div className="grid gap-1.5">
                {teammateStatus.teammateName && (
                  <div className="text-xs text-muted-foreground">{teammateStatus.teammateName}</div>
                )}
                {teammateStatus.leader && <AgentStatusRow agent={teammateStatus.leader} />}
                {teammateStatus.members.map((agent) => (
                  <AgentStatusRow key={agent.agentId} agent={agent} />
                ))}
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* 2. 会话历史 */}
        <button
          onClick={onSelect}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
          title="会话历史"
        >
          <History className="w-4 h-4" />
        </button>

        {/* 3. 新建会话 */}
        <button
          onClick={onNew}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
          title="新建会话"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* 3. 任务看板 */}
        <button
          onClick={() => { onToggleTaskBoard(); }}
          className={cn(
            'p-2 rounded-lg transition-colors',
            taskBoardOpen ? 'text-cyan-400 bg-cyan-500/15' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
          )}
          title="任务看板"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>

        {/* 4. 运行监控 */}
        <button
          onClick={() => { onToggleMonitor(); }}
          className={cn(
            'p-2 rounded-lg transition-colors',
            monitorOpen ? 'text-cyan-400 bg-cyan-500/15' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
          )}
          title="运行监控"
        >
          <Activity className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
