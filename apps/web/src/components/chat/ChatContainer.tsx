/* Chat 主容器 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateId } from '@assistant-ui/react';
import { cn } from '@/lib/utils';
import type { AppMode, Conversation } from '@/types';
import { saveConversation, saveMessage, startOwleryChat } from '@/services/electron';
import UpgradeBar from './UpgradeBar';
import EmptyState from './EmptyState';
import ChatHeader from './ChatHeader';
import SingleAgentChat from './SingleAgentChat';
import ConversationList from './ConversationList';
import TaskBoard from '@/components/squad/TaskBoard';
import ExecutionLog from '@/components/automation/ExecutionLog';
import MonitorModule from '@/components/monitor/MonitorModule';

/* ─── ChatContainer ───────────────────────────────────────────────────── */
interface ChatContainerProps {
  chatMode: AppMode;
  currentConversation: Conversation | null;
  setCurrentConversation: (c: Conversation | null) => void;
  setChatMode: (m: AppMode) => void;
  refreshConversations?: () => Promise<void>;
}

export default function ChatContainer({
  chatMode, currentConversation, setCurrentConversation, setChatMode, refreshConversations,
}: ChatContainerProps) {
  const [showUpgradeBar, setShowUpgradeBar] = useState(false);
  const [conversationListOpen, setConversationListOpen] = useState(false);
  const [taskBoardOpen, setTaskBoardOpen] = useState(false);
  const [monitorOpen, setMonitorOpen] = useState(false);
  const [dynamicTitle, setDynamicTitle] = useState(currentConversation?.title ?? "新对话");

  /* ── 可拖拽面板宽度 ──────────────────────────────────────────── */
  const monitorRef = useRef<HTMLDivElement>(null);
  const [monitorWidth, setMonitorWidth] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleDraggingMouseMove = useCallback((e: MouseEvent) => {
    const vw = window.innerWidth;
    const minPx = Math.min(320, vw * 0.4);
    const maxPx = vw * 0.85;
    const newW = Math.max(minPx, Math.min(maxPx, vw - e.clientX));
    setMonitorWidth(newW);
  }, []);

  const handleDraggingMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  function handleMouseDown() {
    if (monitorRef.current) {
      setMonitorWidth(monitorRef.current.offsetWidth);
    }
    setDragging(true);
  }

  // 拖拽时全局监听鼠标事件
  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleDraggingMouseMove);
      window.addEventListener('mouseup', handleDraggingMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleDraggingMouseMove);
        window.removeEventListener('mouseup', handleDraggingMouseUp);
      };
    }
  }, [dragging, handleDraggingMouseMove, handleDraggingMouseUp]);

  const buildTitleFromText = useCallback((text: string) => {
    const TITLE_MAX_LENGTH = 20;
    return text.length <= TITLE_MAX_LENGTH ? text : `${text.slice(0, TITLE_MAX_LENGTH)}…`;
  }, []);

  async function handleNewConv(options?: {
    mode?: AppMode;
    teamTemplateId?: string;
    title?: string;
  }) {
    const now = new Date();
    const title = options?.title ?? '新对话';
    const conversation = await saveConversation({
      id: '',
      title,
      mode: options?.mode ?? 'chat',
      teamTemplateId: options?.teamTemplateId,
      lastMessage: '',
      lastTime: now,
      unread: 0,
      agentIds: options?.teamTemplateId ? [] : ['boss_agent'],
      pinned: false,
      createdAt: now,
      updatedAt: now,
    });
    setCurrentConversation(conversation);
    setChatMode(options?.mode ?? 'chat');
    setDynamicTitle(title);
    await refreshConversations?.();
    return conversation;
  }

  async function handleQuickAction(prompt: string) {
    const title = buildTitleFromText(prompt);
    const conversation = await handleNewConv({ mode: 'chat', title });
    const now = new Date();
    await saveMessage({
      id: generateId(),
      conversationId: conversation.id,
      type: 'user',
      content: prompt,
      timestamp: now,
    });
    await startOwleryChat(conversation.id, prompt);
  }

  const isAuto = chatMode === 'auto';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── 标题栏 ── */}
      <ChatHeader
        title={currentConversation?.title ?? dynamicTitle}
        currentId={currentConversation?.id}
        onSelect={() => setConversationListOpen((value) => !value)}
        onNew={handleNewConv}
        taskBoardOpen={taskBoardOpen}
        onToggleTaskBoard={() => setTaskBoardOpen(v => !v)}
        monitorOpen={monitorOpen}
        onToggleMonitor={() => setMonitorOpen(v => !v)}
      />

      {/* ── 升级提示条 ── */}
      <AnimatePresence>
        {showUpgradeBar && (
          <UpgradeBar
            onConfirm={() => { setShowUpgradeBar(false); setChatMode('chat'); }}
            onDismiss={() => setShowUpgradeBar(false)}
          />
        )}
      </AnimatePresence>

      {/* ── 主区域 ── */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        <AnimatePresence>
          {conversationListOpen && (
            <motion.div
              key="conversation-list"
              initial={{ x: '-100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              className="absolute left-0 top-0 bottom-0 z-40 w-[320px] max-w-[85vw] overflow-hidden"
            >
              <ConversationList onToggle={() => setConversationListOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 消息流：有当前会话时走 SingleAgentChat，否则显示 EmptyState */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {currentConversation ? (
            <SingleAgentChat
              key={currentConversation.id}
              conversationId={currentConversation.id}
              mode={chatMode}
              teammateMode={currentConversation.teammateMode}
              teamTemplateId={currentConversation.teamTemplateId}
              onTitleChange={setDynamicTitle}
            />
          ) : (
            <EmptyState onQuickAction={handleQuickAction} />
          )}
        </div>

        {/* 浮动抽屉：任务看板 / 执行日志 */}
        <AnimatePresence>
          {taskBoardOpen && !isAuto && (
            <motion.div
              key="task-board"
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28, delay: 0.08 }}
              className="absolute right-0 top-0 bottom-0 z-30 w-full md:w-[60%] min-w-[320px] overflow-hidden"
              style={{ background: 'var(--panel-bg-solid)', borderLeft: '1px solid var(--border-subtle)' }}
            >
              <TaskBoard />
            </motion.div>
          )}
          {taskBoardOpen && isAuto && (
            <motion.div
              key="exec-log"
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              className="absolute right-0 top-0 bottom-0 z-30 w-full md:w-[60%] min-w-[320px] overflow-hidden"
              style={{ background: 'var(--panel-bg-solid)', borderLeft: '1px solid var(--border-subtle)' }}
            >
              <ExecutionLog />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 可拖拽运行监控面板 */}
        <AnimatePresence>
          {monitorOpen && (
            <motion.div
              ref={monitorRef}
              key="monitor-panel"
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28, delay: 0.08 }}
              className="absolute right-0 top-0 bottom-0 z-30 flex overflow-hidden w-full md:w-[60%]"
              style={{
                width: monitorWidth ?? undefined,
                minWidth: 320,
                maxWidth: '85vw',
              }}
            >
              {/* 拖拽手柄 */}
              <div
                className={cn(
                  'w-1.5 shrink-0 cursor-col-resize transition-colors',
                  dragging ? 'bg-cyan-400/60' : 'bg-transparent hover:bg-cyan-400/30'
                )}
                style={{
                  background: dragging
                    ? 'linear-gradient(180deg, rgba(0,242,195,0.5), rgba(14,165,233,0.5))'
                    : undefined,
                }}
                onMouseDown={handleMouseDown}
                title="拖拽调整宽度"
              />
              <div
                className="flex-1 overflow-hidden"
                style={{
                  background: 'var(--panel-bg-solid)',
                  borderLeft: '1px solid var(--border-l2)',
                }}
              >
                <MonitorModule />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
