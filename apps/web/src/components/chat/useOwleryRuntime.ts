import { useCallback, useEffect, useRef, useState } from 'react';
import { generateId, useExternalStoreRuntime, type AppendMessage, type MessageStatus, type ThreadMessageLike } from '@assistant-ui/react';
import type { AgentDriverChunk, TeammateStatus } from '@owl-os/core';
import { toast } from 'sonner';
import { WebSocketClient } from '@/services/websocket';
import {
  activateOwlerySession,
  getOwleryBufferedOutput,
  listMessages,
  onOwleryChunk,
  saveConversation,
  saveMessage,
  startOwleryChat,
} from '@/services/electron';
import type { AppMode, Conversation, Message, MessageType, TeammateMode } from '@/types';

const TITLE_MAX_LENGTH = 20;
const LAST_MESSAGE_MAX_LENGTH = 80;
const OWLERY_STATUS_EVENT = 'owlery:teammate-status';
const SESSION_STREAM = 'session';

type ThreadContentPart = any;

function dispatchTeammateStatus(sessionId: string, status: TeammateStatus): void {
  window.dispatchEvent(new CustomEvent(OWLERY_STATUS_EVENT, { detail: { sessionId, status } }));
}

function buildCompleteStatus(): MessageStatus {
  return { type: 'complete', reason: 'stop' };
}

function buildRunningStatus(): MessageStatus {
  return { type: 'running' };
}

function buildErrorStatus(error: string): MessageStatus {
  return { type: 'incomplete', reason: 'error', error };
}

function extractText(message: AppendMessage): string {
  if (typeof message.content === 'string') return message.content;
  return message.content.filter((part) => part.type === 'text').map((part) => part.text).join('');
}

function getPersistedContentParts(message: Message): ThreadMessageLike['content'] {
  const meta = message.meta as { contentParts?: unknown } | undefined;
  if (Array.isArray(meta?.contentParts)) return meta.contentParts as ThreadMessageLike['content'];
  return [{ type: 'text', text: message.content } as ThreadContentPart];
}

function persistedMessageToThread(message: Message): ThreadMessageLike | null {
  if (message.type !== 'user' && message.type !== 'agent') return null;
  return {
    id: message.id,
    role: message.type === 'user' ? 'user' : 'assistant',
    content: message.type === 'agent' ? getPersistedContentParts(message) : [{ type: 'text', text: message.content } as ThreadContentPart],
    createdAt: message.timestamp,
    status: message.type === 'agent' ? buildCompleteStatus() : undefined,
  } as ThreadMessageLike;
}

function buildPersistedMessage(params: {
  id: string;
  conversationId: string;
  type: MessageType;
  content: string;
  status?: 'done' | 'error';
  meta?: Message['meta'];
}): Message & { conversationId: string } {
  return {
    id: params.id,
    conversationId: params.conversationId,
    type: params.type,
    contentType: 'text',
    status: params.status ?? 'done',
    content: params.content,
    timestamp: new Date(),
    meta: params.meta,
  };
}

function getToolEventId(event: any) {
  return event.toolCallId ?? event.id ?? event.toolName ?? event.name ?? 'tool';
}

function upsertTextPart(parts: ThreadContentPart[], text: string): ThreadContentPart[] {
  const source = parts as Array<Record<string, unknown>>;
  const next = source.filter((part) => part['type'] !== 'text');
  return [{ type: 'text', text } as ThreadContentPart, ...(next as ThreadContentPart[])];
}

function upsertReasoningPart(parts: ThreadContentPart[], text: string): ThreadContentPart[] {
  const source = parts as Array<Record<string, unknown>>;
  const existing = source.find((part) => part['type'] === 'reasoning') as { text?: string } | undefined;
  const next = source.filter((part) => part['type'] !== 'reasoning');
  return [...(next as ThreadContentPart[]), { type: 'reasoning', text: `${existing?.text ?? ''}${text}` } as ThreadContentPart];
}

function upsertToolPart(parts: ThreadContentPart[], event: any): ThreadContentPart[] {
  const source = parts as Array<Record<string, unknown>>;
  const toolCallId = getToolEventId(event);
  const next = source.filter((part) => !(part['type'] === 'tool-call' && part['toolCallId'] === toolCallId));
  const existing = source.find((part) => part['type'] === 'tool-call' && part['toolCallId'] === toolCallId) as any;
  const patch = event.type === 'tool_execution_end'
    ? { result: event.result, isError: event.isError, endedAt: Date.now(), durationMs: typeof existing?.startedAt === 'number' ? Date.now() - existing.startedAt : undefined }
    : { args: event.args ?? existing?.args ?? {}, argsText: JSON.stringify(event.args ?? existing?.args ?? {}, null, 2), partialResult: event.partialResult };
  return [...next, {
    ...existing,
    type: 'tool-call',
    toolCallId,
    toolName: event.toolName ?? event.name ?? existing?.toolName ?? '未知工具',
    startedAt: existing?.startedAt ?? Date.now(),
    ...patch,
  } as ThreadContentPart];
}

