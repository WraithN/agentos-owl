/* Agent 对话界面 —— 基于 assistant-ui 与 Pi Agent IPC */
import { useState, useRef, useEffect, useCallback, useMemo, type ReactNode } from 'react';
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
  RotateCcw,
  AlertTriangle,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import type { AppMode, TeammateMode } from '@/types';
import { onAgentStatus } from '@/services/electron';

import { useChatRuntime } from './chat-runtime-context';
import { useT } from '@/lib/i18n';
import type { AgentTaskView, TeammateStatus } from '@owl-os/core';
import { Button } from '@/components/ui/button';
import { MarkdownText } from './MarkdownText';
import { useOwleryRuntime, type AgentOutput } from './useOwleryRuntime';
import { ChatComposer } from './ChatComposer';
import { extractGeneratedFilePathsFromText } from './file-result-utils';
import { FileResultCards } from './FileResultCards';
import { CollapsiblePanel, ReasoningPanel, ToolLogPanel } from './message-parts';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';


export interface AgentChatProps {
  conversationId: string;
  mode?: AppMode;
  /** 用户指定的协作策略（如 pipeline / brainstorm）。未指定时由 Elder Agent 自行判断。 */
  teammateMode?: TeammateMode;
  /** 用户手动选择的团队模板 ID，优先级高于 teammateMode */
  teamTemplateId?: string;
  agentId?: string;
  /** 会话标题回调 */
  onTitleChange?: (title: string) => void;
}

const BOTTOM_DISTANCE_THRESHOLD = 96;
const MESSAGE_WIDTH_CLASS = 'w-[min(92ch,84%)]';

const OWLERY_STATUS_EVENT = 'owlery:teammate-status';

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
}: {
  message: any;
  sessionId: string;
  onEdit: (text: string) => void;
  onRegenerate: (messageId: string) => void;
  hideActions?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const { agentOutputs, tasks, rounds, isRunning: runtimeIsRunning } = useChatRuntime();
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

  // 判断当前消息是否属于复杂任务：
  // 1. 历史消息在 metadata.custom 中保存了 agentOutputs/tasks/rounds；
  // 2. 当前正在生成的 assistant 消息，且运行时已有团队协作数据。
  const messageMeta = (message.metadata?.custom ?? message.meta) as { agentOutputs?: Record<string, AgentOutput>; tasks?: AgentTaskView[]; rounds?: number[] } | undefined;
  const hasWorkflowMeta = messageMeta && (
    Object.keys(messageMeta.agentOutputs ?? {}).length > 0
    || (messageMeta.tasks?.length ?? 0) > 0
    || (messageMeta.rounds?.length ?? 0) > 0
  );
  const isCurrentRunningAssistant = isAssistantRunning && runtimeIsRunning;
  const hasCurrentWorkflow = isCurrentRunningAssistant && (
    Object.keys(agentOutputs).length > 0 || tasks.length > 0 || rounds.length > 0
  );
  const isComplexTask = hasWorkflowMeta || hasCurrentWorkflow;
  const showThinking = isAssistantRunning;
  // 简单请求在主消息内展示折叠的 reasoning/tool；复杂任务的全部过程移到右侧「执行过程」面板。
  const showReasoningInMessage = message.role !== 'user' && !isComplexTask;

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(mainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [mainText]);

  return (
    <div className={`group relative min-w-0 ${MESSAGE_WIDTH_CLASS}`}>
      {showThinking && <ThinkingIndicator />}

      {showReasoningInMessage && (reasoningText.trim() || toolParts.length > 0) && (
        <div className="my-1 space-y-1 py-1">
          {reasoningText.trim() && <ReasoningPanel text={reasoningText} />}
          {toolParts.length > 0 && <ToolLogPanel tools={toolParts} sessionId={sessionId} />}
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
        <FileResultCards sessionId={sessionId} filePaths={extractGeneratedFilePathsFromText(message)} />
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

function ThinkingIndicator() {
  return (
    <div className="relative pl-16 mb-3 animate-fade-in">
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

export default function AgentChat({
  conversationId,
  mode = 'chat',
  teammateMode,
  teamTemplateId,
  agentId,
  onTitleChange,
}: AgentChatProps) {
  const {
    setTasks: setRuntimeTasks,
    setAgentOutputs: setRuntimeAgentOutputs,
    setRounds: setRuntimeRounds,
    setTeamStatus: setRuntimeTeamStatus,
    setGeneratedFiles: setRuntimeGeneratedFiles,
    setIsRunning: setRuntimeIsRunning,
  } = useChatRuntime();
  const [selectedTeam, setSelectedTeam] = useState<string | undefined>(teamTemplateId);
  const {
    runtime, conversationTitle, messages, isRunning, regenerateFromMessage,
    agentOutputs, tasks, rounds, generatedFiles,
  } = useOwleryRuntime(
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

  // 消息发送后清空编辑态，避免再次点击同一消息的编辑按钮时因 state 未变而不生效
  const wasRunningRef = useRef(isRunning);
  useEffect(() => {
    if (isRunning && !wasRunningRef.current) {
      setEditText('');
    }
    wasRunningRef.current = isRunning;
  }, [isRunning]);

  // 监听运行时推送的团队状态，用于展示团队名称与成员工作状态
  // WebSocket 状态通过 window 自定义事件投递，IPC 状态通过 electron 订阅投递，两者都监听保证一致性。
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail as { sessionId: string; status: TeammateStatus } | undefined;
      if (detail?.sessionId === conversationId) {
        setTeamStatus(detail.status);
      }
    };
    window.addEventListener(OWLERY_STATUS_EVENT, handler);
    const unsubscribe = onAgentStatus((wrapper) => {
      if (wrapper.sessionId === conversationId) {
        setTeamStatus(wrapper.status);
      }
    });
    return () => {
      window.removeEventListener(OWLERY_STATUS_EVENT, handler);
      unsubscribe();
    };
  }, [conversationId]);

  // 新会话开始时清空上一轮的团队状态
  useEffect(() => {
    if (isRunning) setTeamStatus(null);
  }, [isRunning]);

  // 将运行时执行状态同步到 ChatRuntimeContext，供右侧「执行过程」面板消费
  useEffect(() => {
    setRuntimeTasks(tasks);
  }, [tasks, setRuntimeTasks]);
  useEffect(() => {
    setRuntimeAgentOutputs(agentOutputs);
  }, [agentOutputs, setRuntimeAgentOutputs]);
  useEffect(() => {
    setRuntimeRounds(rounds);
  }, [rounds, setRuntimeRounds]);
  useEffect(() => {
    setRuntimeTeamStatus(teamStatus);
  }, [teamStatus, setRuntimeTeamStatus]);
  useEffect(() => {
    setRuntimeGeneratedFiles(generatedFiles);
  }, [generatedFiles, setRuntimeGeneratedFiles]);
  useEffect(() => {
    setRuntimeIsRunning(isRunning);
  }, [isRunning, setRuntimeIsRunning]);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadPrimitive.Root className="relative h-full flex flex-col overflow-hidden">
        {/* 消息滚动区 */}
        <ThreadPrimitive.Viewport
          ref={viewportRef}
          onScroll={handleViewportScroll}
          autoScroll={false}
          scrollToBottomOnRunStart={false}
          scrollToBottomOnInitialize={false}
          scrollToBottomOnThreadSwitch={false}
          className="flex-1 overflow-y-auto px-16 py-8 space-y-6"
        >
          <ChatMessages
            sessionId={conversationId}
            onEditMessage={handleEditMessage}
            onRegenerate={regenerateFromMessage}
            messages={messages}
          />

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
