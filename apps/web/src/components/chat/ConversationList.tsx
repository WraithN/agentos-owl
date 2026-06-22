/* 会话列表侧栏 */
import { useState, useEffect } from 'react';
import { Plus, Search, Pin, Archive, Trash2, Bot, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';
import { listConversations } from '@/services/electron';
import type { Conversation } from '@/types';

function timeShort(date: Date) {
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function ModeIcon({ mode }: { mode: string }) {
  if (mode === 'auto') return <Zap className="w-3 h-3 text-cyan-400 shrink-0" />;
  return <Bot className="w-3 h-3 text-slate-400 shrink-0" />;
}

export default function ConversationList({ onToggle }: { onToggle: () => void }) {
  const { currentConversation, setCurrentConversation, setChatMode } = useApp();
  const [query, setQuery] = useState('');
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    listConversations().then(setConversations).catch(() => setConversations([]));
  }, []);

  const filtered = conversations.filter(c =>
    c.title.toLowerCase().includes(query.toLowerCase())
  );
  const today = filtered.filter(c => Date.now() - c.lastTime.getTime() < 86400000);
  const older = filtered.filter(c => Date.now() - c.lastTime.getTime() >= 86400000);

  function select(c: Conversation) {
    setCurrentConversation(c);
    setChatMode(c.mode);
    onToggle();
  }

  return (
    <div
      className="w-full h-full flex flex-col border-r border-[var(--border-subtle)]"
      style={{ background: 'var(--panel-bg)', backdropFilter: 'blur(16px)' }}
    >
      {/* 顶部 */}
      <div className="p-3 space-y-2 shrink-0 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="搜索会话..."
              className="w-full bg-white/5 border border-white/8 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-cyan-500/50"
            />
          </div>
          <button className="p-1.5 btn-aurora rounded-lg shrink-0">
            <Plus className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto min-h-0 p-2">
        {today.length > 0 && <GroupLabel label="今天" />}
        {today.map(c => (
          <ConvItem key={c.id} conv={c} active={currentConversation?.id === c.id}
            hovered={hoverId === c.id} onHover={setHoverId} onSelect={select} />
        ))}
        {older.length > 0 && <GroupLabel label="更早" />}
        {older.map(c => (
          <ConvItem key={c.id} conv={c} active={currentConversation?.id === c.id}
            hovered={hoverId === c.id} onHover={setHoverId} onSelect={select} />
        ))}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <Bot className="w-8 h-8 text-slate-600 mb-2" />
            <p className="text-xs text-slate-600">暂无会话，开始新对话吧</p>
          </div>
        )}
      </div>
    </div>
  );
}

function GroupLabel({ label }: { label: string }) {
  return <p className="text-xs text-slate-600 font-medium px-2 py-1.5 mt-1">{label}</p>;
}

function ConvItem({
  conv, active, hovered, onHover, onSelect,
}: {
  conv: Conversation;
  active: boolean;
  hovered: boolean;
  onHover: (id: string | null) => void;
  onSelect: (c: Conversation) => void;
}) {
  return (
    <motion.div
      onHoverStart={() => onHover(conv.id)}
      onHoverEnd={() => onHover(null)}
      onClick={() => onSelect(conv)}
      className={cn(
        'relative flex items-start gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer transition-all duration-150 mb-0.5',
        active ? 'bg-white/8 border border-white/10' : 'hover:bg-white/5'
      )}
    >
      {/* 模式图标 */}
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
        conv.mode === 'auto' ? 'bg-cyan-500/20' : 'bg-slate-700/50'
      )}>
        <ModeIcon mode={conv.mode} />
      </div>

      {/* 内容 */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs font-medium text-slate-200 truncate">{conv.title}</span>
          <span className="text-[10px] text-slate-600 shrink-0">{timeShort(conv.lastTime)}</span>
        </div>
        <p className="text-[11px] text-slate-500 truncate mt-0.5 leading-tight">{conv.lastMessage}</p>
      </div>

      {/* 未读 */}
      {conv.unread > 0 && (
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-cyan-400 pulse-cyan" />
      )}

      {/* hover 操作 */}
      {hovered && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1"
          onClick={e => e.stopPropagation()}
        >
          <button className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-white/10"><Pin className="w-3 h-3" /></button>
          <button className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-white/10"><Archive className="w-3 h-3" /></button>
          <button className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 className="w-3 h-3" /></button>
        </motion.div>
      )}
    </motion.div>
  );
}