function buildConversationUpdate(conversationId: string, title: string, mode: AppMode, lastMessage: string): Conversation {
  const now = new Date();
  return {
    id: conversationId,
    title,
    mode,
    lastMessage: lastMessage.slice(0, LAST_MESSAGE_MAX_LENGTH),
    lastTime: now,
    unread: 0,
    agentIds: ['boss_agent'],
    pinned: false,
    createdAt: now,
    updatedAt: now,
  };
}

function buildAssistantFromChunks(id: string, chunks: AgentDriverChunk[]): ThreadMessageLike | null {
  let text = '';
  let parts: ThreadContentPart[] = [];
  const error = chunks.find((chunk) => chunk.type === 'error');
  for (const chunk of chunks) {
    if (chunk.type === 'text_delta') {
      text += chunk.text;
      parts = upsertTextPart(parts, text);
    }
    if (chunk.type === 'reasoning_delta') parts = upsertReasoningPart(parts, chunk.text);
    if (chunk.type === 'tool_event') parts = upsertToolPart(parts, chunk.event);
  }
  if (error?.type === 'error') parts = upsertTextPart(parts, text || error.error);
  if (parts.length === 0) return null;
  return {
    id,
    role: 'assistant',
    content: parts,
    createdAt: new Date(),
    status: error?.type === 'error' ? buildErrorStatus(error.error) : chunks.some((chunk) => chunk.type === 'done') ? buildCompleteStatus() : buildRunningStatus(),
  } as ThreadMessageLike;
}

