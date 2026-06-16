/* 命令面板 Cmd+K */
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MessageSquare, Bot, Database, GitBranch, X } from 'lucide-react';

import { useApp } from '@/contexts/AppContext';
import { CONVERSATIONS, AGENTS, WORKFLOW_TEMPLATES } from '@/data/mockData';
import { KNOWLEDGE_DOCS } from '@owl-os/knowledge';

export default function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, setActiveModule, setCurrentConversation } = useApp();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

  const filtered = {
    conversations: CONVERSATIONS.filter(c => c.title.toLowerCase().includes(query.toLowerCase())).slice(0, 3),
    agents: AGENTS.filter(a => a.name.toLowerCase().includes(query.toLowerCase())).slice(0, 2),
    docs: KNOWLEDGE_DOCS.filter(d => d.name.toLowerCase().includes(query.toLowerCase())).slice(0, 2),
    workflows: WORKFLOW_TEMPLATES.filter(w => w.name.toLowerCase().includes(query.toLowerCase())).slice(0, 1),
  };

  function close() { setCommandPaletteOpen(false); }

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <>
          {/* 遮罩 */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
            onClick={close}
          />
          {/* 面板 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-xl z-50 rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: 'var(--panel-bg-solid)', border: '1px solid var(--border-subtle)', backdropFilter: 'blur(24px)' }}
          >
            {/* 输入框 */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Escape' && close()}
                placeholder="搜索会话、Agent、知识库、工作流..."
                className="flex-1 bg-transparent text-slate-200 text-sm placeholder-slate-500 outline-none"
              />
              <button onClick={close} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 结果区 */}
            <div className="p-2 max-h-80 overflow-y-auto">
              {filtered.conversations.length > 0 && (
                <Section label="最近会话" icon={<MessageSquare className="w-3.5 h-3.5" />}>
                  {filtered.conversations.map(c => (
                    <ResultItem key={c.id} label={c.title} sub={c.lastMessage}
                      onClick={() => { setCurrentConversation(c); setActiveModule('chat'); close(); }} />
                  ))}
                </Section>
              )}
              {filtered.agents.length > 0 && (
                <Section label="Agent" icon={<Bot className="w-3.5 h-3.5" />}>
                  {filtered.agents.map(a => (
                    <ResultItem key={a.id} label={a.name} sub={a.description}
                      onClick={() => { setActiveModule('settings'); close(); }} />
                  ))}
                </Section>
              )}
              {filtered.docs.length > 0 && (
                <Section label="知识库" icon={<Database className="w-3.5 h-3.5" />}>
                  {filtered.docs.map(d => (
                    <ResultItem key={d.id} label={d.name} sub={`${d.chunks} 个分块 · ${d.size}`}
                      onClick={() => { setActiveModule('knowledge'); close(); }} />
                  ))}
                </Section>
              )}
              {filtered.workflows.length > 0 && (
                <Section label="工作流" icon={<GitBranch className="w-3.5 h-3.5" />}>
                  {filtered.workflows.map(w => (
                    <ResultItem key={w.id} label={w.name} sub={w.description}
                      onClick={() => { setActiveModule('tools'); close(); }} />
                  ))}
                </Section>
              )}
              {!Object.values(filtered).some(arr => arr.length > 0) && (
                <p className="text-center text-slate-500 text-sm py-8">未找到相关内容</p>
              )}
            </div>
            <div className="px-4 py-2 border-t border-white/5 flex gap-4 text-xs text-slate-600">
              <span>↑↓ 导航</span><span>↵ 确认</span><span>Esc 关闭</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Section({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-500 font-medium">{icon}{label}</div>
      {children}
    </div>
  );
}

function ResultItem({ label, sub, onClick }: { label: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex flex-col items-start gap-0.5 px-3 py-2 rounded-lg hover:bg-white/8 transition-colors text-left">
      <span className="text-sm text-slate-200 font-medium">{label}</span>
      <span className="text-xs text-slate-500 truncate w-full">{sub}</span>
    </button>
  );
}
