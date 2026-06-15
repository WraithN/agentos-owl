/* 消息流容器 — 支持 text / code / image / card / tool_call 五种内容类型 */
import { useState, useEffect, type RefObject } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, Copy, Check, ChevronRight, RotateCcw, Pencil,
  Wrench, AlertCircle, Sparkles, Brain, ImageIcon, LayoutTemplate,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAgent } from '@/data/mockData';
import type { Message, CotStep, CardData, CodeBlockData } from '@/types';

function timeStr(date: Date) {
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

/* ── 流式光标 ────────────────────────────────────────────────────────── */
function StreamCursor() {
  return (
    <span className="inline-block w-0.5 h-3.5 bg-cyan-400 ml-0.5 align-middle animate-pulse rounded-sm" />
  );
}

/* ── 代码块（带语言徽章 + 复制 + 简易关键字着色） ────────────────────── */
function CodeBlock({ data, streaming }: { data: CodeBlockData; streaming?: boolean }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(data.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // 简易关键字着色（不依赖外部库）
  function highlight(code: string, lang: string) {
    const keywords = lang === 'python'
      ? ['def', 'return', 'if', 'else', 'elif', 'for', 'while', 'import', 'from', 'class', 'try', 'except', 'with', 'as', 'in', 'not', 'and', 'or', 'True', 'False', 'None', 'lambda', 'yield', 'async', 'await', 'pass', 'raise']
      : ['function', 'const', 'let', 'var', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'default', 'from', 'async', 'await', 'new', 'this', 'typeof', 'instanceof', 'try', 'catch', 'throw', 'true', 'false', 'null', 'undefined', 'interface', 'type', 'extends', 'implements'];

    const lines = code.split('\n');
    return lines.map((line, li) => {
      // 注释行
      if (line.trimStart().startsWith('//') || line.trimStart().startsWith('#')) {
        return (
          <span key={li} className="block">
            <span className="italic">{line}</span>
            {'\n'}
          </span>
        );
      }
      // 字符串匹配
      const parts: React.ReactNode[] = [];
      let remaining = line;
      let idx = 0;
      while (remaining.length > 0) {
        // 字符串字面量
        const strMatch = remaining.match(/^(["'`])(.*?)\1/);
        if (strMatch) {
          parts.push(<span key={idx++} className="text-emerald-400">{strMatch[0]}</span>);
          remaining = remaining.slice(strMatch[0].length);
          continue;
        }
        // 关键字
        const kwMatch = keywords.find(kw => new RegExp(`^\\b${kw}\\b`).test(remaining));
        if (kwMatch) {
          parts.push(<span key={idx++} className="text-cyan-400 font-medium">{kwMatch}</span>);
          remaining = remaining.slice(kwMatch.length);
          continue;
        }
        // 数字
        const numMatch = remaining.match(/^\b\d+\.?\d*\b/);
        if (numMatch) {
          parts.push(<span key={idx++} className="text-amber-400">{numMatch[0]}</span>);
          remaining = remaining.slice(numMatch[0].length);
          continue;
        }
        parts.push(<span key={idx++}>{remaining[0]}</span>);
        remaining = remaining.slice(1);
      }
      return <span key={li} className="block">{parts}{'\n'}</span>;
    });
  }

  return (
    <div className="mt-3 rounded-xl overflow-hidden"
      style={{
        background: 'rgba(8,12,28,0.70)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: 'var(--shadow-md), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}>
      {/* 顶栏 */}
      <div className="flex items-center justify-between px-4 py-2.5"
        style={{
          background: 'rgba(0,0,0,0.25)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 tracking-widest">
            {data.language.toUpperCase()}
          </span>
          {data.filename && (
            <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>{data.filename}</span>
          )}
        </div>
        <button onClick={copy}
          className="flex items-center gap-1.5 text-xs transition-all duration-150 btn-lift px-2 py-1 rounded-md"
          style={{ color: copied ? '#10b981' : 'var(--text-tertiary)' }}>
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      <pre className="p-4 text-xs font-mono overflow-x-auto leading-relaxed" style={{ color: '#cbd5e1' }}>
        {streaming
          ? <span className="italic" style={{ color: 'var(--text-tertiary)' }}>正在生成代码<StreamCursor /></span>
          : highlight(data.code, data.language)
        }
      </pre>
    </div>
  );
}

/* ── 图片消息 ────────────────────────────────────────────────────────── */
function ImageMessage({ url, caption, streaming }: { url: string; caption?: string; streaming?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  if (streaming) {
    return (
      <div className="mt-3 rounded-xl overflow-hidden flex items-center justify-center h-32 gap-2 text-xs"
        style={{
          background: 'rgba(0,0,0,0.20)',
          border: '1px solid var(--border-l2)',
          color: 'var(--text-tertiary)',
        }}>
        <ImageIcon className="w-4 h-4 animate-pulse" />
        <span>图片生成中<StreamCursor /></span>
      </div>
    );
  }
  return (
    <div className="mt-3 space-y-1.5">
      <div className="rounded-xl overflow-hidden relative"
        style={{
          background: 'rgba(0,0,0,0.20)',
          border: '1px solid var(--border-l2)',
          boxShadow: 'var(--shadow-sm)',
        }}>
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        )}
        <img
          src={url}
          alt={caption ?? '生成图片'}
          onLoad={() => setLoaded(true)}
          className={cn('w-full max-h-72 object-cover transition-opacity duration-300', loaded ? 'opacity-100' : 'opacity-0')}
        />
      </div>
      {caption && (
        <p className="text-xs px-1" style={{ color: 'var(--text-tertiary)' }}>{caption}</p>
      )}
    </div>
  );
}

/* ── 工具调用卡片 ─────────────────────────────────────────────────────── */
function ToolCallCard({ tc }: { tc: NonNullable<Message['toolCall']> }) {
  const [expanded, setExpanded] = useState(false);
  const isRunning = tc.status === 'running';
  const isDone = tc.status === 'done';
  const isError = tc.status === 'error';

  return (
    <div className="mt-2 mb-1 rounded-xl overflow-hidden"
      style={{
        background: isRunning ? 'rgba(6,182,212,0.05)' : isDone ? 'rgba(16,185,129,0.05)' : 'rgba(244,63,94,0.05)',
        border: `1px solid ${isRunning ? 'rgba(6,182,212,0.20)' : isDone ? 'rgba(16,185,129,0.22)' : 'rgba(244,63,94,0.22)'}`,
        boxShadow: isDone ? '0 2px 8px rgba(16,185,129,0.08)' : isRunning ? '0 2px 8px rgba(6,182,212,0.08)' : '0 2px 8px rgba(244,63,94,0.08)',
      }}>
      <button onClick={() => !isRunning && setExpanded(v => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left">
        <div className={cn(
          'w-6 h-6 rounded-md flex items-center justify-center shrink-0',
          isRunning ? 'bg-cyan-500/15' : isDone ? 'bg-emerald-500/15' : 'bg-rose-500/15',
        )}>
          <Wrench className={cn('w-3.5 h-3.5',
            isRunning ? 'text-cyan-400 animate-spin' : isDone ? 'text-emerald-400' : 'text-rose-400'
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{tc.toolIcon} {tc.toolName}</span>
            <span className={cn(
              'badge text-[10px]',
              isRunning ? 'badge-info' : isDone ? 'badge-success' : 'badge-error'
            )}>
              {isRunning ? '执行中' : isDone ? '完成' : '失败'}
            </span>
            {tc.duration && (
              <span className="text-[10px] ml-auto" style={{ color: 'var(--text-tertiary)' }}>
                {(tc.duration / 1000).toFixed(2)}s
              </span>
            )}
          </div>
          {tc.input && (
            <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-tertiary)' }}>
              {Object.entries(tc.input).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(' · ')}
            </p>
          )}
        </div>
        {!isRunning && (
          <ChevronRight className={cn('w-3.5 h-3.5 transition-transform shrink-0', expanded && 'rotate-90')}
            style={{ color: 'var(--text-tertiary)' }} />
        )}
      </button>
      <AnimatePresence>
        {expanded && tc.output && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }}
            className="overflow-hidden">
            <div className="px-3 pb-3 pt-0" style={{ borderTop: '1px solid var(--border-l1)' }}>
              <p className="text-[10px] font-medium mt-2 mb-1 uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>输出结果</p>
              <pre className="text-[11px] font-mono whitespace-pre-wrap leading-relaxed rounded-lg p-2.5"
                style={{
                  background: 'rgba(0,0,0,0.25)',
                  border: '1px solid var(--border-l1)',
                  color: '#94a3b8',
                }}>
                {JSON.stringify(tc.output, null, 2)}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── 结构化卡片（card 类型） ─────────────────────────────────────────── */
const CARD_BADGE_COLORS: Record<string, string> = {
  cyan:    'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
  emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  violet:  'bg-violet-500/15 text-violet-400 border-violet-500/25',
  amber:   'bg-amber-500/15 text-amber-400 border-amber-500/25',
};

function StructuredCard({ data }: { data: CardData }) {
  return (
    <div className="mt-3 rounded-2xl overflow-hidden card-lift"
      style={{
        background: 'var(--glass-l3)',
        backdropFilter: 'var(--glass-blur-l3)',
        WebkitBackdropFilter: 'var(--glass-blur-l3)',
        border: '1px solid var(--border-l2)',
        boxShadow: 'var(--shadow-sm)',
      }}>
      {/* 卡头 */}
      <div className="px-4 py-3 flex items-start justify-between gap-2"
        style={{ borderBottom: '1px solid var(--border-l1)' }}>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-balance" style={{ color: 'var(--text-primary)' }}>{data.title}</p>
          {data.subtitle && <p className="text-xs mt-0.5 text-pretty" style={{ color: 'var(--text-tertiary)' }}>{data.subtitle}</p>}
        </div>
        {data.badge && (
          <span className={cn(
            'badge text-[10px] whitespace-nowrap shrink-0',
            CARD_BADGE_COLORS[data.badgeColor ?? 'cyan']
          )}>
            {data.badge}
          </span>
        )}
      </div>
      {/* 数据行 */}
      {data.rows && data.rows.length > 0 && (
        <div>
          {data.rows.map((row, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2.5 gap-4 table-row-base"
              style={{ borderBottom: i < (data.rows?.length ?? 0) - 1 ? '1px solid var(--border-l1)' : undefined }}>
              <span className="text-xs shrink-0" style={{ color: 'var(--text-tertiary)' }}>{row.label}</span>
              <span className={cn(
                'text-xs font-medium text-right truncate',
                row.highlight ? 'table-cell-highlight' : ''
              )} style={!row.highlight ? { color: 'var(--text-secondary)' } : undefined}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      )}
      {/* 操作按钮 */}
      {data.actions && data.actions.length > 0 && (
        <div className="px-4 py-3 flex items-center gap-2" style={{ borderTop: '1px solid var(--border-l1)' }}>
          {data.actions.map((act, i) => (
            <button key={i} className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 btn-lift',
              act.variant === 'primary'
                ? 'btn-aurora text-white'
                : ''
            )}
            style={act.variant !== 'primary' ? {
              background: 'var(--surface-hover)',
              border: '1px solid var(--border-l2)',
              color: 'var(--text-secondary)',
            } : undefined}>
              {act.label}
            </button>
          ))}
        </div>
      )}
      {data.footer && (
        <div className="px-4 pb-3">
          <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{data.footer}</p>
        </div>
      )}
    </div>
  );
}

/* ── CoT 思维过程（可折叠） ─────────────────────────────────────────── */
function CotBlock({ steps, defaultOpen }: { steps: CotStep[]; defaultOpen?: boolean }) {
  const [expanded, setExpanded] = useState(defaultOpen ?? false);
  return (
    <div className="mb-2">
      <button onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-1.5 text-xs transition-colors group btn-lift px-2 py-1 rounded-lg"
        style={{ color: 'var(--text-tertiary)' }}>
        <Brain className="w-3.5 h-3.5 text-violet-400" />
        <span className="group-hover:text-violet-300 transition-colors">
          思考过程 <span style={{ color: 'var(--text-disabled)' }}>({steps.length} 步)</span>
        </span>
        <ChevronDown className={cn('w-3 h-3 transition-transform', expanded && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="overflow-hidden">
            <div className="mt-2 pl-3 border-l-2 border-violet-500/30 space-y-2.5">
              {steps.map(step => (
                <div key={step.id} className="text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-violet-400 font-medium">{step.title}</span>
                    <span style={{ color: 'var(--text-disabled)' }}>· {step.duration}ms</span>
                  </div>
                  <p className="mt-0.5 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>{step.content}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
          <CotBlock steps={msg.cotSteps} />
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
        {msg.toolCall && <ToolCallCard tc={msg.toolCall} />}

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
          <StructuredCard data={msg.cardData} />
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

/* ── 旧版 CodeBlock 向后兼容（ChatModule 内联使用） ── */
export { CodeBlock };
