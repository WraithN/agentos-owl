/* Pi Agent 与 assistant-ui 外部存储运行时的桥接 Hook */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  generateId,
  useExternalStoreRuntime,
  type AppendMessage,
  type MessageStatus,
  type ThreadMessageLike,
} from '@assistant-ui/react';
import {
  createAgent,
  disposeAgent,
  onAgentEvent,
  promptAgent,
  stopAgent,
  type AgentEventWrapper,
} from '@/services/electron';

/** 从 @earendil-works/pi-ai 透传过来的内容块简化类型 */
type PiContent =
  | { type: 'text'; text: string }
  | { type: 'thinking'; thinking: string }
  | { type: 'image'; data: string; mimeType: string }
  | { type: 'toolCall'; id: string; name: string; arguments: Record<string, unknown> };

/** Pi Agent 消息（UserMessage / AssistantMessage / ToolResultMessage）的松散形状 */
type PiAgentMessage = {
  role?: 'user' | 'assistant' | 'toolResult' | string;
  content?: string | PiContent[];
  timestamp?: number;
  [key: string]: unknown;
};

/** Pi Agent 事件（来自 desktop subscribe） */
type PiAgentEvent =
  | { type: 'agent_start' }
  | { type: 'agent_end'; messages?: PiAgentMessage[] }
  | { type: 'turn_start' }
  | { type: 'turn_end'; message?: PiAgentMessage; toolResults?: unknown[] }
  | { type: 'message_start'; message?: PiAgentMessage }
  | {
      type: 'message_update';
      message?: PiAgentMessage;
      assistantMessageEvent?: { type: string; delta?: string; contentIndex?: number };
    }
  | { type: 'message_end'; message?: PiAgentMessage }
  | { type: 'tool_execution_start'; toolCallId: string; toolName: string; args?: unknown }
  | { type: 'tool_execution_update'; toolCallId: string; toolName: string; args?: unknown; partialResult?: unknown }
  | { type: 'tool_execution_end'; toolCallId: string; toolName: string; result?: unknown; isError: boolean }
  | { type: 'user_message'; text?: string; message?: PiAgentMessage };

type ThreadContentPart = NonNullable<ThreadMessageLike['content']> extends readonly (infer U)[] ? U : never;

function isContentArray(content: unknown): content is PiContent[] {
  return Array.isArray(content);
}

function buildRunningStatus(): MessageStatus {
  return { type: 'running' };
}

function buildCompleteStatus(): MessageStatus {
  return { type: 'complete', reason: 'stop' };
}

function buildCancelledStatus(): MessageStatus {
  return { type: 'incomplete', reason: 'cancelled' };
}

function buildErrorStatus(error?: string): MessageStatus {
  return { type: 'incomplete', reason: 'error', error: error ?? 'Agent 运行出错' };
}

function buildFinalStatus(msg: PiAgentMessage): MessageStatus {
  const errorMessage = typeof msg.errorMessage === 'string' ? msg.errorMessage : undefined;
  const stopReason = typeof msg.stopReason === 'string' ? msg.stopReason : 'stop';
  if (errorMessage) return buildErrorStatus(errorMessage);
  switch (stopReason) {
    case 'stop':
    case 'toolUse':
      return buildCompleteStatus();
    case 'length':
      return { type: 'incomplete', reason: 'length' };
    case 'aborted':
      return buildCancelledStatus();
    case 'error':
    default:
      return buildErrorStatus(errorMessage);
  }
}

function piContentToParts(contents: PiContent[]): ThreadContentPart[] {
  return contents.map((c) => {
    if (c.type === 'text') {
      return { type: 'text', text: c.text } as ThreadContentPart;
    }
    if (c.type === 'thinking') {
      return { type: 'reasoning', text: c.thinking } as ThreadContentPart;
    }
    if (c.type === 'image') {
      return {
        type: 'image',
        image: `data:${c.mimeType};base64,${c.data}`,
      } as ThreadContentPart;
    }
    if (c.type === 'toolCall') {
      return {
        type: 'tool-call',
        toolCallId: c.id,
        toolName: c.name,
        args: c.arguments,
        argsText: JSON.stringify(c.arguments),
      } as ThreadContentPart;
    }
    return { type: 'text', text: '' } as ThreadContentPart;
  });
}

