import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, FileText, FolderOpen, Folder, Plus, Pencil, Trash2,
  Save, X, Bold, Italic, List, Code, Link, Clock, Files,
  HardDrive, Users, Activity, BarChart2, MoreHorizontal,
  Image as ImageIcon,
} from 'lucide-react';
import { cn } from '@owl-os/core';
import KBPageShell from './KBPageShell.js';

interface WikiPage { id: string; title: string; content: string; updatedAt: string; author: string; }
interface WikiSection { id: string; title: string; pages: WikiPage[]; expanded: boolean; }
interface WikiKB { id: string; name: string; docCount: number; storageSize: string; vectorDbUrl: string; isGlobal: boolean; }

const INIT_SECTIONS: WikiSection[] = [
  { id: 's1', title: '快速开始', expanded: true, pages: [
    { id: 'p1', title: '简介', updatedAt: '2026-06-10', author: 'Admin', content: '# 简介\n\n欢迎使用本 Wiki 知识库。本文档涵盖系统的核心概念、架构设计与使用方法。\n\n## 核心特性\n\n- **意图驱动**：通过自然语言自动理解任务意图\n- **多Agent协作**：支持并行与顺序两种协作模式\n- **知识增强**：支持向量检索、Wiki 和 Ontology 多种知识源\n\n## 快速上手\n\n1. 创建一个 Agent\n2. 配置知识库\n3. 开始对话' },
    { id: 'p2', title: '安装配置', updatedAt: '2026-06-09', author: 'Dev', content: '# 安装配置\n\n## 系统要求\n\n- Node.js >= 18\n- PostgreSQL >= 14\n- Redis >= 6\n\n## 安装步骤\n\n```bash\nnpm install\nnpm run db:migrate\nnpm run dev\n```' },
    { id: 'p3', title: '目录结构', updatedAt: '2026-06-08', author: 'Dev', content: '# 目录结构\n\n```\nsrc/\n  components/   # UI 组件\n  pages/        # 页面\n  hooks/        # 自定义 Hooks\n  lib/          # 工具函数\n```' },
  ]},
  { id: 's2', title: '核心概念', expanded: false, pages: [
    { id: 'p4', title: 'Agent 生命周期', updatedAt: '2026-06-07', author: 'Arch', content: '# Agent 生命周期\n\nAgent 从创建到退出经历以下阶段：初始化 → 就绪 → 运行 → 挂起 → 终止。' },
    { id: 'p5', title: '任务调度', updatedAt: '2026-06-06', author: 'Arch', content: '# 任务调度\n\n系统使用优先级队列管理任务，支持抢占式和协作式两种调度策略。' },
    { id: 'p6', title: '消息协议', updatedAt: '2026-06-05', author: 'Arch', content: '# 消息协议\n\n所有 Agent 间通信使用统一的消息格式，包含 header、payload 和 signature 三部分。' },
  ]},
  { id: 's3', title: 'API 参考', expanded: false, pages: [
    { id: 'p7', title: 'REST API', updatedAt: '2026-06-04', author: 'Dev', content: '# REST API\n\n## 认证\n\n所有接口需携带 Bearer Token。\n\n## 端点列表\n\n- `GET /api/agents` 获取 Agent 列表\n- `POST /api/agents` 创建 Agent' },
    { id: 'p8', title: 'WebSocket', updatedAt: '2026-06-03', author: 'Dev', content: '# WebSocket\n\n实时消息通道使用 WebSocket 协议，连接地址：`ws://host/ws`' },
  ]},
  { id: 's4', title: '最佳实践', expanded: false, pages: [
    { id: 'p9', title: '性能调优', updatedAt: '2026-06-02', author: 'Ops', content: '# 性能调优\n\n- 合理设置 Agent 并发数\n- 启用结果缓存\n- 使用批量处理减少 API 调用' },
    { id: 'p10', title: '安全指南', updatedAt: '2026-06-01', author: 'Sec', content: '# 安全指南\n\n- 最小权限原则：每个 Agent 只授予必要权限\n- 定期轮换 API Key\n- 启用审计日志' },
  ]},
];

