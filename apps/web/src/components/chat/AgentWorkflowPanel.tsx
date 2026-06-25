/* Agent 团队工作过程面板 —— 按角色聚合展示，默认折叠 */
import { useMemo, useState, memo } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Briefcase,
  CheckCircle,
  Bug,
  Code,
  Cpu,
  FlaskConical,
  LayoutTemplate,
  Network,
  Paintbrush,
  PenTool,
  Search,
  BarChart3,
  Megaphone,
  Terminal,
  ShieldCheck,
  User,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { AgentWorkStatus } from '@owl-os/core';
import type { AgentTaskView, AgentDriverChunk, TeammateStatus } from '@owl-os/core';
import { useT } from '@/lib/i18n';
import { MarkdownText } from './MarkdownText';
import { CollapsiblePanel, ReasoningPanel, ToolLogPanel } from './message-parts';
import type { AgentOutput } from './useOwleryRuntime';

const AGENT_ICON: Record<string, LucideIcon> = {
  boss: Briefcase,
  planner: LayoutTemplate,
  supervisor: ShieldCheck,
  coordinator: Network,
  cto: Cpu,
  developer: Code,
  tester: FlaskConical,
  designer: Paintbrush,
  writer: PenTool,
  researcher: Search,
  analyst: BarChart3,
  marketer: Megaphone,
  operator: Terminal,
  reviewer: CheckCircle,
  debugger: Bug,
};

const DEFAULT_ICON = User;

function getAgentIcon(role: string, title: string): LucideIcon {
  return AGENT_ICON[title] ?? AGENT_ICON[role] ?? DEFAULT_ICON;
}

const AGENT_AVATAR_GRADIENT: Record<string, string> = {
  boss: 'from-blue-500 to-indigo-600',
  planner: 'from-emerald-500 to-teal-600',
  supervisor: 'from-violet-500 to-purple-600',
  coordinator: 'from-cyan-500 to-blue-600',
  cto: 'from-rose-500 to-pink-600',
  developer: 'from-amber-400 to-orange-500',
  tester: 'from-lime-500 to-green-600',
  designer: 'from-fuchsia-500 to-pink-600',
  writer: 'from-sky-400 to-blue-500',
  researcher: 'from-slate-400 to-slate-500',
  analyst: 'from-indigo-400 to-violet-500',
  marketer: 'from-red-400 to-rose-500',
  operator: 'from-teal-400 to-cyan-500',
  reviewer: 'from-emerald-400 to-teal-500',
  debugger: 'from-orange-400 to-red-500',
};

const DEFAULT_GRADIENT = 'from-slate-400 to-slate-500';

function getAgentGradient(role: string, title: string): string {
  return AGENT_AVATAR_GRADIENT[title] ?? AGENT_AVATAR_GRADIENT[role] ?? DEFAULT_GRADIENT;
}

function getAgentTitleLabel(t: ReturnType<typeof useT>, role: string, title: string): string {
  if (role === 'elder' || title === 'boss') return t('role.boss');
  return t(`role.${title}` as Parameters<typeof t>[0], title);
}

function isBossAgent(role: string, title: string): boolean {
  return role === 'elder' || title === 'boss';
}

const STATUS_PRIORITY: AgentWorkStatus[] = [
  AgentWorkStatus.NOT_STARTED,
  AgentWorkStatus.COMPLETED,
  AgentWorkStatus.CANCELLED,
  AgentWorkStatus.WAITING,
  AgentWorkStatus.IN_PROGRESS,
  AgentWorkStatus.FAILED,
];

function mergeStatus(a: AgentWorkStatus, b: AgentWorkStatus): AgentWorkStatus {
  const indexA = STATUS_PRIORITY.indexOf(a);
  const indexB = STATUS_PRIORITY.indexOf(b);
  return indexA >= indexB ? a : b;
}

function getAgentWorkStatus(agent: AgentOutput): AgentWorkStatus {
  if (agent.chunks.some((c) => c.type === 'error')) return AgentWorkStatus.FAILED;
  if (agent.chunks.some((c) => c.type === 'done')) return AgentWorkStatus.COMPLETED;
  if (agent.chunks.length > 0 || agent.statusText) return AgentWorkStatus.IN_PROGRESS;
  return AgentWorkStatus.NOT_STARTED;
}

function getGroupDisplayName(agents: AgentOutput[]): string {
  const names = Array.from(new Set(agents.map((a) => a.name).filter(Boolean)));
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  return `${names[0]} 等 ${names.length} 人`;
}

type RoleGroup = {
  key: string;
  role: string;
  title: string;
  isBoss: boolean;
  agents: AgentOutput[];
  chunks: AgentDriverChunk[];
  status: AgentWorkStatus;
  statusText: string;
};

