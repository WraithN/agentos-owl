/* Chat 主容器 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageFlow, InputArea } from '@owl-os/chat';
import { AGENTS, MESSAGES_SQUAD } from '@owl-os/chat';
import type { Message } from '@owl-os/chat';
import { cn } from '@/lib/utils';
import type { AppMode, Conversation } from '@/types';
import UpgradeBar from './UpgradeBar';
import EmptyState from './EmptyState';
import ChatHeader from './ChatHeader';
import SingleAgentChat from './SingleAgentChat';
import TaskBoard from '@/components/squad/TaskBoard';
import ExecutionLog from '@/components/automation/ExecutionLog';
import MonitorModule from '@/components/monitor/MonitorModule';

/* ─── 流式模拟引擎 ────────────────────────────────────────────────────── */
/** 把全文按字符逐步追加，返回 stop 函数 */
function streamText(
  full: string,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  intervalMs = 18,
): () => void {
  let i = 0;
  const id = setInterval(() => {
    if (i >= full.length) {
      clearInterval(id);
      onDone();
      return;
    }
    // 每帧追加 1–3 个字符（模拟不等速输出）
    const step = Math.min(Math.ceil(Math.random() * 3), full.length - i);
    onChunk(full.slice(i, i + step));
    i += step;
  }, intervalMs);
  return () => clearInterval(id);
}

/* ─── 5 种 mock 响应场景 ─────────────────────────────────────────────── */
function buildMockReply(text: string, agentId: string): Omit<Message, 'id' | 'timestamp'> {
  // 1. 代码
  if (/函数|代码|function|def |write.*code/i.test(text)) {
    const code = `def fibonacci(n: int) -> list[int]:
    """生成斐波那契数列前 n 项"""
    if n <= 0:
        return []
    if n == 1:
        return [0]
    seq = [0, 1]
    while len(seq) < n:
        seq.append(seq[-1] + seq[-2])
    return seq

# 示例
print(fibonacci(10))
# [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]`;
    return {
      type: 'agent',
      contentType: 'code',
      content: '已为你生成斐波那契数列函数，采用迭代方式实现，时间复杂度 O(n)，空间复杂度 O(n)。',
      agentId,
      status: 'done',
      cotSteps: [
        { id: 'c1', title: '理解需求', content: '用户需要一个生成函数，确认语言为 Python', duration: 120 },
        { id: 'c2', title: '选择算法', content: '迭代法优于递归，避免栈溢出', duration: 85 },
        { id: 'c3', title: '添加类型注解', content: '加入 type hints 提高代码可读性', duration: 60 },
      ],
      codeBlock: { language: 'python', filename: 'fibonacci.py', code },
      meta: { model: 'GPT-4o', tokens: 312, summary: '迭代法斐波那契，O(n) 时间复杂度，已加类型注解', durationMs: 1840 },
    };
  }

  // 2. 图片
  if (/图片|画|image|图像|生成.*图|照片/i.test(text)) {
    return {
      type: 'agent',
      contentType: 'image',
      content: '已根据你的描述生成图片，风格为科技感赛博朋克，1024×1024。',
      agentId,
      status: 'done',
      imageUrl: 'https://images.unsplash.com/photo-1633356122102-3fe601e05bd2?w=800&q=80',
      imageCaption: '科技感赛博朋克城市 · 1024×1024 · DALL·E 3',
      meta: { model: 'DALL·E 3', tokens: 0, summary: '赛博朋克风格城市夜景，霓虹灯、摩天楼', durationMs: 4200 },
    };
  }

  // 3. 工具调用
  if (/工具|tool|搜索|查询|调用|api/i.test(text)) {
    return {
      type: 'agent',
      contentType: 'tool_call',
      content: '已调用搜索工具获取最新数据，结果如下：',
      agentId,
      status: 'done',
      toolCall: {
        id: 'tc-1',
        toolName: '联网搜索',
        toolIcon: '🔍',
        status: 'done',
        input: { query: text.slice(0, 40), maxResults: 5 },
        output: {
          results: [
            { title: 'OwlOS 智能体运行时架构介绍', url: 'https://example.com/1', snippet: '意图驱动的 Agent 调度系统，支持单聊、群聊、自动化三种模式…' },
            { title: '多 Agent 协作框架对比 2025', url: 'https://example.com/2', snippet: 'AutoGPT vs CrewAI vs OwlOS 深度评测…' },
          ],
          totalCount: 2,
          searchTime: '0.38s',
        },
        duration: 1240,
      },
      meta: { model: 'GPT-4o', tokens: 480, summary: '搜索完成，返回 2 条高相关结果', durationMs: 1240 },
    };
  }

  // 4. 卡片
  if (/卡片|card|报告|报表|数据|统计|dashboard/i.test(text)) {
    return {
      type: 'agent',
      contentType: 'card',
      content: '已生成数据摘要卡片，核心指标如下：',
      agentId,
      status: 'done',
      cardData: {
        title: '本周任务执行摘要',
        subtitle: '2026-06-06 ~ 2026-06-12',
        badge: '已完成',
        badgeColor: 'emerald',
        rows: [
          { label: '总任务数', value: '47', highlight: false },
          { label: '已完成', value: '38（80.9%）', highlight: true },
          { label: '进行中', value: '6', highlight: false },
          { label: '阻塞', value: '3', highlight: false },
          { label: '平均耗时', value: '2.4h / 任务', highlight: false },
          { label: '最快 Agent', value: '🔵 Aria · 0.8h', highlight: true },
        ],
        actions: [
          { label: '查看详情', variant: 'primary' },
          { label: '导出报告', variant: 'ghost' },
        ],
        footer: '数据更新于 12:00 · 下次刷新 14:00',
      },
      meta: { model: 'GPT-4o', tokens: 220, summary: '本周任务完成率 80.9%，Aria 为最高效 Agent', durationMs: 980 },
    };
  }

  // 5. 默认文本（带 CoT）
  const longReply = `好的，我来为你详细解答这个问题。

OwlOS 的核心设计理念是**意图驱动**——系统在接收到用户输入后，会先对意图进行分类：

1. **简单意图**（单轮问答）→ 直接由 Aria 主 Agent 回复
2. **复杂意图**（多步骤任务）→ 自动组建 Agent 团队协作
3. **自动化意图**（定时/触发型）→ 编排至工作流引擎

整个流程对用户透明，你只需要用自然语言表达需求即可。`;

  return {
    type: 'agent',
    contentType: 'text',
    content: longReply,
    agentId,
    status: 'done',
    cotSteps: [
      { id: 'c1', title: '意图分类', content: '检测到通用问答意图，选择文本回复模式', duration: 95 },
      { id: 'c2', title: '知识检索', content: '从知识库检索 OwlOS 架构相关段落，命中 3 条', duration: 210 },
    ],
    meta: { model: 'GPT-4o', tokens: 186, summary: '意图驱动三模式：单聊、协作、自动化', durationMs: 1120 },
  };
}

