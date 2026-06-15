/* 底部输入区 — 支持 / 指令、附件上传、语音输入、技能/提示词快捷插入 */
import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Paperclip, AtSign, Slash, Send, Users, ChevronUp, Check, Mic, MicOff, X, FileText, Image, Zap, Wand2, Search, Bookmark, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TEAM_TEMPLATES, AGENTS } from '@/data/mockData';
import type { TeamTemplate } from '@/types';

/* ── 技能列表（本地 mock） ───────────────────────────────────────────── */
const QUICK_SKILLS = [
  { id: 's1', name: '智能摘要',  desc: '自动提取长文档核心摘要', call: '@智能摘要' },
  { id: 's2', name: '代码审查',  desc: '基于规则与 AI 的代码质量检测', call: '@代码审查' },
  { id: 's3', name: '情感分析',  desc: '多粒度情感识别，支持评论、对话', call: '@情感分析' },
  { id: 's4', name: '邮件起草',  desc: '根据意图自动起草专业邮件', call: '@邮件起草' },
  { id: 's5', name: '数据清洗',  desc: '智能识别并修复结构化数据中的异常值', call: '@数据清洗' },
  { id: 's6', name: '会议纪要',  desc: '录音转文字并自动生成结构化会议纪要', call: '@会议纪要' },
  { id: 's7', name: 'SQL 生成',  desc: '自然语言转 SQL，支持多种数据库方言', call: '@SQL生成' },
  { id: 's9', name: '多语翻译',  desc: '支持 100+ 语言的高精度场景化翻译', call: '@多语翻译' },
];

/* ── 提示词列表（本地 mock） ─────────────────────────────────────────── */
const QUICK_PROMPTS = [
  { id: 'p1', name: '专业邮件写作', desc: '生成商务场景专业邮件', content: '你是一位专业的商务写作助手，请根据用户描述生成语气正式、逻辑清晰的商务邮件。' },
  { id: 'p2', name: '代码注释生成', desc: '为任意代码片段自动生成规范注释', content: '你是一位资深工程师，请为以下代码生成清晰规范的注释和文档说明。' },
  { id: 'p3', name: '产品需求分析', desc: '将用户描述转化为结构化 PRD', content: '你是一位产品经理，请将用户描述转化为结构化的产品需求文档，包含用户故事和验收标准。' },
  { id: 'p4', name: '面试问题生成', desc: '根据岗位 JD 生成针对性面试题目', content: '你是一位 HR 专家，请根据以下岗位描述生成有针对性的面试题目和评分标准。' },
  { id: 'p5', name: '市场竞品分析', desc: '多维度竞品对比框架，输出结构化报告', content: '你是一位市场分析师，请对以下产品进行多维度竞品分析并输出结构化报告。' },
  { id: 'p7', name: '技术方案撰写', desc: '根据需求描述生成详细技术实现方案', content: '你是一位架构师，请根据以下需求描述生成详细的技术实现方案，包含架构设计、技术选型和实施步骤。' },
  { id: 'p9', name: '周报自动撰写', desc: '结合工作记录生成专业周报', content: '你是一位专业助手，请根据以下工作记录生成结构清晰、重点突出的工作周报。' },
];

