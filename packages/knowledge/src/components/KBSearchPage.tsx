import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Database, Search, ChevronLeft, Star, Bot, User, Send, Sparkles,
} from 'lucide-react';
import { KNOWLEDGE_DOCS, DOC_CHUNKS } from '../mock.js';
import type { KnowledgeBase, ChatMessage } from '../types.js';

export default function KBSearchPage({ kb, onBack }: { kb: KnowledgeBase; onBack: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  function send() {
    if (!input.trim() || thinking) return;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setThinking(true);
    setTimeout(() => {
      const chunks = DOC_CHUNKS.map((c, i) => ({ chunk: c, docName: KNOWLEDGE_DOCS[i % KNOWLEDGE_DOCS.length].name, score: +(0.97 - i * 0.06).toFixed(2) }));
      setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: `根据知识库「${kb.name}」检索到以下相关内容：`, chunks }]);
      setThinking(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }, 1200);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 shrink-0 border-b border-[var(--border-subtle)] flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 px-2.5 py-1.5 rounded-lg transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" />返回
        </button>
        <div className="h-4 w-px bg-[var(--border-subtle)]" />
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{kb.name}</span>
          <span className="text-xs text-slate-500">· AI检索</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-xs text-slate-500">基于向量语义检索</span>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400 select-none">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#00f2c320,#7c3aed20)', border: '1px solid rgba(124,58,237,0.2)' }}>
              <Search className="w-7 h-7 text-violet-400" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">向知识库提问，AI将返回最相关的内容</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {['这个知识库包含哪些主题？', '帮我总结主要内容', '有哪些关键概念？'].map(q => (
                <button key={q} onClick={() => setInput(q)}
                  className="px-3 py-1.5 text-xs text-slate-500 border border-[var(--border-subtle)] rounded-xl hover:border-violet-500/40 hover:text-violet-400 transition-all">{q}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map(msg => (
          <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            {msg.role === 'user' ? (
              <div className="flex justify-end gap-2.5">
                <div className="max-w-[70%] px-4 py-3 rounded-2xl rounded-tr-sm text-sm leading-relaxed text-white" style={{ background: 'linear-gradient(135deg,#00c2a8,#7c3aed)' }}>{msg.content}</div>
                <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center bg-slate-200 dark:bg-slate-700 mt-0.5"><User className="w-4 h-4 text-slate-600 dark:text-slate-300" /></div>
              </div>
            ) : (
              <div className="flex gap-2.5">
                <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center mt-0.5"
                  style={{ background: 'linear-gradient(135deg,#00f2c320,#7c3aed20)', border: '1px solid rgba(124,58,237,0.25)' }}>
                  <Bot className="w-4 h-4 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0 space-y-3">
                  <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-black/5 dark:bg-white/5 border border-[var(--border-subtle)] text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{msg.content}</div>
                  {msg.chunks && msg.chunks.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold text-slate-500 ml-1">引用知识块</p>
                      {msg.chunks.map((item, ci) => (
                        <motion.div key={item.chunk.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: ci * 0.06 }}
                          className="p-3 rounded-xl border border-[var(--border-subtle)] bg-black/3 dark:bg-white/3 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-cyan-500 dark:text-cyan-400">Chunk #{item.chunk.index + 1}</span>
                              <span className="text-[10px] text-slate-500 truncate max-w-[160px]">{item.docName}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                              <span className="text-xs font-semibold text-amber-500 dark:text-amber-400">{item.score}</span>
                            </div>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-pretty line-clamp-3">{item.chunk.content}</p>
                          <p className="text-[10px] text-slate-400">{item.chunk.tokens} tokens</p>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        ))}
        {thinking && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5">
            <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#00f2c320,#7c3aed20)', border: '1px solid rgba(124,58,237,0.25)' }}>
              <Bot className="w-4 h-4 text-violet-400" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-black/5 dark:bg-white/5 border border-[var(--border-subtle)] flex items-center gap-1.5">
              {[0, 0.15, 0.3].map(delay => (
                <motion.div key={delay} className="w-1.5 h-1.5 rounded-full bg-violet-400"
                  animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay }} />
              ))}
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="px-6 py-4 shrink-0 border-t border-[var(--border-subtle)]">
        <div className="flex items-end gap-3 max-w-3xl mx-auto">
          <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey} rows={1}
            placeholder="输入问题向知识库提问... (Enter 发送，Shift+Enter 换行)"
            className="flex-1 min-w-0 bg-black/5 dark:bg-white/5 border border-[var(--border-subtle)] focus:border-violet-500/50 rounded-2xl px-4 py-3 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 outline-none resize-none transition-colors leading-relaxed"
            style={{ minHeight: 48, maxHeight: 160 }} />
          <button onClick={send} disabled={!input.trim() || thinking}
            className="flex items-center justify-center w-11 h-11 rounded-2xl btn-aurora text-white disabled:opacity-40 shrink-0 transition-all">
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-slate-400 text-center mt-2">AI 基于知识块向量相似度检索，结果仅供参考</p>
      </div>
    </div>
  );
}