/* ─── ChatContainer ───────────────────────────────────────────────────── */
interface ChatContainerProps {
  chatMode: AppMode;
  currentConversation: Conversation | null;
  setCurrentConversation: (c: Conversation | null) => void;
  setChatMode: (m: AppMode) => void;
}

export default function ChatContainer({
  chatMode, currentConversation, setCurrentConversation, setChatMode,
}: ChatContainerProps) {
  const [messages, setMessages] = useState<Message[]>(MESSAGES_SQUAD);
  const [showUpgradeBar, setShowUpgradeBar] = useState(false);
  const [taskBoardOpen, setTaskBoardOpen] = useState(false);
  const [monitorOpen, setMonitorOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const stopStreamRef = useRef<(() => void) | null>(null);

  /* ── 可拖拽面板宽度 ──────────────────────────────────────────── */
  const monitorRef = useRef<HTMLDivElement>(null);
  const [monitorWidth, setMonitorWidth] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!monitorOpen) return;
    function onMove(e: MouseEvent) {
      if (!dragging) return;
      const vw = window.innerWidth;
      const minPx = Math.min(320, vw * 0.4);
      const maxPx = vw * 0.85;
      const newW = Math.max(minPx, Math.min(maxPx, vw - e.clientX));
      setMonitorWidth(newW);
    }
    function onUp() { setDragging(false); }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [dragging, monitorOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleStop = useCallback(() => {
    stopStreamRef.current?.();
    stopStreamRef.current = null;
    // 把最后一条 streaming 消息标记为 done
    setMessages(prev => prev.map(m =>
      m.status === 'streaming' ? { ...m, status: 'done' } : m
    ));
    setIsStreaming(false);
  }, []);

  const handleRetry = useCallback((msgId: string) => {
    // 找到该 AI 消息前的最后一条用户消息，重新触发
    setMessages(prev => {
      const idx = prev.findIndex(m => m.id === msgId);
      if (idx < 0) return prev;
      // 找前一条 user 消息
      for (let i = idx - 1; i >= 0; i--) {
        if (prev[i].type === 'user') {
          // 删除从那条 user 消息之后的所有消息
          return prev.slice(0, i + 1);
        }
      }
      return prev.slice(0, idx);
    });
    // 重新发送（延迟一帧等 state 更新）
    setTimeout(() => {
      setMessages(prev => {
        const userMsg = [...prev].reverse().find(m => m.type === 'user');
        if (userMsg) triggerAIReply(userMsg.content);
        return prev;
      });
    }, 50);
  }, []); // eslint-disable-line

  const triggerAIReply = useCallback((text: string) => {
    const defaultAgentId = AGENTS[0]?.id ?? 'aria';
    const replyTemplate = buildMockReply(text, defaultAgentId);
    const aiMsgId = `msg-ai-${Date.now()}`;

    // 先插入 streaming 占位
    const placeholderMsg: Message = {
      ...replyTemplate,
      id: aiMsgId,
      timestamp: new Date(),
      status: 'streaming',
      content: '',
      // 代码类型先不显示 codeBlock，等正文打完再显示
      codeBlock: undefined,
      cardData: undefined,
    };
    setMessages(prev => [...prev, placeholderMsg]);
    setIsStreaming(true);

    // 流式打出正文
    const fullContent = replyTemplate.content;
    const stopFn = streamText(
      fullContent,
      (chunk) => {
        setMessages(prev => prev.map(m =>
          m.id === aiMsgId ? { ...m, content: m.content + chunk } : m
        ));
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      },
      () => {
        // 打完后揭示附加内容（codeBlock / cardData / imageUrl）并标记 done
        setMessages(prev => prev.map(m =>
          m.id === aiMsgId
            ? {
                ...m,
                status: 'done',
                codeBlock: replyTemplate.codeBlock,
                cardData: replyTemplate.cardData,
                imageUrl: replyTemplate.imageUrl,
                imageCaption: replyTemplate.imageCaption,
              }
            : m
        ));
        setIsStreaming(false);
        stopStreamRef.current = null;
      },
      20,
    );
    stopStreamRef.current = stopFn;
  }, []);

  function handleSend(text: string) {
    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      type: 'user',
      content: text,
      timestamp: new Date(),
      status: 'done',
    };
    setMessages(prev => [...prev, newMsg]);

    const complexKeywords = ['增长', '方案', '分析', '设计', '工程', '竞品', '团队'];
    if (complexKeywords.some(k => text.includes(k)) && chatMode === 'single') {
      setShowUpgradeBar(true);
    }

    // 短暂延迟后触发 AI 回复（模拟网络往返）
    setTimeout(() => triggerAIReply(text), 400);
  }

  function handleSelectConv(c: Conversation) {
    setCurrentConversation(c);
    setChatMode(c.mode);
    handleStop();
    setMessages([]);
  }

  function handleNewConv() {
    setCurrentConversation(null);
    setChatMode('single');
    handleStop();
    setMessages([]);
  }

  const isSquad = chatMode === 'squad';
  const isAuto  = chatMode === 'auto';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── 标题栏 ── */}
      <ChatHeader
        title={currentConversation?.title ?? '新对话'}
        currentId={currentConversation?.id}
        onSelect={handleSelectConv}
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
            onConfirm={() => { setShowUpgradeBar(false); setChatMode('squad'); }}
            onDismiss={() => setShowUpgradeBar(false)}
          />
        )}
      </AnimatePresence>

      {/* ── 主区域 ── */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        {/* 消息流 */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {chatMode === 'single' ? (
            <SingleAgentChat conversationId={currentConversation?.id ?? 'single-fallback'} />
          ) : !currentConversation ? (
            <EmptyState onQuickAction={handleSend} />
          ) : (
            <MessageFlow
              messages={messages}
              messagesEndRef={messagesEndRef}
              onRetry={handleRetry}
            />
          )}
          {chatMode !== 'single' && (
            <InputArea onSend={handleSend} isStreaming={isStreaming} onStop={handleStop} />
          )}
        </div>

        {/* 浮动抽屉：任务看板 / 执行日志（覆盖在会话框上方）*/}
        <AnimatePresence>
          {taskBoardOpen && isSquad && (
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
          {taskBoardOpen && !isSquad && !isAuto && (
            <motion.div
              key="task-board-single"
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
                onMouseDown={() => {
                  if (monitorRef.current) {
                    setMonitorWidth(monitorRef.current.offsetWidth);
                  }
                  setDragging(true);
                }}
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
