/* 单 Agent 对话界面 —— 基于 assistant-ui 与 Pi Agent IPC */
import { useState, useRef, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';
import {
  AssistantRuntimeProvider,
  MessagePrimitive,
  ThreadPrimitive,
} from '@assistant-ui/react';
import type { LucideIcon } from 'lucide-react';
import {
  Bot,
  User,
  Copy,
  Edit,
  Check,
  ArrowDown,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  AlertTriangle,
  Loader2,
  Image as ImageIcon,
  Briefcase,
  LayoutTemplate,
  ShieldCheck,
  Network,
  Cpu,
  Code,
  FlaskConical,
  Paintbrush,
  PenTool,
  Search,
  BarChart3,
  Megaphone,
  Terminal,
  CheckCircle,
  Bug,
} from 'lucide-react';
import type { AppMode, TeammateMode } from '@/types';
import type { TeammateStatus } from '@owl-os/core';
import { Button } from '@/components/ui/button';
import { MarkdownText } from './MarkdownText';
import { useOwleryRuntime, type AgentOutput } from './useOwleryRuntime';
import { ChatComposer } from './ChatComposer';
import { extractGeneratedDocxPaths } from './file-result-utils';
import { FileResultCards } from './FileResultCards';
import {
  formatToolDuration,
  formatToolInput,
  formatToolOutput,
  formatToolSummary,
  formatToolTime,
  getToolKey,
  getToolStatus,
  mergeToolEvents,
} from './tool-call-utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface SingleAgentChatProps {
  conversationId: string;
  mode?: AppMode;
  /** Teammate 协作模式；squad/auto 模式下由前端指定（已废弃，优先使用 teamTemplateId） */
  teammateMode?: TeammateMode;
  /** 用户手动选择的团队模板 ID */
  teamTemplateId?: string;
  agentId?: string;
  /** 会话标题回调 */
  onTitleChange?: (title: string) => void;
}

const BOTTOM_DISTANCE_THRESHOLD = 96;
const MESSAGE_WIDTH_CLASS = 'w-[min(92ch,84%)]';

interface WorkflowContextValue {
  agentOutputs: Record<string, AgentOutput>;
  isRunning: boolean;
  teamStatus: TeammateStatus | null;
}

const WorkflowContext = createContext<WorkflowContextValue>({ agentOutputs: {}, isRunning: false, teamStatus: null });

const OWLERY_STATUS_EVENT = 'owlery:teammate-status';

function useWorkflowContext(): WorkflowContextValue {
  return useContext(WorkflowContext);
}

const AGENT_TITLE_LABEL: Record<string, string> = {
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

function getAgentTitleLabel(role: string, title: string): string {
  if (role === 'elder' || title === 'boss') return '老板';
  return AGENT_TITLE_LABEL[title] ?? title;
}

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

function getMessageParts(message: any) {
  return Array.isArray(message.content) ? message.content : [{ type: 'text', text: message.content ?? '' }];
}

function getMainText(message: any) {
  return getMessageParts(message)
    .filter((part: any) => part.type === 'text')
    .map((part: any) => part.text ?? '')
    .join('');
}

function getReasoningText(message: any) {
  return getMessageParts(message)
    .filter((part: any) => part.type === 'reasoning')
    .map((part: any) => part.text ?? '')
    .join('');
}

function getToolParts(message: any) {
  return getMessageParts(message).filter((part: any) => part.type === 'tool-call');
}

function getImageParts(message: any) {
  return getMessageParts(message).filter((part: any) => part.type === 'image');
}

function getAssistantState(message: any) {
  if (message.status?.type === 'running') return 'running';
  if (message.status?.type === 'incomplete') return message.status.reason === 'cancelled' ? 'cancelled' : 'error';
  if (message.status?.type === 'complete') return 'complete';
  return 'complete';
}

function CollapsiblePanel({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-border/50 bg-background/35 text-xs text-muted-foreground">
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen(prev => !prev)}
        className="h-9 w-full justify-start gap-2 rounded-xl px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        {title}
      </Button>
      {open && <div className="border-t border-border/40 px-3 py-2">{children}</div>}
    </div>
  );
}

