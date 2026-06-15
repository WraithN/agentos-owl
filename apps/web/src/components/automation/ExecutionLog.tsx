/* 自动化执行日志面板 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Pause, Square, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WORKFLOW_NODES } from '@/data/mockData';
import type { NodeStatus } from '@/types';

const nodeTypeColor: Record<string, string> = {
  trigger:   'border-emerald-500/60 text-emerald-400',
  llm:       'border-purple-500/60 text-purple-400',
  tool:      'border-cyan-500/60 text-cyan-400',
  condition: 'border-amber-500/60 text-amber-400',
  end:       'border-rose-500/60 text-rose-400',
};

function StatusIcon({ status }: { status: NodeStatus }) {
  if (status === 'done')    return <span className="text-emerald-400">✅</span>;
  if (status === 'error')   return <span className="text-rose-400">❌</span>;
  if (status === 'running') return <div className="w-4 h-4 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />;
  return <div className="w-4 h-4 rounded-full border border-slate-600/50" />;
}

export default function ExecutionLog() {
  const [expandedId, setExpandedId] = useState<string | null>('node-2');
  const done = WORKFLOW_NODES.filter(n => n.status === 'done').length;
  const progress = Math.round((done / WORKFLOW_NODES.length) * 100);

  return (
    <div
      className="w-full h-full flex flex-col border-l border-[var(--border-subtle)] overflow-hidden"
      style={{ background: 'var(--panel-bg)', backdropFilter: 'blur(16px)' }}
    >
      {/* 标题栏 */}
      <div className="px-4 py-3 border-b border-[var(--border-subtle)] shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-xs text-slate-500">工作流</span>
            <p className="text-sm font-semibold text-slate-100">每日竞品监控</p>
          </div>
          <span className="text-xs font-mono aurora-text">{progress}%</span>
        </div>
        {/* 总进度 */}
        <div className="h-1 rounded-full bg-white/8 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1.2 }}
            className="h-full"
            style={{ background: 'linear-gradient(90deg, #00f2c3, #7c3aed)' }}
          />
        </div>
      </div>

      {/* 节点列表 */}
      <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-2">
        {WORKFLOW_NODES.map((node, i) => {
          const typeClass = nodeTypeColor[node.type] ?? 'border-slate-500/60 text-slate-400';
          const isExpanded = expandedId === node.id;
          return (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div
                className={cn(
                  'rounded-xl overflow-hidden border transition-colors',
                  'border-white/8',
                  node.status === 'running' && 'border-cyan-500/30 shadow-[0_0_12px_rgba(0,242,195,0.08)]'
                )}
                style={{ background: 'var(--surface-hover)' }}
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : node.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left"
                >
                  <StatusIcon status={node.status} />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-slate-200 font-medium">{node.name}</span>
                    {node.duration && (
                      <span className="text-[10px] text-slate-600 ml-2">{(node.duration / 1000).toFixed(1)}s</span>
                    )}
                  </div>
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-mono', typeClass)}>
                    {node.type}
                  </span>
                  {(node.input || node.output) && (
                    <ChevronRight className={cn('w-3 h-3 text-slate-600 transition-transform shrink-0', isExpanded && 'rotate-90')} />
                  )}
                </button>

                {isExpanded && (node.input || node.output) && (
                  <motion.div
                    initial={{ height: 0 }} animate={{ height: 'auto' }}
                    className="overflow-hidden border-t border-white/5"
                  >
                    <div className="px-3 py-2 space-y-2 text-xs font-mono">
                      {node.input && (
                        <div>
                          <p className="text-slate-500 mb-1">输入</p>
                          <p className="text-slate-400 leading-relaxed">{node.input}</p>
                        </div>
                      )}
                      {node.output && (
                        <div>
                          <p className="text-slate-500 mb-1">输出</p>
                          <p className="text-emerald-400/80 leading-relaxed">{node.output}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* 操作栏 */}
      <div className="flex items-center justify-center gap-3 px-4 py-3 border-t border-white/5 shrink-0">
        <button className="p-2 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors">
          <Pause className="w-4 h-4" />
        </button>
        <button className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
          <Square className="w-4 h-4" />
        </button>
        <div className="h-4 w-px bg-white/10" />
        <div className="flex text-xs text-slate-500 gap-2">
          <button className="px-2 py-1 rounded bg-white/8 hover:bg-white/12 transition-colors">1x</button>
          <button className="px-2 py-1 rounded hover:bg-white/8 transition-colors">2x</button>
        </div>
      </div>
    </div>
  );
}