/* ── 快捷面板（技能 / 提示词） ──────────────────────────────────────── */
type PanelItem = { id: string; name: string; desc: string; insert: string };
function QuickPanel({ title, icon, items, onSelect, onClose }: {
  title: string; icon: React.ReactNode; items: PanelItem[];
  onSelect: (insert: string) => void; onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  const filtered = items.filter(it => it.name.includes(q) || it.desc.includes(q));

  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.97 }} transition={{ duration: 0.14 }}
      className="absolute bottom-full left-0 mb-2 w-80 z-50 rounded-xl overflow-hidden shadow-2xl border border-[var(--border-l2)]"
      style={{ background: 'var(--glass-l4)', backdropFilter: 'var(--glass-blur-l4)', WebkitBackdropFilter: 'var(--glass-blur-l4)', boxShadow: 'var(--shadow-lg)' }}>
      {/* 顶部 */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--border-l1)]">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)]">{icon}{title}</div>
        <button onClick={onClose} className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"><X className="w-3.5 h-3.5" /></button>
      </div>
      {/* 搜索 */}
      <div className="px-3 py-2 border-b border-[var(--border-l1)]">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={`搜索${title}…`}
            className="w-full bg-[var(--surface-hover)] border border-[var(--border-l2)] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[var(--text-secondary)] placeholder-[var(--text-disabled)] outline-none focus:border-cyan-500/40 transition-colors" />
        </div>
      </div>
      {/* 列表 */}
      <div className="max-h-52 overflow-y-auto p-1">
        {filtered.length === 0
          ? <p className="px-3 py-4 text-xs text-[var(--text-disabled)] text-center">无匹配结果</p>
          : filtered.map(it => (
            <button key={it.id} onClick={() => { onSelect(it.insert); onClose(); }}
              className="w-full flex items-start gap-2.5 px-3 py-2.5 rounded-lg hover:bg-[var(--surface-hover)] transition-colors text-left">
              <Bookmark className="w-3.5 h-3.5 text-[var(--text-tertiary)] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-[var(--text-primary)] truncate">{it.name}</p>
                <p className="text-[11px] text-[var(--text-tertiary)] line-clamp-1">{it.desc}</p>
              </div>
            </button>
          ))}
      </div>
    </motion.div>
  );
}

/* ── 斜杠指令列表 ─────────────────────────────────────────────────────── */
const SLASH_COMMANDS = [
  { command: '/search',   desc: '联网搜索信息',       icon: '🔍' },
  { command: '/analyze',  desc: '分析数据或文档',      icon: '📊' },
  { command: '/write',    desc: '生成文本内容',        icon: '✍️' },
  { command: '/code',     desc: '编写或解释代码',      icon: '💻' },
  { command: '/summarize',desc: '摘要归纳内容',        icon: '📝' },
  { command: '/translate',desc: '翻译文本',            icon: '🌐' },
  { command: '/image',    desc: '生成图片',            icon: '🖼️' },
  { command: '/plan',     desc: '制定任务计划',        icon: '📋' },
];

/* ── 附件类型 ─────────────────────────────────────────────────────────── */
interface Attachment { id: string; name: string; size: string; type: 'image' | 'file' }