function ReasoningPanel({ text }: { text: string }) {
  if (!text.trim()) return null;
  return (
    <CollapsiblePanel title="AI思考推理">
      <div className="whitespace-pre-wrap leading-relaxed">{text}</div>
    </CollapsiblePanel>
  );
}

function ToolCallCard({ tool }: { tool: any }) {
  const [open, setOpen] = useState(false);
  const status = getToolStatus(tool);
  const duration = formatToolDuration(tool);
  const time = formatToolTime(tool);
  const inputValue = tool.args ?? {};
  const inputText = tool.argsText ?? formatToolInput(inputValue);
  const outputText = formatToolOutput(tool.result);
  const inputSummary = formatToolSummary(inputValue, formatToolInput);
  const outputSummary = formatToolSummary(tool.result, formatToolOutput);

  return (
    <div className="w-full rounded-lg border border-border/40 bg-muted/30 font-mono text-[11px]">
      <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] items-center gap-2 border-b border-border/40 p-2">
        <div className="grid min-w-0 gap-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${status.dot}`} />
            <span className="truncate font-medium text-foreground">{tool.toolName ?? '未知工具'}</span>
            <span className="shrink-0 text-muted-foreground">{status.label}</span>
            {duration && <span className="shrink-0 text-muted-foreground">{duration}</span>}
            {time && <span className="shrink-0 text-muted-foreground">{time}</span>}
          </div>
          <div className="truncate text-muted-foreground">输入：{inputSummary}</div>
          <div className="truncate text-muted-foreground">输出：{outputSummary}</div>
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setOpen(prev => !prev)}
          className="h-7 w-[5.5rem] justify-center gap-1 rounded-md px-2 font-mono text-[11px] text-muted-foreground hover:text-foreground"
        >
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {open ? '关闭' : '展开'}
        </Button>
      </div>
      {open && (
        <div className="grid gap-2 p-2">
          <div>
            <div className="mb-1 text-[10px] text-muted-foreground">输入</div>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded bg-background/60 p-2 text-[11px] text-foreground">{inputText}</pre>
          </div>
          <div>
            <div className="mb-1 text-[10px] text-muted-foreground">输出</div>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-background/60 p-2 text-[11px] text-foreground">{outputText}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

function ToolLogPanel({ tools }: { tools: any[] }) {
  if (tools.length === 0) return null;
  return (
    <div className="grid w-full gap-1">
      {tools.map((tool, index) => <ToolCallCard key={getToolKey(tool, index)} tool={tool} />)}
    </div>
  );
}

function ImageBlocks({ images }: { images: any[] }) {
  if (images.length === 0) return null;
  return (
    <div className="mt-3 grid gap-2">
      {images.map((image, index) => image.image ? (
        <img key={index} src={image.image} alt="AI 生成图片" className="max-h-80 rounded-xl border border-border/60 object-contain" />
      ) : (
        <div key={index} className="flex h-32 items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-background/40 text-xs text-muted-foreground">
          <ImageIcon className="h-4 w-4" />
          正在生成图片…
        </div>
      ))}
    </div>
  );
}

function AssistantStateActions({ state }: { state: string }) {
  if (state === 'running') {
    return <div className="mt-2 text-[11px] text-muted-foreground">正在生成中，可随时停止并保留已输出内容。</div>;
  }
  if (state === 'complete') return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
      <span className="mr-1 inline-flex items-center gap-1 text-destructive">
        <AlertTriangle className="h-3.5 w-3.5" />
        {state === 'cancelled' ? '已停止生成，内容已保留' : '生成中断，内容已保留'}
      </span>
    </div>
  );
}

function MessageContent({
  message,
  sessionId,
  onEdit,
  onRegenerate,
  hideActions = false,
  showWorkflow = false,
}: {
  message: any;
  sessionId: string;
  onEdit: (text: string) => void;
  onRegenerate: (messageId: string) => void;
  hideActions?: boolean;
  showWorkflow?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const { agentOutputs, isRunning, teamStatus } = useWorkflowContext();
  const mainText = getMainText(message);
  const reasoningText = getReasoningText(message);
  const toolParts = getToolParts(message);
  const imageParts = getImageParts(message);
  const assistantState = getAssistantState(message);
  const isAssistantRunning = message.role !== 'user' && assistantState === 'running';
  const isEmptyAssistant = message.role !== 'user' && !mainText.trim() && imageParts.length === 0 && toolParts.length === 0 && !reasoningText.trim();
  const isEmptyComplete = assistantState === 'complete' && isEmptyAssistant;
  const isEmptyError = assistantState !== 'running' && assistantState !== 'complete' && isEmptyAssistant;
  const hasMainContent = message.role === 'user' || mainText.trim() || imageParts.length > 0 || isEmptyComplete || isEmptyError;
  const showWorkflowPanel = showWorkflow && Object.keys(agentOutputs).length > 0;
  const showThinking = showWorkflow && isAssistantRunning && isRunning;

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(mainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [mainText]);

  return (
    <div className={`group relative min-w-0 ${MESSAGE_WIDTH_CLASS}`}>
      {showThinking && <ThinkingIndicator />}
      {showWorkflowPanel && <WorkflowPanel agentOutputs={agentOutputs} teamStatus={teamStatus} sessionId={sessionId} />}

      {message.role !== 'user' && (reasoningText.trim() || toolParts.length > 0) && (
        <div className="my-1 space-y-1 py-1">
          <ReasoningPanel text={reasoningText} />
          <ToolLogPanel tools={toolParts} />
        </div>
      )}

      {hasMainContent && (
        <div
          className={`rounded-2xl px-4 py-2.5 text-base break-words [overflow-wrap:anywhere] ${
            message.role === 'user'
              ? 'bg-primary text-primary-foreground'
              : `bg-muted text-foreground ${isAssistantRunning ? 'border-marquee-yellow' : ''}`
          }`}
        >
          {isEmptyComplete ? (
            <span className="text-muted-foreground">已生成完成（无内容）</span>
          ) : isEmptyError ? (
            <span className="inline-flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
              {assistantState === 'cancelled' ? '已停止生成，无有效内容' : '生成中断，无有效内容'}
            </span>
          ) : (
            <>
              <MarkdownText text={mainText} sessionId={sessionId} />
              <ImageBlocks images={imageParts} />
            </>
          )}
        </div>
      )}

      {message.role !== 'user' && hasMainContent && <AssistantStateActions state={assistantState} />}

      {message.role !== 'user' && assistantState === 'complete' && (
        <FileResultCards sessionId={sessionId} filePaths={extractGeneratedDocxPaths(message)} />
      )}

      {!hideActions && hasMainContent && (
        <div className={`message-actions flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          {message.role !== 'user' && assistantState !== 'running' && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onRegenerate(message.id)}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{assistantState === 'complete' ? '重新生成' : '重试/续流'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={copyToClipboard}
                  disabled={assistantState === 'running'}
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{assistantState === 'running' ? '生成中，暂不可复制' : '复制'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {message.role === 'user' && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onEdit(mainText)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>编辑</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}
    </div>
  );
}

type AgentWorkStatusType = 'not_started' | 'in_progress' | 'waiting' | 'completed' | 'failed' | 'cancelled';

const WORK_STATUS_LABEL: Record<AgentWorkStatusType, string> = {
  not_started: '未开始',
  in_progress: '进行中',
  waiting: '等待中',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消',
};

interface MemberStatusLike {
  status: AgentWorkStatusType;
}

function getAgentWorkStatus(
  agent: AgentOutput,
  memberStatus?: MemberStatusLike
): { status: AgentWorkStatusType; label: string } {
  if (memberStatus) {
    return { status: memberStatus.status, label: WORK_STATUS_LABEL[memberStatus.status] };
  }
  if (agent.chunks.some((c) => c.type === 'error')) return { status: 'failed', label: '失败' };
  if (agent.chunks.some((c) => c.type === 'done')) return { status: 'completed', label: '已完成' };
  // 状态文本已明确为“已完成”时直接视为完成（异常关闭后 teamStatus 丢失、done chunk 尚未持久化的兜底）
  if (agent.statusText === '已完成') return { status: 'completed', label: '已完成' };
  if (agent.chunks.length > 0 || agent.statusText) return { status: 'in_progress', label: agent.statusText || '进行中' };
  return { status: 'not_started', label: '未开始' };
}

function AgentCard({
  agent,
  sessionId,
  memberStatus,
  variant = 'member',
}: {
  agent: AgentOutput;
  sessionId: string;
  memberStatus?: MemberStatusLike;
  variant?: 'boss' | 'member';
}) {
  const [open, setOpen] = useState(false);
  const text = agent.chunks.filter((c) => c.type === 'text_delta').map((c) => (c as { text: string }).text).join('');
  const reasoning = agent.chunks.filter((c) => c.type === 'reasoning_delta').map((c) => (c as { text: string }).text).join('');
  const tools = mergeToolEvents(agent.chunks.filter((c) => c.type === 'tool_event').map((c) => (c as { event: unknown }).event));
  const hasContent = text.trim() || reasoning.trim() || tools.length > 0;
  const { status, label } = getAgentWorkStatus(agent, memberStatus);
  const isFailed = status === 'failed';
  const isDone = status === 'completed';
  const isProcessing = status === 'in_progress';
  const isNotStarted = status === 'not_started';
  const titleLabel = getAgentTitleLabel(agent.role, agent.title);
  const Icon = getAgentIcon(agent.role, agent.title);
  const gradient = getAgentGradient(agent.role, agent.title);
  const isBoss = variant === 'boss';

  return (
    <div className="relative mb-3 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-white shadow-md shadow-black/10`}>
          <Icon className="h-2.5 w-2.5" />
        </div>
        <div className="relative flex-1">
          <div
            className={`
              relative rounded-xl px-4 py-3 transition-all duration-300
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
            className="relative flex w-full items-center justify-between gap-2 text-left"
          >
            <div className="relative flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">{titleLabel}：{agent.name}</span>
              <span className="flex items-center gap-1.5 text-sm">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    isProcessing ? 'bg-yellow-400 animate-agent-dot-pulse' : isFailed ? 'bg-destructive' : isDone ? 'bg-green-500' : 'bg-muted-foreground'
                  }`}
                />
                <span className={isProcessing ? 'font-medium text-yellow-400' : 'text-muted-foreground'}>{label}</span>
              </span>
            </div>
            {hasContent && (open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />)}
          </button>
          {open && hasContent && (
            <div className="mt-3 space-y-2 border-t border-border/40 pt-2">
              {reasoning.trim() && <ReasoningPanel text={reasoning} />}
              {tools.length > 0 && <ToolLogPanel tools={tools} />}
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
}

function WorkflowPanel({
  agentOutputs,
  teamStatus,
  sessionId,
}: {
  agentOutputs: Record<string, AgentOutput>;
  teamStatus: TeammateStatus | null;
  sessionId: string;
}) {
  // 用 teamStatus 中已注册但未产生任何 chunk/status_card 的成员补充 agentOutputs，
  // 避免「智能体团队」弹窗里有、会话卡片里缺的角色（如研究员）。
  const mergedOutputs: Record<string, AgentOutput> = { ...agentOutputs };
  if (teamStatus) {
    for (const agent of [teamStatus.leader, ...teamStatus.members]) {
      if (!agent || mergedOutputs[agent.agentId]) continue;
      mergedOutputs[agent.agentId] = {
        agentId: agent.agentId,
        name: agent.name,
        title: agent.title,
        role: agent.role,
        statusText: '',
        chunks: [],
      };
    }
  }

  if (Object.keys(mergedOutputs).length === 0) return null;
  const entries = Object.values(mergedOutputs);
  const isBoss = (agent: AgentOutput) => agent.role === 'elder' || agent.title === 'boss';
  const boss = entries.find(isBoss);
  const members = entries.filter((agent) => !isBoss(agent));
  const memberStatusById = new Map(teamStatus?.members.map((member) => [member.agentId, member]));

  return (
    <div className="relative mb-3 space-y-4">
      {boss && (
        <AgentCard
          key={boss.agentId}
          agent={boss}
          memberStatus={teamStatus?.leader}
          sessionId={sessionId}
          variant="boss"
        />
      )}
      {members.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-background/40 p-4">
          <div className="mb-3 border-l-[3px] border-cyan-400 pl-2 text-sm font-medium text-foreground">
            {teamStatus?.teammateName ?? '执行团队'}
          </div>
          <div className="space-y-3">
            {members.map((agent) => (
              <AgentCard
                key={agent.agentId}
                agent={agent}
                memberStatus={memberStatusById.get(agent.agentId)}
                sessionId={sessionId}
                variant="member"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="sticky top-0 z-10 relative pl-16 mb-3 animate-fade-in">
      <div className="absolute left-5 top-0 flex h-7 w-7 items-center justify-center rounded-full bg-slate-200/80 text-slate-500 dark:bg-slate-700/80">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      </div>
      <div className="glass-l3 rounded-xl px-4 py-3">
        <div className="flex items-center gap-3 text-muted-foreground">
          <span className="flex gap-1">
            <span className="h-2 w-2 rounded-full bg-muted-foreground animate-thinking-1" />
            <span className="h-2 w-2 rounded-full bg-muted-foreground animate-thinking-2" />
            <span className="h-2 w-2 rounded-full bg-muted-foreground animate-thinking-3" />
          </span>
          <span className="text-sm">正在思考中…</span>
        </div>
      </div>
    </div>
  );
}

function ChatMessages({
  sessionId,
  onEditMessage,
  onRegenerate,
  messages,
}: {
  sessionId: string;
  onEditMessage: (text: string) => void;
  onRegenerate: (messageId: string) => void;
  messages: any[];
}) {
  const lastAssistantId = messages.filter((m) => m.role !== 'user').pop()?.id;
  return (
    <ThreadPrimitive.Messages>
      {({ message }) => (
        <MessagePrimitive.Root
          className={`${message.role === 'user' ? 'user-message-row' : 'ai-message-row'} flex gap-3 ${message.role === 'user' ? 'justify-end mb-4' : 'justify-start mb-0 py-1'}`}
        >
          {message.role !== 'user' && (
            <div className="relative flex w-12 shrink-0 self-stretch">
              <div className="ai-avatar mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 text-white shadow-[0_0_16px_rgba(34,211,238,0.28)]">
                <Bot className="h-4 w-4" />
              </div>
              <div className="relative ml-2 flex flex-1 justify-center">
                <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-slate-400/25" />
                <div className="relative mt-3 flex h-3 w-3 items-center justify-center rounded-full border border-cyan-400/50 bg-background shadow-[0_0_12px_rgba(34,211,238,0.35)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
                </div>
              </div>
            </div>
          )}

          <MessageContent
            message={message}
            sessionId={sessionId}
            onEdit={onEditMessage}
            onRegenerate={onRegenerate}
            showWorkflow={message.id === lastAssistantId}
          />

          {message.role === 'user' && (
            <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-primary text-primary-foreground">
              <User className="h-4 w-4" />
            </div>
          )}
        </MessagePrimitive.Root>
      )}
    </ThreadPrimitive.Messages>
  );
}

export default function SingleAgentChat({
  conversationId,
  mode = 'chat',
  teammateMode,
  teamTemplateId,
  agentId,
  onTitleChange,
}: SingleAgentChatProps) {
  const [selectedTeam, setSelectedTeam] = useState<string | undefined>(teamTemplateId);
  const { runtime, conversationTitle, messages, isRunning, regenerateFromMessage, agentOutputs } = useOwleryRuntime(
    conversationId,
    mode,
    teammateMode,
    selectedTeam,
  );
  const [editText, setEditText] = useState('');
  const [isFollowingLatest, setIsFollowingLatest] = useState(true);
  const [teamStatus, setTeamStatus] = useState<TeammateStatus | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // 标题变化时通知外层
  useEffect(() => {
    onTitleChange?.(conversationTitle);
  }, [conversationTitle, onTitleChange]);

  useEffect(() => {
    setIsFollowingLatest(true);
    setTeamStatus(null);
  }, [conversationId]);

  useEffect(() => {
    if (!isFollowingLatest) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior: isRunning ? 'auto' : 'smooth' });
  }, [messages, isRunning, isFollowingLatest]);

  const handleViewportScroll = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const distanceToBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    setIsFollowingLatest(distanceToBottom <= BOTTOM_DISTANCE_THRESHOLD);
  }, []);

  const handleBackToLatest = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    setIsFollowingLatest(true);
    viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
  }, []);

  const handleEditMessage = useCallback((text: string) => {
    setEditText(text);
  }, []);

  // 监听运行时推送的团队状态，用于展示团队名称与成员工作状态
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail as { sessionId: string; status: TeammateStatus } | undefined;
      if (detail?.sessionId === conversationId) {
        setTeamStatus(detail.status);
      }
    };
    window.addEventListener(OWLERY_STATUS_EVENT, handler);
    return () => window.removeEventListener(OWLERY_STATUS_EVENT, handler);
  }, [conversationId]);

  // 新会话开始时清空上一轮的团队状态
  useEffect(() => {
    if (isRunning) setTeamStatus(null);
  }, [isRunning]);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadPrimitive.Root className="relative h-full flex flex-col overflow-hidden">
        {/* 消息滚动区 */}
        <ThreadPrimitive.Viewport
          ref={viewportRef}
          onScroll={handleViewportScroll}
          className="flex-1 overflow-y-auto px-16 py-8 space-y-6"
        >
          <WorkflowContext.Provider value={{ agentOutputs, isRunning, teamStatus }}>
            <ChatMessages
              sessionId={conversationId}
              onEditMessage={handleEditMessage}
              onRegenerate={regenerateFromMessage}
              messages={messages}
            />
          </WorkflowContext.Provider>

          <ThreadPrimitive.Empty>
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-cyan-400" />
              </div>
              <p className="text-base font-medium mb-2">开始与 Agent 对话</p>
              <p className="text-xs opacity-60">支持技能选择、命令、智能体团队协作</p>
              {agentId && <p className="text-xs mt-1 opacity-40">Agent ID: {agentId}</p>}
            </div>
          </ThreadPrimitive.Empty>
        </ThreadPrimitive.Viewport>

        {!isFollowingLatest && (
          <Button
            type="button"
            onClick={handleBackToLatest}
            className="absolute bottom-24 left-1/2 z-20 h-9 -translate-x-1/2 gap-1.5 rounded-full px-3 text-xs font-medium shadow-lg"
          >
            <ArrowDown className="h-3.5 w-3.5" />
            回到最新
          </Button>
        )}

        {/* 输入区 */}
        <ChatComposer
          initialText={editText}
          isRunning={isRunning}
          selectedTeam={selectedTeam}
          sessionId={conversationId}
          onTeamChange={setSelectedTeam}
        />
      </ThreadPrimitive.Root>
    </AssistantRuntimeProvider>
  );
}