function renderMd(md: string): React.ReactNode[] {
  const els: React.ReactNode[] = [];
  let inCode = false; let codeBuf: string[] = []; let key = 0;

  /** 将行内 Markdown（**bold**, *italic*, `code`, ![img], [link]）转为 JSX */
  function renderInline(text: string): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
    // 按 token 顺序解析：图片 > 链接 > 粗体 > 斜体 > 行内代码
    const pattern = /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`/g;
    let last = 0, m: RegExpExecArray | null;
    while ((m = pattern.exec(text)) !== null) {
      if (m.index > last) parts.push(text.slice(last, m.index));
      if (m[0].startsWith('![')) {
        // 图片
        parts.push(
          <img key={key++} src={m[2]} alt={m[1]}
            className="max-w-full rounded-lg my-2 border border-[var(--border-subtle)]"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        );
      } else if (m[0].startsWith('[')) {
        // 链接
        parts.push(
          <a key={key++} href={m[4]} target="_blank" rel="noopener noreferrer"
            className="text-cyan-600 dark:text-cyan-400 underline underline-offset-2 hover:opacity-80 transition-opacity">
            {m[3]}
          </a>
        );
      } else if (m[5]) {
        parts.push(<strong key={key++} className="font-semibold text-slate-800 dark:text-slate-100">{m[5]}</strong>);
      } else if (m[6]) {
        parts.push(<em key={key++} className="italic">{m[6]}</em>);
      } else if (m[7]) {
        parts.push(
          <code key={key++} className="bg-black/10 dark:bg-white/10 px-1 rounded text-[11px] font-mono text-cyan-600 dark:text-cyan-400">
            {m[7]}
          </code>
        );
      }
      last = m.index + m[0].length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts;
  }

  for (const line of md.split('\n')) {
    if (line.startsWith('```')) {
      if (inCode) {
        els.push(
          <pre key={key++} className="bg-black/20 dark:bg-black/40 rounded-lg p-3 text-xs font-mono text-cyan-300 overflow-x-auto my-2 whitespace-pre-wrap">
            {codeBuf.join('\n')}
          </pre>
        );
        codeBuf = []; inCode = false;
      } else { inCode = true; }
      continue;
    }
    if (inCode) { codeBuf.push(line); continue; }

    if (line.startsWith('# '))
      { els.push(<h1 key={key++} className="text-xl font-bold text-slate-900 dark:text-white mt-4 mb-2 text-balance">{renderInline(line.slice(2))}</h1>); continue; }
    if (line.startsWith('## '))
      { els.push(<h2 key={key++} className="text-base font-semibold text-slate-800 dark:text-slate-100 mt-3 mb-1.5 text-balance">{renderInline(line.slice(3))}</h2>); continue; }
    if (line.startsWith('### '))
      { els.push(<h3 key={key++} className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-2 mb-1 text-balance">{renderInline(line.slice(4))}</h3>); continue; }
    if (line.startsWith('- '))
      { els.push(<li key={key++} className="text-sm text-slate-700 dark:text-slate-300 ml-4 list-disc">{renderInline(line.slice(2))}</li>); continue; }
    if (line.match(/^\d+\. /))
      { els.push(<li key={key++} className="text-sm text-slate-700 dark:text-slate-300 ml-4 list-decimal">{renderInline(line.replace(/^\d+\. /, ''))}</li>); continue; }
    if (!line.trim()) { els.push(<div key={key++} className="h-2" />); continue; }

    els.push(
      <p key={key++} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed text-pretty">
        {renderInline(line)}
      </p>
    );
  }
  return els;
}