/* ── 智能体团队上拉选择器 ──────────────────────────────────────────────── */
function TeamPicker({ open, onClose, selectedId, onSelect }: {
  open: boolean; onClose: () => void; selectedId: string | null; onSelect: (t: TeamTemplate) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.97 }} transition={{ duration: 0.15 }}
      className="absolute bottom-full left-0 mb-2 w-80 z-50 rounded-xl overflow-hidden shadow-2xl border border-[var(--border-l2)]"
      style={{ background: 'var(--glass-l4)', backdropFilter: 'var(--glass-blur-l4)', WebkitBackdropFilter: 'var(--glass-blur-l4)', boxShadow: 'var(--shadow-lg)' }}>
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--border-l1)]">
        <span className="text-xs font-semibold text-[var(--text-secondary)]">选择智能体团队</span>
        <ChevronUp className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
      </div>
      <div className="p-1.5 space-y-1">
        {TEAM_TEMPLATES.map(team => {
          const isSelected = team.id === selectedId;
          const members = team.memberIds.map(id => AGENTS.find(a => a.id === id)).filter(Boolean);
          return (
            <button key={team.id} onClick={() => { onSelect(team); onClose(); }}
              className={cn('w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-all',
                isSelected ? 'bg-cyan-500/15 border border-cyan-500/25' : 'hover:bg-[var(--surface-hover)] border border-transparent')}>
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5', isSelected ? 'bg-cyan-500/25' : 'bg-[var(--surface-hover)]')}>
                <Users className={cn('w-4 h-4', isSelected ? 'text-cyan-400' : 'text-[var(--text-tertiary)]')} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={cn('text-xs font-semibold truncate', isSelected ? 'text-cyan-400' : 'text-[var(--text-primary)]')}>{team.name}</span>
                  {!team.enabled && <span className="text-[10px] text-[var(--text-disabled)] bg-[var(--surface-hover)] border border-[var(--border-l1)] px-1.5 rounded shrink-0">未启用</span>}
                  {team.mode === 'parallel'
                    ? <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 rounded shrink-0">并行</span>
                    : <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 rounded shrink-0">顺序</span>}
                </div>
                <p className="text-[11px] text-[var(--text-tertiary)] leading-tight line-clamp-2 mb-1.5">{team.description}</p>
                <div className="flex items-center gap-1">
                  {members.map(a => a && (
                    <div key={a.id} className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                      style={{ background: `${a.color}25`, border: `1.5px solid ${a.color}50`, color: a.color }} title={a.name}>{a.avatar}</div>
                  ))}
                  <span className="text-[10px] text-[var(--text-disabled)] ml-1">{members.length} 位成员</span>
                </div>
              </div>
              {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-1" />}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ── InputArea ─────────────────────────────────────────────────────────── */
export default function InputArea({
  onSend,
  isStreaming = false,
  onStop,
}: {
  onSend: (text: string) => void;
  isStreaming?: boolean;
  onStop?: () => void;
}) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [teamPickerOpen, setTeamPickerOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [skillPanelOpen, setSkillPanelOpen] = useState(false);
  const [promptPanelOpen, setPromptPanelOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function insertText(insert: string) {
    const t = text ? text + ' ' + insert : insert;
    setText(t + ' ');
    setTimeout(() => textareaRef.current?.focus(), 30);
  }

  const selectedTeam = TEAM_TEMPLATES.find(t => t.id === selectedTeamId) ?? null;

  /* ── 斜杠指令过滤 ── */
  const filteredCommands = SLASH_COMMANDS.filter(c =>
    slashQuery === '' || c.command.toLowerCase().includes(slashQuery.toLowerCase()) || c.desc.includes(slashQuery)
  );

  function handleTextChange(val: string) {
    setText(val);
    // 检测 / 触发
    const lastSlash = val.lastIndexOf('/');
    if (lastSlash >= 0 && (lastSlash === 0 || val[lastSlash - 1] === ' ' || val[lastSlash - 1] === '\n')) {
      setSlashQuery(val.slice(lastSlash + 1));
      setSlashOpen(true);
    } else {
      setSlashOpen(false);
    }
  }

  function selectCommand(cmd: string) {
    const lastSlash = text.lastIndexOf('/');
    setText(text.slice(0, lastSlash) + cmd + ' ');
    setSlashOpen(false);
    setTimeout(() => textareaRef.current?.focus(), 30);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Escape' && slashOpen) { setSlashOpen(false); return; }
    if (e.key === 'Enter' && !e.shiftKey && !slashOpen) { e.preventDefault(); handleSend(); }
  }

  function handleSend() {
    if (!text.trim() && attachments.length === 0) return;
    onSend(text.trim());
    setText('');
    setAttachments([]);
    setSlashOpen(false);
    textareaRef.current?.focus();
  }

  /* ── 附件上传 ── */
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const newAttachments: Attachment[] = files.map(f => ({
      id: `att-${Date.now()}-${Math.random()}`,
      name: f.name,
      size: f.size > 1024 * 1024 ? `${(f.size / 1024 / 1024).toFixed(1)}MB` : `${(f.size / 1024).toFixed(0)}KB`,
      type: f.type.startsWith('image/') ? 'image' : 'file',
    }));
    setAttachments(prev => [...prev, ...newAttachments]);
    e.target.value = '';
  }

  function removeAttachment(id: string) {
    setAttachments(prev => prev.filter(a => a.id !== id));
  }

  /* ── 语音录音（模拟） ── */
  function toggleRecording() {
    if (recording) {
      // 停止录音
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      setRecording(false);
      const dur = recordSeconds;
      setRecordSeconds(0);
      // 模拟识别结果
      setText(prev => prev + (prev ? ' ' : '') + `[语音输入 ${dur}秒]`);
    } else {
      setRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => setRecordSeconds(s => s + 1), 1000);
    }
  }

  // 清理定时器
  useEffect(() => () => { if (recordTimerRef.current) clearInterval(recordTimerRef.current); }, []);

  return (
    <div className="shrink-0 px-4 py-3 border-t border-[var(--border-l2)]"
      style={{ background: 'var(--glass-l4)', backdropFilter: 'var(--glass-blur-l4)', WebkitBackdropFilter: 'var(--glass-blur-l4)', boxShadow: 'var(--shadow-xl)' }}>

      {/* 选中团队标签 */}
      <AnimatePresence>
        {selectedTeam && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <Users className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="text-xs text-cyan-400 font-medium flex-1 min-w-0 truncate">{selectedTeam.name}</span>
              <button onClick={() => setSelectedTeamId(null)} className="text-cyan-400/60 hover:text-cyan-400 transition-colors text-xs shrink-0">✕</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 附件预览 */}
      <AnimatePresence>
        {attachments.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-2">
            <div className="flex flex-wrap gap-1.5">
              {attachments.map(att => (
                <div key={att.id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[var(--surface-hover)] border border-[var(--border-l2)] group">
                  {att.type === 'image'
                    ? <Image className="w-3 h-3 text-violet-400 shrink-0" />
                    : <FileText className="w-3 h-3 text-[var(--text-tertiary)] shrink-0" />}
                  <span className="text-[11px] text-[var(--text-secondary)] max-w-[120px] truncate">{att.name}</span>
                  <span className="text-[10px] text-[var(--text-disabled)]">{att.size}</span>
                  <button onClick={() => removeAttachment(att.id)}
                    className="text-[var(--text-disabled)] hover:text-[var(--text-secondary)] transition-colors opacity-0 group-hover:opacity-100">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        {/* 团队选择上拉框 */}
        <AnimatePresence>
          {teamPickerOpen && (
            <TeamPicker open={teamPickerOpen} onClose={() => setTeamPickerOpen(false)}
              selectedId={selectedTeamId} onSelect={t => setSelectedTeamId(t.id)} />
          )}
        </AnimatePresence>

        {/* 技能面板 */}
        <AnimatePresence>
          {skillPanelOpen && (
            <QuickPanel
              title="技能"
              icon={<Zap className="w-3.5 h-3.5 text-cyan-400" />}
              items={QUICK_SKILLS.map(s => ({ id: s.id, name: s.name, desc: s.desc, insert: s.call }))}
              onSelect={insertText}
              onClose={() => setSkillPanelOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* 提示词面板 */}
        <AnimatePresence>
          {promptPanelOpen && (
            <QuickPanel
              title="提示词"
              icon={<Wand2 className="w-3.5 h-3.5 text-violet-400" />}
              items={QUICK_PROMPTS.map(p => ({ id: p.id, name: p.name, desc: p.desc, insert: p.content }))}
              onSelect={insertText}
              onClose={() => setPromptPanelOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* 斜杠指令弹出层 */}
        <AnimatePresence>
          {slashOpen && filteredCommands.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }} transition={{ duration: 0.12 }}
              className="absolute bottom-full left-0 mb-2 w-72 z-50 rounded-xl overflow-hidden shadow-2xl border border-[var(--border-l2)]"
              style={{ background: 'var(--glass-l4)', backdropFilter: 'var(--glass-blur-l4)', WebkitBackdropFilter: 'var(--glass-blur-l4)', boxShadow: 'var(--shadow-lg)' }}>
              <div className="px-3 py-2 border-b border-[var(--border-l1)]">
                <span className="text-[11px] text-[var(--text-tertiary)] font-medium">快捷指令</span>
              </div>
              <div className="p-1 max-h-52 overflow-y-auto">
                {filteredCommands.map(c => (
                  <button key={c.command} onClick={() => selectCommand(c.command)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors text-left">
                    <span className="text-base shrink-0">{c.icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-cyan-400 font-medium">{c.command}</p>
                      <p className="text-[11px] text-[var(--text-tertiary)]">{c.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={cn('relative flex flex-col gap-2 p-3 rounded-2xl transition-all duration-300 border',
          recording ? 'border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.15)]'
            : focused ? 'border-cyan-500/50 shadow-[0_0_20px_rgba(56,189,248,0.15)]'
            : 'border-[var(--border-l2)]')}
          style={{
            background: focused
              ? 'linear-gradient(135deg,rgba(0,242,195,0.04) 0%,rgba(8,16,42,0.70) 100%)'
              : 'var(--glass-l3)',
            backdropFilter: 'var(--glass-blur-l3)',
            WebkitBackdropFilter: 'var(--glass-blur-l3)',
            boxShadow: focused
              ? '0 0 0 2px rgba(0,242,195,0.12), var(--shadow-md)'
              : 'var(--shadow-sm)',
          }}>

          {/* 录音提示条 */}
          <AnimatePresence>
            {recording && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="flex items-center gap-2 px-2 pb-1">
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse shrink-0" />
                  <span className="text-xs text-rose-400 font-medium">正在录音…</span>
                  <span className="text-xs font-mono text-rose-400/70 ml-auto">{recordSeconds}s</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 文本域 */}
          <textarea ref={textareaRef} value={text}
            onChange={e => handleTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            rows={2}
            disabled={isStreaming}
            placeholder={recording ? '' : isStreaming ? '正在生成中，请稍候…' : '向 Acta 下达任务，输入 / 触发指令，Shift+Enter 换行…'}
            className={cn(
              'w-full bg-transparent text-sm outline-none resize-none leading-relaxed',
              isStreaming && 'opacity-50 cursor-not-allowed'
            )}
          />

          {/* 底部工具栏 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {/* 附件上传 */}
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
              <button onClick={() => fileInputRef.current?.click()}
                className={cn('p-2 rounded-lg transition-colors', attachments.length > 0 ? 'text-violet-400 bg-violet-500/15' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]')}
                title="上传附件">
                <Paperclip className="w-4 h-4" />
              </button>

              {/* @提及 */}
              <button className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors" title="@提及">
                <AtSign className="w-4 h-4" />
              </button>

              {/* / 指令 */}
              <button onClick={() => { setText(t => t.endsWith('/') ? t : t + '/'); setSlashOpen(true); setSlashQuery(''); setTimeout(() => textareaRef.current?.focus(), 30); }}
                className={cn('p-2 rounded-lg transition-colors', slashOpen ? 'text-cyan-400 bg-cyan-500/15' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]')}
                title="快捷指令">
                <Slash className="w-4 h-4" />
              </button>

              {/* 技能 */}
              <button onClick={() => { setSkillPanelOpen(v => !v); setPromptPanelOpen(false); }}
                className={cn('p-2 rounded-lg transition-colors', skillPanelOpen ? 'text-cyan-400 bg-cyan-500/15' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]')}
                title="插入技能">
                <Zap className="w-4 h-4" />
              </button>

              {/* 提示词 */}
              <button onClick={() => { setPromptPanelOpen(v => !v); setSkillPanelOpen(false); }}
                className={cn('p-2 rounded-lg transition-colors', promptPanelOpen ? 'text-violet-400 bg-violet-500/15' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]')}
                title="插入提示词">
                <Wand2 className="w-4 h-4" />
              </button>

              {/* 智能体团队选择 */}
              <button onClick={() => setTeamPickerOpen(v => !v)}
                className={cn('flex items-center gap-1.5 p-2 rounded-lg text-sm transition-colors',
                  teamPickerOpen || selectedTeamId ? 'text-cyan-400 bg-cyan-500/15' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]')}
                title="选择智能体团队">
                <Users className="w-4 h-4" />
                {selectedTeamId && <span className="text-[10px] font-medium">{TEAM_TEMPLATES.find(t => t.id === selectedTeamId)?.name.slice(0, 6)}…</span>}
              </button>

              {/* 语音输入 */}
              <button onClick={toggleRecording}
                className={cn('p-2 rounded-lg transition-colors', recording ? 'text-rose-400 bg-rose-500/15 animate-pulse' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]')}
                title={recording ? '停止录音' : '语音输入'}>
                {recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              {text.length > 0 && !isStreaming && <span className="text-xs text-[var(--text-disabled)]">{text.length}</span>}
              {isStreaming ? (
                <button
                  onClick={onStop}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 transition-all duration-200 animate-pulse"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />停止
                </button>
              ) : (
                <button onClick={handleSend} disabled={!text.trim() && attachments.length === 0}
                  className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200',
                    text.trim() || attachments.length > 0 ? 'btn-aurora text-white' : 'bg-[var(--surface-hover)] text-[var(--text-disabled)] cursor-not-allowed')}>
                  <Send className="w-3.5 h-3.5" />发送
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
