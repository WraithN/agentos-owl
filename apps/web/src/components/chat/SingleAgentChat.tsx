/* 单 Agent 对话界面 —— 基于 assistant-ui 与 Pi Agent IPC */
import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from '@assistant-ui/react';
import {
  Send,
  Bot,
  User,
  Copy,
  Edit,
  Check,
  Paperclip,
  Mic,
  Command,
  Sparkles,
  Users,
  X,
  ArrowDown,
  ChevronDown,
  ChevronRight,
  Square,
  RotateCcw,
  AlertTriangle,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import type { TeammateMode } from '@/types';
import { Button } from '@/components/ui/button';
import { MarkdownText } from './MarkdownText';
import { useOwleryRuntime } from './useOwleryRuntime';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface SingleAgentChatProps {
  conversationId: string;
  mode?: 'single' | 'squad' | 'auto';
  /** Teammate 协作模式； squad/auto 模式下由前端指定 */
  teammateMode?: TeammateMode;
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
  if (typeof tool.startedAt === 'number') return `${Date.now() - tool.startedAt}ms`;
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
  const hasMainContent = message.role === 'user' || mainText.trim() || imageParts.length > 0;

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(mainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [mainText]);

  return (
    <div className={`group relative min-w-0 ${MESSAGE_WIDTH_CLASS}`}>
      {hasMainContent && (
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm break-words [overflow-wrap:anywhere] ${
            message.role === 'user'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground'
          }`}
        >
          <MarkdownText text={mainText} />
          <ImageBlocks images={imageParts} />
        </div>
      )}

      {message.role !== 'user' && hasMainContent && <AssistantStateActions state={assistantState} />}

      {message.role !== 'user' && (reasoningText.trim() || toolParts.length > 0) && (
        <div className="my-1 space-y-1 py-1">
          <ReasoningPanel text={reasoningText} />
          <ToolLogPanel tools={toolParts} />
        </div>
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

function WaitingAssistantMessage() {
  return (
    <div className="ai-message-row flex justify-start gap-3 py-1">
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
      <div className="max-w-[min(92ch,84%)] rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          正在思考…
        </span>
      </div>
    </div>
  );
}

function ChatMessages({ onEditMessage, onRegenerate, messages, isRunning }: { onEditMessage: (text: string) => void; onRegenerate: (messageId: string) => void; messages: any[]; isRunning: boolean }) {
  const showWaiting = isRunning && messages.length > 0 && !messages.some((message) => message.role === 'assistant' && message.status?.type === 'running');

  return (
    <>
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
    {showWaiting && <WaitingAssistantMessage />}
    </>
  );
}

function ChatComposer({ initialText = '', isRunning = false }: { initialText?: string; isRunning?: boolean }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (initialText && inputRef.current) {
      inputRef.current.value = initialText;
      inputRef.current.focus();
    }
  }, [initialText]);

  const skills = [
    { id: 'coding', name: '代码助手', icon: '💻' },
    { id: 'writing', name: '写作助手', icon: '✍️' },
    { id: 'analysis', name: '数据分析', icon: '📊' },
    { id: 'translation', name: '翻译助手', icon: '🌐' },
  ];

  const commands = [
    { id: 'explain', name: '解释代码', description: '详细解释选中的代码' },
    { id: 'refactor', name: '重构代码', description: '优化代码结构和可读性' },
    { id: 'test', name: '生成测试', description: '为代码生成单元测试' },
    { id: 'doc', name: '生成文档', description: '生成代码注释和文档' },
  ];

  const teams = [
    { id: 'dev-team', name: '开发团队', members: ['架构师', '程序员', '测试员'] },
    { id: 'product-team', name: '产品团队', members: ['产品经理', '设计师', '运营'] },
    { id: 'research-team', name: '研究团队', members: ['研究员', '分析师', '专家'] },
  ];

  return (
    <ComposerPrimitive.Root className="shrink-0 border-t border-border/50 p-3 glass-l1">
      {/* Selected File Preview */}
      {selectedFile && (
        <div className="mb-3 flex items-center gap-2 p-2 rounded-lg bg-background/50 border border-border/50">
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm flex-1 truncate">{selectedFile.name}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setSelectedFile(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <input
        id="file-upload"
        type="file"
        className="hidden"
        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
      />

      {/* Input Row */}
      <div className="flex items-end gap-2">
        {/* Text Input */}
        <div className="relative flex-1">
          <ComposerPrimitive.Input
            ref={inputRef}
            className="min-h-[72px] max-h-[160px] w-full resize-none rounded-xl border border-input bg-background px-3 pb-10 pr-12 pt-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="输入消息，按 Enter 发送，Shift+Enter 换行…"
            rows={2}
            submitMode="enter"
          />
          <div className="absolute bottom-1.5 left-2 flex items-center gap-1">
            <Button
              variant={isRecording ? 'destructive' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsRecording(!isRecording)}
            >
              <Mic className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <Paperclip className="h-3.5 w-3.5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Command className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {commands.map((cmd) => (
                  <DropdownMenuItem
                    key={cmd.id}
                    onClick={() => {
                      if (inputRef.current) {
                        inputRef.current.value = `${cmd.name}：${inputRef.current.value}`;
                        inputRef.current.focus();
                      }
                    }}
                  >
                    {cmd.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Sparkles className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {skills.map((skill) => (
                  <DropdownMenuItem
                    key={skill.id}
                    onClick={() => {
                      if (inputRef.current) {
                        inputRef.current.value = `使用「${skill.name}」技能：${inputRef.current.value}`;
                        inputRef.current.focus();
                      }
                    }}
                  >
                    {skill.icon} {skill.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Users className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {teams.map((team) => (
                  <DropdownMenuItem
                    key={team.id}
                    onClick={() => {
                      if (inputRef.current) {
                        inputRef.current.value = `调用「${team.name}」：${inputRef.current.value}`;
                        inputRef.current.focus();
                      }
                    }}
                  >
                    {team.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="absolute bottom-1.5 right-2">
            {isRunning ? (
              <ComposerPrimitive.Cancel asChild>
                <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-destructive text-destructive-foreground transition-colors hover:bg-destructive/90">
                  <Square className="h-3 w-3 fill-current" />
                </button>
              </ComposerPrimitive.Cancel>
            ) : (
              <ComposerPrimitive.Send asChild>
                <Button type="submit" size="icon" className="h-7 w-7">
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </ComposerPrimitive.Send>
            )}
          </div>
        </div>
      </div>

      {/* Recording Indicator */}
      {isRecording && (
        <div className="mt-2 flex items-center gap-2 text-xs text-destructive animate-pulse">
          <div className="w-2 h-2 rounded-full bg-destructive animate-ping" />
          正在录音... 点击停止
        </div>
      )}
    </ComposerPrimitive.Root>
  );
}

export default function SingleAgentChat({
  conversationId,
  mode = 'single',
  teammateMode,
  agentId,
  onTitleChange,
}: SingleAgentChatProps) {
  const { runtime, conversationTitle, messages, isRunning, regenerateFromMessage } = useOwleryRuntime(
    conversationId,
    mode,
    teammateMode,
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
          <ChatMessages onEditMessage={handleEditMessage} onRegenerate={regenerateFromMessage} messages={messages} isRunning={isRunning} />

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
        <ChatComposer initialText={editText} isRunning={isRunning} />
      </ThreadPrimitive.Root>
    </AssistantRuntimeProvider>
  );
}
