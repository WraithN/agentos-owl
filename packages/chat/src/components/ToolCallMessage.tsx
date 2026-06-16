/* 工具调用卡片 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wrench, ChevronRight } from 'lucide-react';
import { cn } from '@owl-os/core';
import type { ToolCallInfo } from '../types.js';

export default function ToolCallMessage({ tc }: { tc: ToolCallInfo }) {
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
