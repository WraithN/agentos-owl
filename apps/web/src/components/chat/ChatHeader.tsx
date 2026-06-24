/* Chat 标题栏 */
import { useEffect, useState, type ReactNode } from 'react';
import { LayoutGrid, Plus, Bot, Activity, History } from 'lucide-react';
import { AgentWorkStatus } from '@owl-os/core';
import type { TeammateAgentStatus, TeammateStatus } from '@owl-os/core';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getTeammateStatus, onAgentStatus } from '@/services/electron';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';

const OWLERY_STATUS_EVENT = 'owlery:teammate-status';

const STATUS_META: Record<AgentWorkStatus, { className: string }> = {
  [AgentWorkStatus.NOT_STARTED]: { className: 'bg-slate-500' },
  [AgentWorkStatus.IN_PROGRESS]: { className: 'bg-amber-400' },
  [AgentWorkStatus.WAITING]:     { className: 'bg-blue-400' },
  [AgentWorkStatus.COMPLETED]:   { className: 'bg-emerald-400' },
  [AgentWorkStatus.FAILED]:      { className: 'bg-destructive' },
  [AgentWorkStatus.CANCELLED]:   { className: 'bg-slate-400' },
};

function AgentStatusRow({ agent }: { agent: TeammateAgentStatus }) {
  const t = useT();
  const meta = STATUS_META[agent.status];
  const isInProgress = agent.status === AgentWorkStatus.IN_PROGRESS;
  return (
    <div
      className={cn(
        'relative flex items-center justify-between gap-2 rounded-lg border bg-muted/20 p-2 text-xs',
        isInProgress
          ? 'border-green-400/40 shadow-[0_0_12px_rgba(34,197,94,0.15)] animate-agent-border-glow'
          : 'border-border/50'
      )}
    >
      <div className="min-w-0">
        <div className="truncate text-foreground">
          {t('common.role')}：{t(`role.${agent.title}` as Parameters<ReturnType<typeof useT>>[0], agent.title)}，{t('common.name')}：{agent.name}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
        <span className={cn('h-2 w-2 rounded-full', meta.className)} />
        <span className={isInProgress ? 'font-medium text-green-500' : undefined}>{t(`status.${agent.status}` as Parameters<ReturnType<typeof useT>>[0])}</span>
      </div>
    </div>
  );
}

function StatusGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="border-l-2 border-cyan-400 pl-2 text-[11px] font-medium text-muted-foreground">{title}</div>
      {children}
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
  const t = useT();
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
              title={t('agent.title')}
            >
              <Bot className="w-4 h-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 border-border/60 bg-background/95 p-3">
            <div className="mb-2 text-sm font-medium text-foreground">{t('agent.title')}</div>
            {!teammateStatus ? (
              <div className="rounded-lg border border-dashed border-border/50 p-3 text-xs text-muted-foreground">{t('common.empty')}</div>
            ) : (
              <div className="grid gap-3">
                {teammateStatus.leader && (
                  <StatusGroup title={t('role.boss')}>
                    <AgentStatusRow agent={teammateStatus.leader} />
                  </StatusGroup>
                )}
                <StatusGroup title={teammateStatus.teammateName || t('common.empty')}>
                  {teammateStatus.members.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border/50 p-2 text-xs text-muted-foreground">{t('common.empty')}</div>
                  ) : (
                    teammateStatus.members.map((agent) => <AgentStatusRow key={agent.agentId} agent={agent} />)
                  )}
                </StatusGroup>
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