export function useOwleryRuntime(
  conversationId: string,
  mode: AppMode = 'chat',
  teammateMode?: TeammateMode,
  teamTemplateId?: string,
) {
  const [messages, setMessages] = useState<ThreadMessageLike[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const assistantIdRef = useRef<string | null>(null);
  const assistantTextRef = useRef('');
  const assistantPartsRef = useRef<ThreadContentPart[]>([]);
  const webSocketClientRef = useRef<WebSocketClient | null>(null);
  const webSocketAvailableRef = useRef(true);
  const activeTransportRef = useRef<'websocket' | 'ipc'>('ipc');

  const conversationTitle = (() => {
    const firstUser = messages.find((message) => message.role === 'user');
    if (!firstUser) return '新对话';
    const content = firstUser.content;
    const text = typeof content === 'string' ? content : content.find((part) => part.type === 'text')?.text ?? '';
    return text.length <= TITLE_MAX_LENGTH ? text : `${text.slice(0, TITLE_MAX_LENGTH)}…`;
  })();
  const conversationTitleRef = useRef(conversationTitle);
  conversationTitleRef.current = conversationTitle;

  const applyChunk = useCallback((chunk: AgentDriverChunk) => {
    if (chunk.type === 'done' && !assistantIdRef.current) {
      setIsRunning(false);
      return;
    }

    if (!assistantIdRef.current) {
      assistantIdRef.current = generateId();
      assistantTextRef.current = '';
      assistantPartsRef.current = [];
      setMessages((prev) => [...prev, {
        id: assistantIdRef.current,
        role: 'assistant',
        content: [],
        createdAt: new Date(),
        status: buildRunningStatus(),
      } as ThreadMessageLike]);
    }

    const id = assistantIdRef.current;
    if (!id) return;
    if (chunk.type === 'text_delta') {
      const nextText = assistantTextRef.current + chunk.text;
      const nextParts = upsertTextPart(assistantPartsRef.current, nextText);
      assistantTextRef.current = nextText;
      assistantPartsRef.current = nextParts;
      // 将新内容捕获到闭包变量，避免 React 批量执行 updater 时引用已被后续 chunk 重置。
      setMessages((prev) => prev.map((message) => message.id === id ? {
        ...message,
        content: nextParts,
        status: buildRunningStatus(),
      } as ThreadMessageLike : message));
      return;
    }

    if (chunk.type === 'reasoning_delta') {
      const nextParts = upsertReasoningPart(assistantPartsRef.current, chunk.text);
      assistantPartsRef.current = nextParts;
      setMessages((prev) => prev.map((message) => message.id === id ? {
        ...message,
        content: nextParts,
        status: buildRunningStatus(),
      } as ThreadMessageLike : message));
      return;
    }

    if (chunk.type === 'tool_event') {
      const nextParts = upsertToolPart(assistantPartsRef.current, chunk.event);
      assistantPartsRef.current = nextParts;
      setMessages((prev) => prev.map((message) => message.id === id ? {
        ...message,
        content: nextParts,
        status: buildRunningStatus(),
      } as ThreadMessageLike : message));
      return;
    }

    if (chunk.type === 'error') {
      setIsRunning(false);
      const nextParts = upsertTextPart(assistantPartsRef.current, assistantTextRef.current || chunk.error);
      assistantPartsRef.current = nextParts;
      setMessages((prev) => prev.map((message) => message.id === id ? {
        ...message,
        content: nextParts,
        status: buildErrorStatus(chunk.error),
      } as ThreadMessageLike : message));
      assistantIdRef.current = null;
      assistantTextRef.current = '';
      assistantPartsRef.current = [];
      return;
    }

    if (chunk.type === 'done') {
      setIsRunning(false);
      setMessages((prev) => prev.map((message) => message.id === id ? { ...message, status: buildCompleteStatus() } as ThreadMessageLike : message));
      // 在重置引用前先捕获最终内容，避免异步 save 回调执行时引用已被清空导致保存空内容。
      const finalText = assistantTextRef.current;
      const finalParts = assistantPartsRef.current;
      if (finalText.trim() || finalParts.length > 0) {
        saveConversation(buildConversationUpdate(conversationId, conversationTitleRef.current, mode, finalText))
          .then(() => saveMessage(buildPersistedMessage({ id, conversationId, type: 'agent', content: finalText, meta: { contentParts: finalParts } })))
          .catch((error: unknown) => console.error('保存 Owlery 助手消息失败:', error));
      }
      assistantIdRef.current = null;
      assistantPartsRef.current = [];
      assistantTextRef.current = '';
    }
  }, [conversationId, mode]);

  useEffect(() => {
    let mounted = true;
    assistantIdRef.current = null;
    assistantTextRef.current = '';
    assistantPartsRef.current = [];
    activateOwlerySession(conversationId)
      .then(() => Promise.all([listMessages(conversationId), getOwleryBufferedOutput(conversationId)]))
      .then(([items, chunks]) => {
        if (!mounted) return;
        const restored = items.map(persistedMessageToThread).filter((item): item is ThreadMessageLike => item !== null);
        const buffered = buildAssistantFromChunks(generateId(), chunks);
        const bufferedStatus = buffered?.status as { type?: string } | undefined;
        if (buffered && bufferedStatus?.type === 'running') {
          assistantIdRef.current = buffered.id as string;
          assistantPartsRef.current = Array.isArray(buffered.content) ? buffered.content as ThreadContentPart[] : [{ type: 'text', text: buffered.content ?? '' }];
          assistantTextRef.current = assistantPartsRef.current.filter((part) => part['type'] === 'text').map((part) => String(part['text'] ?? '')).join('');
        }
        setMessages(buffered ? [...restored, buffered] : restored);
        setIsRunning(bufferedStatus?.type === 'running');
      })
      .catch((error: unknown) => console.error('加载 Owlery 会话失败:', error));

    activeTransportRef.current = 'ipc';
    webSocketAvailableRef.current = true;
    webSocketClientRef.current = new WebSocketClient({
      sessionId: conversationId,
      onChunk: applyChunk,
      onStatus: (status) => dispatchTeammateStatus(conversationId, status),
      onError: (_error, streamType) => {
        if (streamType === SESSION_STREAM) webSocketAvailableRef.current = false;
      },
    });

    const unsubscribe = onOwleryChunk(({ sessionId, chunk }) => {
      if (sessionId !== conversationId || activeTransportRef.current !== 'ipc') return;
      applyChunk(chunk);
    });

    return () => {
      mounted = false;
      unsubscribe();
      webSocketClientRef.current?.close();
      webSocketClientRef.current = null;
    };
  }, [conversationId, applyChunk]);

  const handleNew = useCallback(async (message: AppendMessage) => {
    const text = extractText(message).trim();
    if (!text) return;
    const userId = generateId();
    setMessages((prev) => [...prev, { id: userId, role: 'user', content: text, createdAt: new Date() } as ThreadMessageLike]);
    setIsRunning(true);
    assistantIdRef.current = null;
    assistantTextRef.current = '';
    assistantPartsRef.current = [];
    try {
      await saveConversation(buildConversationUpdate(conversationId, conversationTitle === '新对话' ? text.slice(0, TITLE_MAX_LENGTH) : conversationTitle, mode, text));
      await saveMessage(buildPersistedMessage({ id: userId, conversationId, type: 'user', content: text }));
      const webSocketSent = webSocketClientRef.current?.isSessionReady() === true
        ? webSocketClientRef.current.sendChat(text, { teammateMode, teamTemplateId })
        : false;
      activeTransportRef.current = webSocketSent ? 'websocket' : 'ipc';
      if (!webSocketSent) await startOwleryChat(conversationId, text, { teammateMode, teamTemplateId });
    } catch (error) {
      setIsRunning(false);
      toast.error(`发送失败：${error instanceof Error ? error.message : String(error)}`);
    }
  }, [conversationId, conversationTitle, mode, teammateMode, teamTemplateId]);

  const regenerateFromMessage = useCallback((_messageId: string) => {
    toast.info('Owlery 重新生成能力即将接入');
  }, []);

  const runtime = useExternalStoreRuntime<ThreadMessageLike>({
    messages,
    isRunning,
    onNew: handleNew,
    onCancel: async () => {
      toast.info('Owlery 停止能力即将接入');
    },
    convertMessage: (message) => message,
  });

  return { runtime, conversationTitle, messages, isRunning, regenerateFromMessage };
}