export default function WikiKBPage({ kb: initialKb, isGlobal: initialGlobal, onBack, onRename, onSetGlobal }: {
  kb: WikiKB; isGlobal: boolean; onBack: () => void; onRename: (n: string) => void; onSetGlobal: () => void;
}) {
  const [kb, setKb] = useState(initialKb);
  const [isGlobal, setIsGlobal] = useState(initialGlobal);
  const [activeTab, setActiveTab] = useState('detail');
  const [sections, setSections] = useState<WikiSection[]>(INIT_SECTIONS);
  const [activePage, setActivePage] = useState<WikiPage>(INIT_SECTIONS[0].pages[0]);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [renamingPageId, setRenamingPageId] = useState<string | null>(null);
  const [renamePageDraft, setRenamePageDraft] = useState('');
  const [renamingSectionId, setRenamingSectionId] = useState<string | null>(null);
  const [renameSectionDraft, setRenameSectionDraft] = useState('');
  const [sectionMenuId, setSectionMenuId] = useState<string | null>(null);
  const renamePageInputRef = useRef<HTMLInputElement>(null);
  const renameSectionInputRef = useRef<HTMLInputElement>(null);

  // 双击计时器，用于区分单击（选中页面）和双击（改名）
  const clickTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  function startRenameSection(id: string, currentTitle: string) {
    setRenamingSectionId(id);
    setRenameSectionDraft(currentTitle);
    setSectionMenuId(null);
  }

  function startRenamePage(pageId: string, currentTitle: string) {
    setRenamingPageId(pageId);
    setRenamePageDraft(currentTitle);
  }

  /** 单击文件：延迟 200ms 执行，双击时取消 */
  function handlePageClick(page: WikiPage) {
    if (renamingPageId === page.id) return; // 正在改名时不触发跳转
    if (clickTimers.current[page.id]) return; // 等待双击确认
    clickTimers.current[page.id] = setTimeout(() => {
      delete clickTimers.current[page.id];
      openPage(page);
    }, 200);
  }

  /** 双击文件：取消单击计时，进入改名 */
  function handlePageDblClick(page: WikiPage) {
    if (clickTimers.current[page.id]) {
      clearTimeout(clickTimers.current[page.id]);
      delete clickTimers.current[page.id];
    }
    startRenamePage(page.id, page.title);
  }

  /** 双击目录：进入改名 */
  function handleSectionDblClick(sec: WikiSection) {
    startRenameSection(sec.id, sec.title);
  }

  const dismissMenus = useCallback(() => { setSectionMenuId(null); }, []);

  function handleRename(name: string) { setKb(k => ({ ...k, name })); onRename(name); }
  function handleSetGlobal() { setIsGlobal(v => !v); onSetGlobal(); }
  function toggleSection(id: string) { setSections(prev => prev.map(s => s.id === id ? { ...s, expanded: !s.expanded } : s)); }
  function openPage(page: WikiPage) { if (editMode) setEditMode(false); setActivePage(page); }
  function startEdit() { setEditTitle(activePage.title); setEditContent(activePage.content); setEditMode(true); }
  function saveEdit() {
    const updated: WikiPage = { ...activePage, title: editTitle, content: editContent, updatedAt: new Date().toISOString().slice(0, 10) };
    setSections(prev => prev.map(s => ({ ...s, pages: s.pages.map(p => p.id === activePage.id ? updated : p) })));
    setActivePage(updated); setEditMode(false);
  }
  function addPage(sectionId: string) {
    const newPage: WikiPage = { id: `p-${Date.now()}`, title: '新建页面', content: '# 新建页面\n\n开始编写内容...', updatedAt: new Date().toISOString().slice(0, 10), author: 'Me' };
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, expanded: true, pages: [...s.pages, newPage] } : s));
    setActivePage(newPage); setSectionMenuId(null);
    setTimeout(() => { setEditTitle(newPage.title); setEditContent(newPage.content); setEditMode(true); }, 50);
  }
  function addSection() {
    const id = `s-${Date.now()}`;
    const newSec: WikiSection = { id, title: '新建目录', pages: [], expanded: true };
    setSections(prev => [...prev, newSec]);
    setRenamingSectionId(id); setRenameSectionDraft('新建目录');
  }
  function commitRenameSection(id: string) {
    if (renameSectionDraft.trim()) setSections(prev => prev.map(s => s.id === id ? { ...s, title: renameSectionDraft.trim() } : s));
    setRenamingSectionId(null);
  }
  function commitRenamePage(sectionId: string, pageId: string) {
    if (renamePageDraft.trim()) {
      setSections(prev => prev.map(s => s.id === sectionId ? { ...s, pages: s.pages.map(p => p.id === pageId ? { ...p, title: renamePageDraft.trim() } : p) } : s));
      if (activePage.id === pageId) setActivePage(a => ({ ...a, title: renamePageDraft.trim() }));
    }
    setRenamingPageId(null);
  }
  function deleteSection(id: string) { setSections(prev => prev.filter(s => s.id !== id)); setSectionMenuId(null); }
  function deletePage(sectionId: string, pageId: string) {
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, pages: s.pages.filter(p => p.id !== pageId) } : s));
    if (activePage.id === pageId) setActivePage(INIT_SECTIONS[0].pages[0]);
  }

  const filteredSections = sections.map(s => ({
    ...s, pages: searchQ ? s.pages.filter(p => p.title.toLowerCase().includes(searchQ.toLowerCase())) : s.pages,
  })).filter(s => !searchQ || s.pages.length > 0);

  const totalPages = sections.reduce((n, s) => n + s.pages.length, 0);

  const TABS = [
    { id: 'detail', label: '详情', icon: <FileText className="w-4 h-4" /> },
    { id: 'dashboard', label: '数据大盘', icon: <BarChart2 className="w-4 h-4" /> },
  ];

  return (
    <KBPageShell name={kb.name} isGlobal={isGlobal}
      icon={<div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 shrink-0"><BookOpen className="w-4 h-4 text-white" /></div>}
      tabs={TABS} activeTab={activeTab}
      onTabChange={id => { setActiveTab(id); if (id !== 'detail' && editMode) setEditMode(false); }}
      onBack={onBack} onRename={handleRename} onSetGlobal={handleSetGlobal}>

      {/* ── 详情 ── */}
      {activeTab === 'detail' && (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* 左侧目录树 */}
          <div className="w-60 shrink-0 border-r border-[var(--border-subtle)] flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--border-subtle)] shrink-0">
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="搜索页面..."
                className="flex-1 pl-3 pr-3 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-black/5 dark:bg-white/5 text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-emerald-500/40" />
              <button onClick={addSection} title="新建目录"
                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors shrink-0">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-1" onClick={dismissMenus}>
              {filteredSections.map(sec => (
                <div key={sec.id}>
                  {/* ── 目录行 ── */}
                  <div className="flex items-center group/sec">
                    {/* 展开/收起 + 双击改名区 */}
                    <button
                      onClick={() => toggleSection(sec.id)}
                      onDoubleClick={e => { e.preventDefault(); handleSectionDblClick(sec); }}
                      className="flex-1 flex items-center gap-1.5 pl-2 pr-1 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors min-w-0">
                      {sec.expanded
                        ? <FolderOpen className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        : <Folder    className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                      {renamingSectionId === sec.id ? (
                        <input autoFocus value={renameSectionDraft}
                          onChange={e => setRenameSectionDraft(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') commitRenameSection(sec.id); if (e.key === 'Escape') setRenamingSectionId(null); }}
                          onBlur={() => commitRenameSection(sec.id)}
                          onClick={e => e.stopPropagation()}
                          className="flex-1 min-w-0 bg-transparent border-b border-emerald-500/60 outline-none text-xs font-semibold text-slate-700 dark:text-slate-200" />
                      ) : (
                        <span className="flex-1 truncate text-left">{sec.title}</span>
                      )}
                    </button>

                    {/* 悬停操作区：改名图标 + 三点菜单 */}
                    <div className="flex items-center gap-0.5 pr-1 opacity-0 group-hover/sec:opacity-100 transition-opacity shrink-0">
                      {/* 铅笔改名按钮 */}
                      <button
                        onClick={e => { e.stopPropagation(); startRenameSection(sec.id, sec.title); }}
                        title="重命名"
                        className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors">
                        <Pencil className="w-3 h-3" />
                      </button>
                      {/* 三点菜单：仅新建文件 / 新建文件夹 / 删除 */}
                      <div className="relative">
                        <button
                          onClick={e => { e.stopPropagation(); setSectionMenuId(v => v === sec.id ? null : sec.id); }}
                          className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 transition-colors">
                          <MoreHorizontal className="w-3 h-3" />
                        </button>
                        {sectionMenuId === sec.id && (
                          <div
                            className="absolute right-0 top-full mt-0.5 z-20 w-32 rounded-xl border border-[var(--border-subtle)] bg-white dark:bg-[#1a1a2e] shadow-xl py-1 text-xs"
                            onClick={e => e.stopPropagation()}>
                            <button onClick={() => addPage(sec.id)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5">
                              <FileText className="w-3 h-3" />新建文件
                            </button>
                            <button onClick={() => { addSection(); setSectionMenuId(null); }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5">
                              <Folder className="w-3 h-3" />新建文件夹
                            </button>
                            <div className="my-1 border-t border-[var(--border-subtle)]" />
                            <button onClick={() => deleteSection(sec.id)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-rose-400 hover:bg-rose-500/10">
                              <Trash2 className="w-3 h-3" />删除目录
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── 页面列表（文件，无菜单） ── */}
                  <AnimatePresence initial={false}>
                    {sec.expanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }}
                        className="overflow-hidden">
                        {sec.pages.map(page => (
                          <div key={page.id} className="flex items-center group/page">
                            {/* 单击选中（延迟），双击改名 */}
                            <button
                              onClick={() => handlePageClick(page)}
                              onDoubleClick={e => { e.preventDefault(); handlePageDblClick(page); }}
                              className={cn(
                                'flex-1 flex items-center gap-1.5 pl-5 pr-1 py-1.5 text-xs transition-colors min-w-0',
                                activePage.id === page.id
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium'
                                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-black/4 dark:hover:bg-white/4'
                              )}>
                              <FileText className="w-3 h-3 shrink-0" />
                              {renamingPageId === page.id ? (
                                <input autoFocus value={renamePageDraft}
                                  onChange={e => setRenamePageDraft(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') commitRenamePage(sec.id, page.id); if (e.key === 'Escape') setRenamingPageId(null); }}
                                  onBlur={() => commitRenamePage(sec.id, page.id)}
                                  onClick={e => e.stopPropagation()}
                                  className="flex-1 min-w-0 bg-transparent border-b border-emerald-500/60 outline-none text-xs text-slate-700 dark:text-slate-200" />
                              ) : (
                                <span className="flex-1 truncate text-left">{page.title}</span>
                              )}
                            </button>
                            {/* 铅笔改名图标（悬停可见，无菜单） */}
                            <button
                              onClick={e => { e.stopPropagation(); startRenamePage(page.id, page.title); }}
                              title="重命名"
                              className="opacity-0 group-hover/page:opacity-100 transition-opacity p-1 mr-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors shrink-0">
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        {sec.pages.length === 0 && (
                          <p className="pl-6 py-1.5 text-[10px] text-slate-400 italic">暂无页面</p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>

          {/* 右侧内容 */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            {editMode ? (
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-1 px-5 py-2 border-b border-[var(--border-subtle)] shrink-0">
                  {([Bold, Italic, Code, List, Link, ImageIcon] as const).map((Icon, i) => (
                    <button key={i}
                      onClick={() => setEditContent(c => c + ['**粗体**', '*斜体*', '`代码`', '\n- 列表项', '[文字](url)', '![描述](url)'][i])}
                      className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 transition-colors">
                      <Icon className="w-3.5 h-3.5" />
                    </button>
                  ))}
                  <div className="w-px h-4 bg-[var(--border-subtle)] mx-1" />
                  <span className="text-[10px] text-slate-400">Markdown</span>
                  <div className="flex-1" />
                  <button onClick={() => setEditMode(false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 border border-[var(--border-subtle)] rounded-lg hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                    <X className="w-3.5 h-3.5" />取消
                  </button>
                  <button onClick={saveEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg hover:opacity-90 transition-opacity">
                    <Save className="w-3.5 h-3.5" />保存
                  </button>
                </div>
                <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                  className="px-5 py-3 text-lg font-bold bg-transparent border-b border-[var(--border-subtle)] outline-none text-slate-900 dark:text-white placeholder:text-slate-400 shrink-0"
                  placeholder="页面标题" />
                <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
                  onPaste={e => {
                    const items = Array.from(e.clipboardData.items);
                    const imgItem = items.find(i => i.type.startsWith('image/'));
                    if (!imgItem) return;
                    e.preventDefault();
                    const file = imgItem.getAsFile();
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = ev => {
                      const url = ev.target?.result as string;
                      const md = `![${file.name || '图片'}](${url})`;
                      setEditContent(c => c + '\n' + md + '\n');
                    };
                    reader.readAsDataURL(file);
                  }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'));
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = ev => {
                      const url = ev.target?.result as string;
                      const md = `![${file.name}](${url})`;
                      setEditContent(c => c + '\n' + md + '\n');
                    };
                    reader.readAsDataURL(file);
                  }}
                  className="flex-1 px-5 py-4 bg-transparent outline-none text-sm text-slate-700 dark:text-slate-300 font-mono resize-none leading-relaxed"
                  placeholder="使用 Markdown 编写内容，支持粘贴/拖拽图片、![图片](url)、[链接](url)..." />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Clock className="w-3 h-3" />更新于 {activePage.updatedAt}
                  </span>
                  <span className="text-[11px] text-slate-400">· {activePage.author}</span>
                  <button onClick={startEdit}
                    className="ml-auto flex items-center gap-1 text-[11px] text-slate-400 hover:text-emerald-400 transition-colors">
                    <Pencil className="w-3 h-3" />编辑此页
                  </button>
                </div>
                <div className="space-y-1">{renderMd(activePage.content)}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 数据大盘 ── */}
      {activeTab === 'dashboard' && (
        <div className="flex-1 overflow-y-auto min-h-0 p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: '目录数',   value: String(sections.length), sub: '个', icon: <Folder className="w-5 h-5 text-emerald-400" />, color: 'from-emerald-500/20 to-teal-500/10' },
              { label: '页面数',   value: String(totalPages),       sub: '页', icon: <FileText className="w-5 h-5 text-cyan-400" />, color: 'from-cyan-500/20 to-blue-500/10' },
              { label: '存储占用', value: kb.storageSize,           sub: '',   icon: <HardDrive className="w-5 h-5 text-amber-400" />, color: 'from-amber-500/20 to-orange-500/10' },
              { label: '贡献者',   value: '4',                      sub: '人', icon: <Users className="w-5 h-5 text-violet-400" />, color: 'from-violet-500/20 to-purple-500/10' },
            ].map(s => (
              <div key={s.label} className={cn('glass rounded-2xl p-4 bg-gradient-to-br', s.color)}>
                <div className="flex items-center justify-between mb-2"><span className="text-xs text-slate-500">{s.label}</span>{s.icon}</div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}<span className="text-sm font-normal text-slate-400 ml-1">{s.sub}</span></p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2"><Files className="w-4 h-4 text-emerald-400" />各目录页面数</h3>
              {sections.map(s => (
                <div key={s.id} className="flex items-center gap-3 mb-3">
                  <span className="text-xs text-slate-500 w-20 shrink-0 truncate">{s.title}</span>
                  <div className="flex-1 h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(s.pages.length / Math.max(totalPages, 1)) * 100}%` }} transition={{ duration: 0.6 }} className="h-full rounded-full bg-emerald-500" />
                  </div>
                  <span className="text-xs text-slate-400 w-6 text-right">{s.pages.length}</span>
                </div>
              ))}
            </div>
            <div className="glass rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-cyan-400" />近期编辑</h3>
              {sections.flatMap(s => s.pages).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5).map((p, i) => (
                <div key={i} className="flex items-center gap-2 mb-3">
                  <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <button onClick={() => { setActiveTab('detail'); openPage(p); }} className="text-xs text-slate-700 dark:text-slate-200 hover:text-emerald-400 transition-colors flex-1 truncate text-left">{p.title}</button>
                  <span className="text-[10px] text-slate-500 shrink-0">{p.author}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">{p.updatedAt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </KBPageShell>
  );
}