/**
 * 按 title 对 agentOutputs 分组。
 * 同一个 title 可能对应多个 agentId（如多次招募同一角色），合并后只展示一张卡片。
 * 同时用 teamStatus 补充已注册但尚未产出 chunk 的角色，避免团队面板缺人。
 */
function groupAgentOutputsByTitle(
  agentOutputs: Record<string, AgentOutput>,
  teamStatus: TeammateStatus | null,
): RoleGroup[] {
  const groups = new Map<string, RoleGroup>();

  for (const agent of Object.values(agentOutputs)) {
    const key = agent.title || agent.role;
    const existing = groups.get(key);
    if (existing) {
      existing.agents.push(agent);
      existing.chunks.push(...agent.chunks);
      existing.status = mergeStatus(existing.status, getAgentWorkStatus(agent));
      if (agent.statusText) existing.statusText = agent.statusText;
    } else {
      groups.set(key, {
        key,
        role: agent.role,
        title: agent.title,
        isBoss: isBossAgent(agent.role, agent.title),
        agents: [agent],
        chunks: [...agent.chunks],
        status: getAgentWorkStatus(agent),
        statusText: agent.statusText,
      });
    }
  }

  if (teamStatus) {
    for (const agent of [teamStatus.leader, ...teamStatus.members]) {
      if (!agent) continue;
      const key = agent.title || agent.role;
      if (groups.has(key)) continue;
      groups.set(key, {
        key,
        role: agent.role,
        title: agent.title,
        isBoss: isBossAgent(agent.role, agent.title),
        agents: [{
          agentId: agent.agentId,
          name: agent.name,
          title: agent.title,
          role: agent.role,
          statusText: '',
          chunks: [],
        }],
        chunks: [],
        status: agent.status ?? AgentWorkStatus.NOT_STARTED,
        statusText: '',
      });
    }
  }

  return Array.from(groups.values());
}