function buildThreadMessage(msg: PiAgentMessage, complete = false): ThreadMessageLike {
  const id = generateId();
  const createdAt = msg.timestamp ? new Date(msg.timestamp) : new Date();
  const role = msg.role === 'user' ? 'user' : msg.role === 'assistant' ? 'assistant' : 'user';

  let content: ThreadMessageLike['content'];
  if (typeof msg.content === 'string') {
    content = msg.content;
  } else if (isContentArray(msg.content)) {
    content = piContentToParts(msg.content);
  } else {
    content = '';
  }

  if (role === 'assistant') {
    const status = complete ? buildFinalStatus(msg) : buildRunningStatus();
    const errorMessage = typeof msg.errorMessage === 'string' ? msg.errorMessage : undefined;
    if (errorMessage && typeof content === 'string') {
      content = [{ type: 'text', text: errorMessage } as ThreadContentPart];
    } else if (errorMessage && Array.isArray(content)) {
      content = [...content, { type: 'text', text: errorMessage } as ThreadContentPart];
    }
    return {
      id,
      role: 'assistant',
      content,
      createdAt,
      status,
    } as ThreadMessageLike;
  }

  return {
    id,
    role: 'user',
    content,
    createdAt,
  } as ThreadMessageLike;
}

function extractText(message: AppendMessage): string {
  if (typeof message.content === 'string') return message.content;
  return message.content
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

export function usePiAgentRuntime(conversationId: string) {
  const [messages, setMessages] = useState<ThreadMessageLike[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const currentAssistantIdRef = useRef<string | null>(null);

  /* ── 会话生命周期 ── */
  useEffect(() => {
    let mounted = true;
    createAgent(conversationId).catch((err: unknown) => {
      if (mounted) console.error('创建 Agent 失败:', err);
    });
    return () => {
      mounted = false;
      disposeAgent(conversationId).catch((err: unknown) => {
        console.error('销毁 Agent 失败:', err);
      });
    };
  }, [conversationId]);

  /* ── 订阅桌面端 Agent 事件 ── */
  useEffect(() => {
    const unsubscribe = onAgentEvent((wrapper: AgentEventWrapper) => {
      if (wrapper.sessionId !== conversationId) return;
      const event = wrapper.event as PiAgentEvent;

      switch (event.type) {
        case 'user_message': {
          const text =
            event.text ??
            (typeof event.message?.content === 'string' ? event.message.content : '');
          if (!text) return;
          setMessages((prev) => {
            // 如果最后一条用户消息内容相同，则去重（已在 onNew 中本地追加）
            const last = prev[prev.length - 1];
            if (
              last &&
              last.role === 'user' &&
              (typeof last.content === 'string'
                ? last.content === text
                : last.content.some((p) => p.type === 'text' && p.text === text))
            ) {
              return prev;
            }
            const userMsg: ThreadMessageLike = {
              id: generateId(),
              role: 'user',
              content: text,
              createdAt: new Date(),
            } as ThreadMessageLike;
            return [...prev, userMsg];
          });
          break;
        }

        case 'message_start': {
          if (!event.message) return;
          if (event.message.role === 'user') return;
          const assistantMsg = buildThreadMessage(event.message, false);
          currentAssistantIdRef.current = assistantMsg.id as string;
          setMessages((prev) => [...prev, assistantMsg]);
          setIsRunning(true);
          break;
        }

        case 'message_update': {
          if (!event.message || event.message.role !== 'assistant') break;
          const updated = buildThreadMessage(event.message, false);
          setMessages((prev) => {
            const id = currentAssistantIdRef.current;
            if (!id) return prev;
            return prev.map((m) =>
              m.id === id && m.role === 'assistant'
                ? ({ ...m, content: updated.content } as ThreadMessageLike)
                : m
            );
          });
          break;
        }

        case 'message_end': {
          if (event.message && event.message.role !== 'user') {
            const final = buildThreadMessage(event.message, true);
            setMessages((prev) => {
              const id = currentAssistantIdRef.current;
              if (!id) return [...prev, final];
              return prev.map((m) => (m.id === id ? { ...final, id } : m));
            });
          } else {
            setMessages((prev) => {
              const id = currentAssistantIdRef.current;
              if (!id) return prev;
              return prev.map((m) =>
                m.id === id ? ({ ...m, status: buildCompleteStatus() } as ThreadMessageLike) : m
              );
            });
          }
          currentAssistantIdRef.current = null;
          break;
        }

        case 'tool_execution_start': {
          setMessages((prev) => {
            const id = currentAssistantIdRef.current;
            if (!id) {
              // 没有正在流式的 assistant 消息时，新建一条占位消息
              const placeholder: ThreadMessageLike = {
                id: generateId(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolCallId: event.toolCallId,
                    toolName: event.toolName,
                    args: (event.args as Record<string, unknown>) ?? {},
                    argsText: JSON.stringify(event.args ?? {}),
                  } as ThreadContentPart,
                ],
                createdAt: new Date(),
                status: buildRunningStatus(),
              } as ThreadMessageLike;
              currentAssistantIdRef.current = placeholder.id as string;
              return [...prev, placeholder];
            }
            return prev.map((m) => {
              if (m.id !== id || m.role !== 'assistant') return m;
              const parts = Array.isArray(m.content) ? [...m.content] : [];
              const exists = parts.some(
                (p) => p.type === 'tool-call' && p.toolCallId === event.toolCallId
              );
              if (exists) return m;
              parts.push({
                type: 'tool-call',
                toolCallId: event.toolCallId,
                toolName: event.toolName,
                args: (event.args as Record<string, unknown>) ?? {},
                argsText: JSON.stringify(event.args ?? {}),
              } as ThreadContentPart);
              return { ...m, content: parts } as ThreadMessageLike;
            });
          });
          break;
        }

        case 'tool_execution_end': {
          setMessages((prev) =>
            prev.map((m) => {
              if (m.role !== 'assistant' || !Array.isArray(m.content)) return m;
              const parts = m.content.map((p) => {
                if (p.type !== 'tool-call' || p.toolCallId !== event.toolCallId) return p;
                return {
                  ...p,
                  result: event.result,
                  isError: event.isError,
                } as ThreadContentPart;
              });
              return { ...m, content: parts } as ThreadMessageLike;
            })
          );
          break;
        }

        case 'agent_end': {
          setIsRunning(false);
          setMessages((prev) =>
            prev.map((m) =>
              m.role === 'assistant' && m.status?.type === 'running'
                ? ({ ...m, status: buildCancelledStatus() } as ThreadMessageLike)
                : m
            )
          );
          currentAssistantIdRef.current = null;
          break;
        }
      }
    });

    return unsubscribe;
  }, [conversationId]);

  /* ── 用户发送消息 ── */
  const handleNew = useCallback(
    async (message: AppendMessage) => {
      const text = extractText(message);
      if (!text.trim()) return;

      // 本地先追加用户消息（桌面端随后也会再推送一条 user_message）
      const userMsg: ThreadMessageLike = {
        id: generateId(),
        role: 'user',
        content: text,
        createdAt: new Date(),
      } as ThreadMessageLike;
      setMessages((prev) => [...prev, userMsg]);

      await promptAgent(conversationId, text);
    },
    [conversationId]
  );

  /* ── 取消生成 ── */
  const handleCancel = useCallback(async () => {
    await stopAgent(conversationId);
  }, [conversationId]);

  const runtime = useExternalStoreRuntime<ThreadMessageLike>({
    messages,
    isRunning,
    onNew: handleNew,
    onCancel: handleCancel,
    convertMessage: (m) => m,
  });

  return runtime;
}
