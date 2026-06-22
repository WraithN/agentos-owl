/* 单 Agent 对话界面 —— 基于 assistant-ui 与 Pi Agent IPC */
import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import {
  AssistantRuntimeProvider,
  MessagePrimitive,
  ThreadPrimitive,
} from '@assistant-ui/react';
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
} from 'lucide-react';
import type { AppMode, TeammateMode } from '@/types';
import { Button } from '@/components/ui/button';
import { MarkdownText } from './MarkdownText';
import { useOwleryRuntime } from './useOwleryRuntime';
import { ChatComposer } from './ChatComposer';
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
const TOOL_SUMMARY_MAX_LENGTH = 120;
const MESSAGE_WIDTH_CLASS = 'w-[min(92ch,84%)]';

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

function formatToolInput(value: unknown) {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return String(value ?? {});
  }
}

function formatToolOutput(value: unknown): string {
  if (value === undefined) return '暂无输出';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(formatToolOutput).filter(Boolean).join('\n');
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>;
    for (const key of ['text', 'content', 'output', 'stdout', 'stderr', 'message', 'error', 'result']) {
      if (key in record) return formatToolOutput(record[key]);
    }
    // 结构化的工具结果统一序列化，避免显示 [object Object]
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

function formatToolSummary(value: unknown, formatter: (value: unknown) => string) {
  const text = formatter(value).replace(/\s+/g, ' ').trim();
  if (text.length <= TOOL_SUMMARY_MAX_LENGTH) return text;
  return `${text.slice(0, TOOL_SUMMARY_MAX_LENGTH)}…`;
}

function formatToolDuration(tool: any) {
  if (typeof tool.durationMs === 'number') return `${tool.durationMs}ms`;
  if (typeof tool.startedAt === 'number' && typeof tool.endedAt === 'number') {
    return `${Math.max(0, tool.endedAt - tool.startedAt)}ms`;
  }
  if (typeof tool.startedAt === 'number') return '进行中';
  return '—';
}

function getToolStatus(tool: any) {
  if (tool.isError) return { label: '执行报错', dot: 'bg-destructive' };
  if (tool.result === undefined) return { label: '执行中', dot: 'bg-amber-400' };
  return { label: '完成', dot: 'bg-emerald-400' };
}

function ToolCallCard({ tool }: { tool: any }) {
  const [open, setOpen] = useState(false);
  const status = getToolStatus(tool);
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
            <span className="shrink-0 text-muted-foreground">{formatToolDuration(tool)}</span>
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

function getToolKey(tool: any, index: number) {
  return `${tool.toolCallId ?? tool.toolName ?? 'tool'}:${index}`;
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

function MessageContent({ message, onEdit, onRegenerate, hideActions = false }: { message: any; onEdit: (text: string) => void; onRegenerate: (messageId: string) => void; hideActions?: boolean }) {
  const [copied, setCopied] = useState(false);
  const mainText = getMainText(message);
  const reasoningText = getReasoningText(message);
  const toolParts = getToolParts(message);
  const imageParts = getImageParts(message);
  const assistantState = getAssistantState(message);
  const isAssistantRunning = message.role !== 'user' && assistantState === 'running';
  const isEmptyAssistant = message.role !== 'user' && !mainText.trim() && imageParts.length === 0 && toolParts.length === 0 && !reasoningText.trim();
  const isThinking = isAssistantRunning && isEmptyAssistant;
  const isEmptyComplete = assistantState === 'complete' && isEmptyAssistant;
  const isEmptyError = assistantState !== 'running' && assistantState !== 'complete' && isEmptyAssistant;
  const hasMainContent = message.role === 'user' || mainText.trim() || imageParts.length > 0 || isThinking || isEmptyComplete || isEmptyError;

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(mainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [mainText]);

  return (
    <div className={`group relative min-w-0 ${MESSAGE_WIDTH_CLASS}`}>
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
              : 'bg-muted text-foreground'
          }`}
        >
          {isThinking ? (
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              正在思考…
            </span>
          ) : isEmptyComplete ? (
            <span className="text-muted-foreground">已生成完成（无内容）</span>
          ) : isEmptyError ? (
            <span className="inline-flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
              {assistantState === 'cancelled' ? '已停止生成，无有效内容' : '生成中断，无有效内容'}
            </span>
          ) : (
            <>
              <MarkdownText text={mainText} />
              <ImageBlocks images={imageParts} />
            </>
          )}
        </div>
      )}

      {message.role !== 'user' && hasMainContent && <AssistantStateActions state={assistantState} />}

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
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>复制</TooltipContent>
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

function ChatMessages({ onEditMessage, onRegenerate, messages }: { onEditMessage: (text: string) => void; onRegenerate: (messageId: string) => void; messages: any[] }) {
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

          <MessageContent message={message} onEdit={onEditMessage} onRegenerate={onRegenerate} />

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
  const { runtime, conversationTitle, messages, isRunning, regenerateFromMessage } = useOwleryRuntime(
    conversationId,
    mode,
    teammateMode,
    selectedTeam,
  );
  const [editText, setEditText] = useState('');
  const [isFollowingLatest, setIsFollowingLatest] = useState(true);
  const viewportRef = useRef<HTMLDivElement>(null);

  // 标题变化时通知外层
  useEffect(() => {
    onTitleChange?.(conversationTitle);
  }, [conversationTitle, onTitleChange]);

  useEffect(() => {
    setIsFollowingLatest(true);
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

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadPrimitive.Root className="relative h-full flex flex-col overflow-hidden">
        {/* 消息滚动区 */}
        <ThreadPrimitive.Viewport
          ref={viewportRef}
          onScroll={handleViewportScroll}
          className="flex-1 overflow-y-auto px-16 py-8 space-y-6"
        >
          <ChatMessages onEditMessage={handleEditMessage} onRegenerate={regenerateFromMessage} messages={messages} />

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
          onTeamChange={setSelectedTeam}
        />
      </ThreadPrimitive.Root>
    </AssistantRuntimeProvider>
  );
}
