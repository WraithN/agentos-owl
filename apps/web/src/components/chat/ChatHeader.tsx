/* Chat 标题栏 */
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid, Plus, History, Search, Users, Bot, Activity, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CONVERSATIONS } from '@/data/mockData';
import { AGENTS, getAgent } from '@owl-os/chat';
import type { Conversation } from '@/types';
import type { Agent } from '@owl-os/chat';

function ModeIcon({ mode }: { mode: string }) {
  if (mode === 'squad') return <Users className="w-3 h-3 text-purple-400 shrink-0" />;
  if (mode === 'auto')  return <Zap   className="w-3 h-3 text-cyan-400   shrink-0" />;
  return <Bot className="w-3 h-3 text-slate-400 shrink-0" />;
}

function timeShort(date: Date) {
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function useClickOutside(ref: React.RefObject<HTMLDivElement | null>, open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, open, onClose]);
}

/* ── 会话历史下拉 ──────────────────────────────────────────────────────── */
interface HistoryDropdownProps {
  open: boolean;
  onClose: () => void;
  onSelect: (c: Conversation) => void;
  currentId?: string;
}
function HistoryDropdown({ open, onClose, onSelect, currentId }: HistoryDropdownProps) {
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, open, onClose);

  const filtered = CONVERSATIONS.filter(c =>
    c.title.toLowerCase().includes(query.toLowerCase())
  );

  if (!open) return null;
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="absolute top-full right-0 mt-1 w-72 z-50 rounded-xl overflow-hidden shadow-2xl border border-[var(--border-subtle)]"
      style={{ background: 'var(--panel-bg-solid)', backdropFilter: 'blur(20px)' }}
    >
      <div className="p-2 border-b border-[var(--border-subtle)]">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="搜索会话..."
            className="w-full bg-white/5 border border-white/8 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-cyan-500/50 transition-colors"
          />
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5">
        {filtered.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-4">没有匹配的会话</p>
        )}
        {filtered.map(c => {
          const agents = (c.agentIds ?? []).slice(0, 4).map(id => getAgent(id)).filter(Boolean);
          return (
            <button
              key={c.id}
              onClick={() => { onSelect(c); onClose(); }}
              className={cn(
                'w-full flex items-start gap-2.5 px-2.5 py-2.5 rounded-lg text-left transition-all',
                c.id === currentId
                  ? 'bg-cyan-500/15 border border-cyan-500/25'
                  : 'hover:bg-white/6 border border-transparent'
              )}
            >
              <div className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                c.mode === 'squad' ? 'bg-purple-500/20' : c.mode === 'auto' ? 'bg-cyan-500/20' : 'bg-slate-700/50'
              )}>
                <ModeIcon mode={c.mode} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('text-xs font-medium truncate', c.id === currentId ? 'text-cyan-400' : 'text-slate-200')}>
                  {c.title}
                </p>
                <p className="text-[10px] text-slate-500 truncate mt-0.5">{c.lastMessage}</p>
                {/* 智能体团队小标签 */}
                {agents.length > 0 && (
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    {agents.map(a => a && (
                      <span
                        key={a.id}
                        className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-md font-medium"
                        style={{
                          background: `${a.color}18`,
                          border: `1px solid ${a.color}40`,
                          color: a.color,
                        }}
                      >
                        <span className="font-bold">{a.avatar}</span>
                        {a.name}
                      </span>
                    ))}
                    {(c.agentIds ?? []).length > 4 && (
                      <span className="text-[9px] text-slate-500">+{(c.agentIds ?? []).length - 4}</span>
                    )}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-600 shrink-0 mt-0.5">{timeShort(c.lastTime)}</span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ── Agent 状态下拉 ────────────────────────────────────────────────────── */
function AgentDropdown({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, open, onClose);

  const STATUS_CFG = {
    working: { label: '工作中', dot: 'bg-amber-400 animate-pulse' },
    idle:    { label: '空闲',   dot: 'bg-emerald-400' },
    blocked: { label: '阻塞',   dot: 'bg-rose-400' },
    offline: { label: '离线',   dot: 'bg-slate-600' },
  } as const;

  if (!open) return null;
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="absolute top-full right-0 mt-1 w-64 z-50 rounded-xl overflow-hidden shadow-2xl border border-[var(--border-subtle)]"
      style={{ background: 'var(--panel-bg-solid)', backdropFilter: 'blur(20px)' }}
    >
      <div className="px-3 py-2.5 border-b border-[var(--border-subtle)]">
        <span className="text-xs font-semibold text-slate-300">智能体状态</span>
      </div>
      <div className="p-1.5 space-y-0.5 max-h-80 overflow-y-auto">
        {AGENTS.map((agent: Agent) => {
          const sc = STATUS_CFG[agent.status];
          return (
            <div
              key={agent.id}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/5 transition-colors cursor-default"
            >
              {/* 头像 */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                style={{ background: `${agent.color}25`, border: `1.5px solid ${agent.color}50`, color: agent.color }}
              >
                {agent.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-200 truncate">{agent.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{agent.description.split('·')[0].trim()}</p>
              </div>
              {/* 状态点 + 文字 */}
              <div className="flex items-center gap-1 shrink-0">
                <span className={cn('w-1.5 h-1.5 rounded-full', sc.dot)} />
                <span className="text-[10px] text-slate-500">{sc.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ── Chat 标题栏 ───────────────────────────────────────────────────────── */
interface ChatHeaderProps {
  title: string;
  currentId?: string;
  onSelect: (c: Conversation) => void;
  onNew: () => void;
  taskBoardOpen: boolean;
  onToggleTaskBoard: () => void;
  monitorOpen: boolean;
  onToggleMonitor: () => void;
}
export default function ChatHeader({
  title, currentId, onSelect, onNew,
  taskBoardOpen, onToggleTaskBoard, monitorOpen, onToggleMonitor,
}: ChatHeaderProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);

  return (
    <div
      className="shrink-0 flex items-center gap-2 px-4 h-11 border-b border-[var(--border-subtle)] z-20 relative"
      style={{ background: 'var(--topbar-bg)', backdropFilter: 'blur(16px)' }}
    >
      {/* 标题 */}
      <span className="flex-1 min-w-0 text-sm font-medium text-slate-200 truncate">{title}</span>

      {/* 右侧操作按钮 — 顺序：智能体 / 会话历史 / 新增会话 / 任务看板 */}
      <div className="flex items-center gap-0.5 shrink-0">

        {/* 1. 智能体 */}
        <div className="relative">
          <button
            onClick={() => { setAgentOpen(v => !v); setHistoryOpen(false); }}
            className={cn(
              'p-2 rounded-lg transition-colors',
              agentOpen ? 'text-cyan-400 bg-cyan-500/15' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
            )}
            title="智能体"
          >
            <Bot className="w-4 h-4" />
          </button>
          <AnimatePresence>
            {agentOpen && <AgentDropdown open={agentOpen} onClose={() => setAgentOpen(false)} />}
          </AnimatePresence>
        </div>

        {/* 2. 会话历史 */}
        <div className="relative">
          <button
            onClick={() => { setHistoryOpen(v => !v); setAgentOpen(false); }}
            className={cn(
              'p-2 rounded-lg transition-colors',
              historyOpen ? 'text-cyan-400 bg-cyan-500/15' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
            )}
            title="会话历史"
          >
            <History className="w-4 h-4" />
          </button>
          <AnimatePresence>
            {historyOpen && (
              <HistoryDropdown
                open={historyOpen}
                onClose={() => setHistoryOpen(false)}
                onSelect={onSelect}
                currentId={currentId}
              />
            )}
          </AnimatePresence>
        </div>

        {/* 3. 新建会话 */}
        <button
          onClick={onNew}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
          title="新建会话"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* 4. 任务看板 */}
        <button
          onClick={() => { onToggleTaskBoard(); setHistoryOpen(false); setAgentOpen(false); }}
          className={cn(
            'p-2 rounded-lg transition-colors',
            taskBoardOpen ? 'text-cyan-400 bg-cyan-500/15' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
          )}
          title="任务看板"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>

        {/* 5. 运行监控 */}
        <button
          onClick={() => { onToggleMonitor(); setHistoryOpen(false); setAgentOpen(false); }}
          className={cn(
            'p-2 rounded-lg transition-colors',
            monitorOpen ? 'text-cyan-400 bg-cyan-500/15' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
          )}
          title="运行监控"
        >
          <Activity className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