const AgentCard = memo(function AgentCard({
  group,
  sessionId,
}: {
  group: RoleGroup;
  sessionId: string;
}) {
  const [open, setOpen] = useState(false);
  const text = useMemo(
    () => group.chunks.filter((c) => c.type === 'text_delta').map((c) => (c as { text: string }).text).join(''),
    [group.chunks],
  );
  const reasoning = useMemo(
    () => group.chunks.filter((c) => c.type === 'reasoning_delta').map((c) => (c as { text: string }).text).join(''),
    [group.chunks],
  );
  const tools = useMemo(
    () => {
      const events = group.chunks
        .filter((c) => c.type === 'tool_event')
        .map((c) => (c as { event: unknown }).event);
      // tool-call-utils 里的 mergeToolEvents 通过 ToolLogPanel 消费，这里直接透传
      return events;
    },
    [group.chunks],
  );
  const hasContent = text.trim() || reasoning.trim() || tools.length > 0;
  const t = useT();
  const status = group.status;
  const label = t(`status.${status}` as Parameters<typeof t>[0], group.statusText);
  const isWaiting = status === AgentWorkStatus.WAITING;
  const isFailed = status === AgentWorkStatus.FAILED;
  const isDone = status === AgentWorkStatus.COMPLETED;
  const isProcessing = status === AgentWorkStatus.IN_PROGRESS;
  const titleLabel = getAgentTitleLabel(t, group.role, group.title);
  const Icon = getAgentIcon(group.role, group.title);
  const gradient = getAgentGradient(group.role, group.title);
  const displayName = getGroupDisplayName(group.agents);

  return (
    <div className="relative mb-3 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-white shadow-md shadow-black/10`}>
          <Icon className="h-2.5 w-2.5" />
        </div>
        <div className="relative min-w-0 flex-1">
          <div
            className={`
              relative overflow-hidden rounded-xl px-4 py-3 transition-all duration-300
              ${isProcessing ? 'bg-yellow-400/5' : isFailed ? 'glass-l3 border-destructive/40' : isDone ? 'border border-border/60 bg-background/50' : 'border border-border/40 glass-l3 opacity-75'}
              ${hasContent ? 'cursor-pointer hover:shadow-md' : ''}
            `}
          >
            {isProcessing && (
              <svg className="absolute inset-0 h-full w-full overflow-visible rounded-xl pointer-events-none" preserveAspectRatio="none">
                <rect x="0" y="0" width="100%" height="100%" rx="12" fill="none" stroke="rgba(250,204,21,0.25)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                <rect x="0" y="0" width="100%" height="100%" rx="12" fill="none" stroke="#facc15" strokeWidth="2" vectorEffect="non-scaling-stroke">
                  <animate attributeName="stroke-dashoffset" from="1000" to="0" dur="3s" repeatCount="indefinite" />
                  <animate attributeName="stroke-dasharray" values="40 960;40 960" dur="3s" repeatCount="indefinite" />
                </rect>
              </svg>
            )}
            <button
              type="button"
              onClick={() => hasContent && setOpen((prev) => !prev)}
              className="relative flex w-full items-center gap-2 text-left"
            >
              <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                {titleLabel}{displayName ? `：${displayName}` : ''}
              </span>
              <div className="flex shrink-0 items-center gap-2">
                <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      isWaiting ? 'bg-blue-400' : isProcessing ? 'bg-yellow-400 animate-agent-dot-pulse' : isFailed ? 'bg-destructive' : isDone ? 'bg-green-500' : 'bg-muted-foreground'
                    }`}
                  />
                  <span className={isWaiting ? 'font-medium text-blue-400' : isProcessing ? 'font-medium text-yellow-400' : 'text-muted-foreground'}>
                    {label}
                  </span>
                </span>
                {hasContent ? (
                  open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <span className="h-4 w-4" aria-hidden="true" />
                )}
              </div>
            </button>
            {open && hasContent && (
              <div className="mt-3 break-words space-y-2 border-t border-border/40 pt-2">
                {reasoning.trim() && <ReasoningPanel text={reasoning} />}
                {tools.length > 0 && <ToolLogPanel tools={tools} sessionId={sessionId} />}
                {text.trim() && (
                  <div className="text-xs text-foreground">
                    <MarkdownText text={text} sessionId={sessionId} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

const TaskCard = memo(function TaskCard({ task, agent }: { task: AgentTaskView; agent?: AgentOutput }) {
  const t = useT();
  return (
    <div className="rounded-lg border border-border/40 bg-background/50 p-3">
      <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 text-cyan-500">{t('task.stage')} {task.stage}</span>
        <span>{t('task.requestedBy')}：{task.requestedBy}</span>
        <span>·</span>
        <span>{t('task.assignee')}：{agent ? `${getAgentTitleLabel(t, agent.role, agent.title)} ${agent.name}` : task.assigneeAgentId}</span>
      </div>
      <div className="text-sm text-foreground">
        <span className="font-medium">{t('task.content')}：</span>
        {task.instruction}
      </div>
    </div>
  );
});

const RoundPanel = memo(function RoundPanel({
  round,
  tasks,
  agentOutputs,
}: {
  round: number;
  tasks: AgentTaskView[];
  agentOutputs: Record<string, AgentOutput>;
}) {
  const roundTasks = useMemo(() => tasks.filter((t) => t.round === round).sort((a, b) => a.stage - b.stage), [tasks, round]);
  if (roundTasks.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-muted-foreground">轮次 {round}</div>
      {roundTasks.map((task) => (
        <TaskCard key={task.taskId} task={task} agent={agentOutputs[task.assigneeAgentId]} />
      ))}
    </div>
  );
});

export interface AgentWorkflowPanelProps {
  agentOutputs: Record<string, AgentOutput>;
  tasks: AgentTaskView[];
  rounds: number[];
  teamStatus: TeammateStatus | null;
  sessionId: string;
  teammateName?: string | null;
  hideIfOnlyBoss?: boolean;
}

export default function AgentWorkflowPanel({
  agentOutputs,
  tasks,
  rounds,
  teamStatus,
  sessionId,
  teammateName,
  hideIfOnlyBoss = true,
}: AgentWorkflowPanelProps) {
  const groups = useMemo(() => groupAgentOutputsByTitle(agentOutputs, teamStatus), [agentOutputs, teamStatus]);
  const bossGroup = groups.find((g) => g.isBoss);
  const memberGroups = groups.filter((g) => !g.isBoss);

  const onlyBossNoTeam = hideIfOnlyBoss && groups.length === 1 && bossGroup && memberGroups.length === 0 && tasks.length === 0 && rounds.length === 0;
  if (onlyBossNoTeam) return null;

  return (
    <div className="relative space-y-4">
      {bossGroup && (
        <AgentCard key={bossGroup.key} group={bossGroup} sessionId={sessionId} />
      )}
      {rounds.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-background/40 p-4">
          <div className="mb-3 border-l-[3px] border-amber-400 pl-2 text-sm font-medium text-foreground">
            任务流水线与轮次
          </div>
          <div className="space-y-4">
            {rounds.map((round) => (
              <RoundPanel key={round} round={round} tasks={tasks} agentOutputs={agentOutputs} />
            ))}
          </div>
        </div>
      )}
      {memberGroups.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-background/40 p-4">
          <div className="mb-3 border-l-[3px] border-cyan-400 pl-2 text-sm font-medium text-foreground">
            {teammateName ?? '执行团队'}
          </div>
          <div className="space-y-3">
            {memberGroups.map((group) => (
              <AgentCard key={group.key} group={group} sessionId={sessionId} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
