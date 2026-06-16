/* 消息流容器 — 支持 text / code / image / card / tool_call 五种内容类型 */
import { useState, type RefObject } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Pencil, RotateCcw,
  AlertCircle, Sparkles,
} from 'lucide-react';
import { cn } from '@owl-os/core';
import { getAgent } from '../mock.js';
import type { Message } from '../types.js';
import CodeBlock from './CodeBlock.js';
import ImageMessage from './ImageMessage.js';
import CardMessage from './CardMessage.js';
import ToolCallMessage from './ToolCallMessage.js';
import CotSteps from './CotSteps.js';

function timeStr(date: Date) {
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

/* ── 流式光标 ────────────────────────────────────────────────────────── */
function StreamCursor() {
  return (
    <span className="inline-block w-0.5 h-3.5 bg-cyan-400 ml-0.5 align-middle animate-pulse rounded-sm" />
  );
}

/* ── AI 消息气泡 ─────────────────────────────────────────────────────── */
function AgentMessage({ msg, onRetry, onEdit }: {
  msg: Message;
  onRetry?: (id: string) => void;
  onEdit?: (id: string) => void;
}) {
  const agent = msg.agentId ? getAgent(msg.agentId) : null;
  const isStreaming = msg.status === 'streaming';
  const isError = msg.status === 'error';
  const contentType = msg.contentType ?? 'text';

  return (
    <motion.div
      className="flex justify-start gap-3 max-w-[80%]"
      initial={{ opacity: 0, x: -18, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {agent && <AgentAvatar agentId={agent.id} />}
      <div className="min-w-0 flex-1">
        {agent && <AgentLabel agentId={agent.id} time={msg.timestamp} meta={msg.meta} />}

        {/* 1. 思维过程（CoT 折叠） */}
        {msg.cotSteps && msg.cotSteps.length > 0 && (
          <CotSteps steps={msg.cotSteps} />
        )}

        {/* 2. 摘要高亮条 */}
        {msg.meta?.summary && !isStreaming && (
          <div className="mb-2 px-3 py-2 rounded-xl flex items-start gap-2"
            style={{
              background: 'linear-gradient(135deg, rgba(0,242,195,0.07) 0%, rgba(56,189,248,0.05) 100%)',
              border: '1px solid rgba(0,242,195,0.18)',
              boxShadow: '0 0 12px rgba(0,242,195,0.06)',
            }}>
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
            <p className="text-xs text-cyan-300 leading-relaxed">{msg.meta.summary}</p>
          </div>
        )}

        {/* 工具调用卡片 */}
        {msg.toolCall && <ToolCallMessage tc={msg.toolCall} />}

        {/* 3. 正文气泡 */}
        {(msg.content || isStreaming) && (
          <div
            className={cn(
              'mt-1 px-4 py-3 rounded-2xl rounded-tl-sm text-sm leading-relaxed transition-shadow',
              isError ? '' : 'card-lift'
            )}
            style={{
              background: isError
                ? 'rgba(244,63,94,0.06)'
                : 'var(--glass-l3)',
              backdropFilter: isError ? undefined : 'var(--glass-blur-l3)',
              WebkitBackdropFilter: isError ? undefined : 'var(--glass-blur-l3)',
              border: `1px solid ${isError ? 'rgba(244,63,94,0.28)' : 'var(--border-l2)'}`,
              borderLeft: agent && !isError ? `3px solid ${agent.color}` : undefined,
              boxShadow: isError
                ? '0 2px 8px rgba(244,63,94,0.10)'
                : `var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,0.04)`,
            }}
          >
            {isError ? (
              <div className="flex items-center gap-2 text-rose-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="text-xs">{msg.content || '生成失败，请重试'}</span>
              </div>
            ) : (
              <span className="whitespace-pre-wrap text-sm" style={{ color: 'var(--text-primary)' }}>
                {msg.content}
                {isStreaming && <StreamCursor />}
              </span>
            )}
          </div>
        )}

        {/* 代码块（streaming 时显示骨架） */}
        {contentType === 'code' && msg.codeBlock && (
          <CodeBlock data={msg.codeBlock} streaming={isStreaming && !msg.codeBlock.code} />
        )}

        {/* 图片 */}
        {contentType === 'image' && (
          <ImageMessage
            url={msg.imageUrl ?? ''}
            caption={msg.imageCaption}
            streaming={isStreaming}
          />
        )}

        {/* 结构化卡片 */}
        {contentType === 'card' && msg.cardData && !isStreaming && (
          <CardMessage data={msg.cardData} />
        )}

        {/* 底部操作行 */}
        {!isStreaming && (
          <div className="flex items-center gap-3 mt-1.5 px-1">
            {onRetry && (
              <button onClick={() => onRetry(msg.id)}
                className="flex items-center gap-1 text-[11px] transition-all duration-150 btn-lift px-1.5 py-0.5 rounded"
                style={{ color: 'var(--text-tertiary)' }}>
                <RotateCcw className="w-3 h-3" />重试
              </button>
            )}
            {onEdit && msg.type === 'user' && (
              <button onClick={() => onEdit(msg.id)}
                className="flex items-center gap-1 text-[11px] transition-all duration-150 btn-lift px-1.5 py-0.5 rounded"
                style={{ color: 'var(--text-tertiary)' }}>
                <Pencil className="w-3 h-3" />编辑
              </button>
            )}
            {msg.meta?.tokens && (
              <span className="text-[10px] ml-auto" style={{ color: 'var(--text-disabled)' }}>
                {msg.meta.tokens} tokens
                {msg.meta.durationMs ? ` · ${(msg.meta.durationMs / 1000).toFixed(1)}s` : ''}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ── 用户消息 ────────────────────────────────────────────────────────── */
function UserMessage({ msg, onEdit }: { msg: Message; onEdit?: (id: string) => void }) {
  return (
    <motion.div
      className="flex justify-end"
      initial={{ opacity: 0, x: 20, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div className="max-w-[60%]">
        <motion.div
          className="px-4 py-3 text-sm leading-relaxed"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.22) 0%, rgba(14,165,233,0.15) 100%)',
            borderRadius: '16px 16px 4px 16px',
            border: '1px solid rgba(99,102,241,0.28)',
            color: 'var(--text-primary)',
            boxShadow: '0 2px 12px rgba(99,102,241,0.15), var(--shadow-xs)',
          }}
          whileHover={{ scale: 1.015, boxShadow: '0 4px 20px rgba(99,102,241,0.22), var(--shadow-sm)' }}
          transition={{ duration: 0.15 }}
        >
          {msg.content}
        </motion.div>
        <div className="flex items-center justify-end gap-3 mt-1">
          {onEdit && (
            <motion.button onClick={() => onEdit(msg.id)}
              className="flex items-center gap-1 text-[11px] transition-all duration-150 btn-lift px-1.5 py-0.5 rounded"
              style={{ color: 'var(--text-tertiary)' }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}>
              <Pencil className="w-2.5 h-2.5" />编辑
            </motion.button>
          )}
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{timeStr(msg.timestamp)}</p>
        </div>
      </div>
    </motion.div>
  );
}

/* ── 系统消息 ────────────────────────────────────────────────────────── */
function SystemMessage({ msg }: { msg: Message }) {
  return (
    <motion.div
      className="flex justify-center my-2"
      initial={{ opacity: 0, y: -6, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      <div
        className="max-w-lg px-4 py-2 rounded-full text-xs text-center"
        style={{
          background: 'var(--surface-active)',
          border: '1px solid var(--border-l2)',
          color: 'var(--text-tertiary)',
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        <span className="aurora-text font-medium">系统</span>
        <span className="mx-2 opacity-40">·</span>
        {msg.content}
      </div>
    </motion.div>
  );
}

/* ── 审批消息 ────────────────────────────────────────────────────────── */
function ApprovalMessage({ msg }: { msg: Message }) {
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  return (
    <motion.div
      className="flex justify-start gap-3 max-w-[75%]"
      initial={{ opacity: 0, x: -14, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <AgentAvatar agentId={msg.agentId!} />
      <div>
        <AgentLabel agentId={msg.agentId!} time={msg.timestamp} />
        <div
          className="mt-1 px-4 py-3 rounded-2xl rounded-tl-sm text-sm leading-relaxed whitespace-pre-line"
          style={{
            background: 'rgba(245,158,11,0.07)',
            border: '1px solid rgba(245,158,11,0.22)',
            boxShadow: '0 2px 8px rgba(245,158,11,0.08)',
            color: 'var(--text-primary)',
          }}
        >
          {msg.content}
          {status === 'pending' ? (
            <div className="flex gap-2 mt-3">
              <button onClick={() => setStatus('approved')} className="px-3 py-1.5 rounded-lg text-xs font-medium btn-aurora text-white">
                批准
              </button>
              <button onClick={() => setStatus('rejected')}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 transition-colors">
                驳回
              </button>
            </div>
          ) : (
            <div className={cn('mt-3 text-xs font-medium', status === 'approved' ? 'text-emerald-400' : 'text-rose-400')}>
              {status === 'approved' ? '✅ 已批准' : '❌ 已驳回'}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ── 头像 & 标签 ─────────────────────────────────────────────────────── */
function AgentAvatar({ agentId }: { agentId: string }) {
  const agent = getAgent(agentId);
  if (!agent) return null;
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1"
      style={{ background: `${agent.color}28`, border: `2px solid ${agent.color}55`, color: agent.color }}
    >
      {agent.avatar}
    </div>
  );
}

function AgentLabel({ agentId, time, meta }: { agentId: string; time: Date; meta?: Message['meta'] }) {
  const agent = getAgent(agentId);
  if (!agent) return null;
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <span className="text-xs font-semibold" style={{ color: agent.color }}>{agent.name}</span>
      <span className="text-xs" style={{ color: 'var(--text-disabled)' }}>·</span>
      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{agent.description.split(' · ')[0]}</span>
      {meta?.model && (
        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{
          background: 'var(--surface-hover)',
          border: '1px solid var(--border-l2)',
          color: 'var(--text-tertiary)',
        }}>{meta.model}</span>
      )}
      <span className="text-xs ml-auto" style={{ color: 'var(--text-disabled)' }}>{timeStr(time)}</span>
    </div>
  );
}

/* ── 消息路由 ────────────────────────────────────────────────────────── */
function MessageItem({ msg, onRetry, onEdit }: {
  msg: Message;
  onRetry?: (id: string) => void;
  onEdit?: (id: string) => void;
}) {
  if (msg.type === 'user') return <UserMessage msg={msg} onEdit={onEdit} />;
  if (msg.type === 'system') return <SystemMessage msg={msg} />;
  if (msg.type === 'approval-request') return <ApprovalMessage msg={msg} />;
  return <AgentMessage msg={msg} onRetry={onRetry} onEdit={onEdit} />;
}

/* ── 分隔线（日期组） ────────────────────────────────────────────────── */
function DateDivider({ date }: { date: Date }) {
  const label = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' });
  return (
    <div className="flex items-center gap-3 my-3">
      <div className="flex-1 h-px bg-[var(--border-l1)]" />
      <span className="text-[10px] text-[var(--text-disabled)] px-2 shrink-0">{label}</span>
      <div className="flex-1 h-px bg-[var(--border-l1)]" />
    </div>
  );
}

/* ── 顶层导出 ────────────────────────────────────────────────────────── */
export default function MessageFlow({
  messages, messagesEndRef, onRetry, onEdit,
}: {
  messages: Message[];
  messagesEndRef: RefObject<HTMLDivElement | null>;
  convListOpen?: boolean;
  onOpenConvList?: () => void;
  onRetry?: (id: string) => void;
  onEdit?: (id: string) => void;
}) {
  // 每天第一条消息前插入日期分隔
  const items: Array<{ type: 'msg'; msg: Message } | { type: 'date'; date: Date; key: string }> = [];
  let lastDay = '';
  for (const msg of messages) {
    const day = msg.timestamp.toDateString();
    if (day !== lastDay) {
      items.push({ type: 'date', date: msg.timestamp, key: `date-${day}` });
      lastDay = day;
    }
    items.push({ type: 'msg', msg });
  }

  return (
    <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-4">
      <AnimatePresence initial={false}>
        {items.map((item, i) =>
          item.type === 'date' ? (
            <DateDivider key={item.key} date={item.date} />
          ) : (
            <motion.div
              key={item.msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.25, delay: Math.min(i * 0.025, 0.15), ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <MessageItem msg={item.msg} onRetry={onRetry} onEdit={onEdit} />
            </motion.div>
          )
        )}
      </AnimatePresence>
      <div ref={messagesEndRef} className="h-1" />
    </div>
  );
}

export { CodeBlock, ImageMessage, CardMessage, ToolCallMessage, CotSteps };
