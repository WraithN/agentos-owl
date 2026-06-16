/* 扩展模块 — 技能市场 / 提示词市场 / 工具市场 */
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Upload, Puzzle, Zap, Wand2 } from 'lucide-react';
import { cn } from '@owl-os/core';
import {
  INIT_SKILLS,
  INIT_PROMPTS,
  SKILL_CATEGORIES_DEFAULT,
  PROMPT_CATEGORIES_DEFAULT,
  TOOL_CATEGORIES_DEFAULT,
  TOOL_TYPES,
  ICON_COLORS,
  TABS,
  PAGE_SIZE,
} from '../constants.js';
import { MARKET_TOOLS } from '../mock.js';
import type { SkillItem, PromptItem, MarketTool, NewToolType, TabId } from '../types.js';
import SkillCard from './SkillCard.js';
import PromptCard from './PromptCard.js';
import ToolCard from './ToolCard.js';
import Pager from './Pager.js';
import AddCategoryDialog from './AddCategoryDialog.js';
import CreateSkillDialog from './CreateSkillDialog.js';
import CreatePromptDialog from './CreatePromptDialog.js';
import CreateToolModal from './CreateToolModal.js';

export default function ToolsModule() {
  const [activeTab, setActiveTab] = useState<TabId>('skills');
  const [category, setCategory] = useState('全部');
  const [toolType, setToolType] = useState<'all' | 'mcp' | 'cli'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);

  const [skillsList, setSkillsList] = useState<SkillItem[]>(INIT_SKILLS);
  const [favSkills, setFavSkills] = useState<Set<string>>(new Set());
  const [createSkillOpen, setCreateSkillOpen] = useState(false);
  const importSkillRef = useRef<HTMLInputElement>(null);

  const [promptsList, setPromptsList] = useState<PromptItem[]>(INIT_PROMPTS);
  const [favPrompts, setFavPrompts] = useState<Set<string>>(new Set());
  const [createPromptOpen, setCreatePromptOpen] = useState(false);

  const [toolsList, setToolsList] = useState<MarketTool[]>(
    MARKET_TOOLS.filter(t => t.toolType === 'mcp' || t.toolType === 'cli')
  );
  const [installedTools, setInstalledTools] = useState<Set<string>>(
    new Set(MARKET_TOOLS.filter(t => t.installed && (t.toolType === 'mcp' || t.toolType === 'cli')).map(t => t.id))
  );
  const [toolModalOpen, setToolModalOpen] = useState(false);

  // 分类列表（支持新增）
  const [skillCats, setSkillCats] = useState(SKILL_CATEGORIES_DEFAULT);
  const [promptCats, setPromptCats] = useState(PROMPT_CATEGORIES_DEFAULT);
  const [toolCats, setToolCats] = useState(TOOL_CATEGORIES_DEFAULT);
  const [addCatOpen, setAddCatOpen] = useState(false);

  function handleTabChange(tab: TabId) {
    setActiveTab(tab);
    setCategory('全部');
    setSearchQuery('');
    setPage(0);
  }

  function handleImportSkill(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        const item: SkillItem = {
          id: `skill-import-${Date.now()}`,
          name: data.name ?? file.name.replace(/\.json$/i, ''),
          category: data.category ?? '通用',
          description: data.description ?? '导入的技能',
          stars: 5,
          installs: 0,
          official: false,
          iconBg: ICON_COLORS[skillsList.length % ICON_COLORS.length],
          icon: 'Zap',
          tags: data.tags ?? [],
        };
        setSkillsList(prev => [item, ...prev]);
      } catch {
        /* ignore */
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleAddCategory(name: string) {
    if (activeTab === 'skills') setSkillCats(prev => (prev.includes(name) ? prev : [...prev, name]));
    else if (activeTab === 'prompts') setPromptCats(prev => (prev.includes(name) ? prev : [...prev, name]));
    else setToolCats(prev => (prev.includes(name) ? prev : [...prev, name]));
    setAddCatOpen(false);
  }

  const categories = activeTab === 'skills' ? skillCats : activeTab === 'prompts' ? promptCats : toolCats;

  const filteredSkills = skillsList.filter(
    s => (category === '全部' || s.category === category) && (s.name.includes(searchQuery) || s.description.includes(searchQuery))
  );
  const filteredPrompts = promptsList.filter(
    p => (category === '全部' || p.category === category) && (p.name.includes(searchQuery) || p.description.includes(searchQuery))
  );
  const filteredTools = toolsList.filter(
    t =>
      (category === '全部' || t.category === category) &&
      (toolType === 'all' || t.toolType === toolType) &&
      (t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const items = activeTab === 'skills' ? filteredSkills : activeTab === 'prompts' ? filteredPrompts : filteredTools;
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = items.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 顶部标题 + Tab */}
      <div className="px-6 pt-5 pb-4 shrink-0">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">扩展</h1>
        <div className="flex gap-1 p-1 rounded-xl border border-[var(--border-subtle)] bg-black/4 dark:bg-white/4 w-fit">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all',
                activeTab === tab.id
                  ? 'btn-aurora text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 内工具栏 */}
      <div className="px-6 pb-3 shrink-0 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              placeholder={`搜索${TABS.find(t => t.id === activeTab)?.label ?? ''}...`}
              className="w-full bg-black/5 dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl pl-9 pr-3 py-2 text-sm text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-600 outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>
          {activeTab === 'skills' && (
            <>
              <button
                onClick={() => setCreateSkillOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 btn-aurora rounded-xl text-sm font-medium text-white shrink-0"
              >
                <Plus className="w-4 h-4" />
                新建技能
              </button>
              <button
                onClick={() => importSkillRef.current?.click()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 border border-[var(--border-subtle)] hover:bg-black/8 dark:hover:bg-white/8 transition-colors shrink-0"
              >
                <Upload className="w-4 h-4" />
                导入技能
              </button>
              <input ref={importSkillRef} type="file" accept=".json" className="hidden" onChange={handleImportSkill} />
            </>
          )}
          {activeTab === 'prompts' && (
            <button
              onClick={() => setCreatePromptOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 btn-aurora rounded-xl text-sm font-medium text-white shrink-0"
            >
              <Plus className="w-4 h-4" />
              新建提示词
            </button>
          )}
          {activeTab === 'tools' && (
            <button
              onClick={() => setToolModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 btn-aurora rounded-xl text-sm font-medium text-white shrink-0"
            >
              <Plus className="w-4 h-4" />
              新建工具
            </button>
          )}
        </div>

        {activeTab === 'tools' && (
          <div className="flex gap-2">
            {TOOL_TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => {
                  setToolType(t.value);
                  setPage(0);
                }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border shrink-0',
                  toolType === t.value
                    ? 'bg-white/10 border-white/20 text-slate-100'
                    : 'border-[var(--border-subtle)] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/5'
                )}
              >
                <span className={toolType === t.value ? 'text-cyan-400' : t.color}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* 分类筛选 + 新增分类 */}
        <div className="flex gap-2 overflow-x-auto whitespace-nowrap pb-0.5">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => {
                setCategory(c);
                setPage(0);
              }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0',
                category === c
                  ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-500 dark:text-slate-400 border border-[var(--border-subtle)] hover:border-slate-400/30 dark:hover:border-white/15 hover:text-slate-700 dark:hover:text-slate-200'
              )}
            >
              {c}
            </button>
          ))}
          <button
            onClick={() => setAddCatOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 text-slate-400 border border-dashed border-[var(--border-subtle)] hover:text-cyan-500 hover:border-cyan-500/40 transition-all"
          >
            <Plus className="w-3 h-3" />
            新增分类
          </button>
        </div>
      </div>

      {/* 卡片网格 */}
      <div className="flex-1 overflow-y-auto min-h-0 px-6 pt-2 pb-2">
        {pageItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <Search className="w-8 h-8 text-slate-400" />
            <p className="text-sm text-slate-500">没有符合条件的内容</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeTab}-${category}-${safePage}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
            >
              {activeTab === 'skills' &&
                (pageItems as SkillItem[]).map((s, i) => (
                  <SkillCard
                    key={s.id}
                    item={s}
                    onDelete={() => setSkillsList(prev => prev.filter(x => x.id !== s.id))}
                    onFav={() =>
                      setFavSkills(prev => {
                        const n = new Set(prev);
                        n.has(s.id) ? n.delete(s.id) : n.add(s.id);
                        return n;
                      })
                    }
                    onSave={updated => setSkillsList(prev => prev.map(x => (x.id === updated.id ? updated : x)))}
                    faved={favSkills.has(s.id)}
                    index={i}
                  />
                ))}
              {activeTab === 'prompts' &&
                (pageItems as PromptItem[]).map((p, i) => (
                  <PromptCard
                    key={p.id}
                    item={p}
                    onDelete={() => setPromptsList(prev => prev.filter(x => x.id !== p.id))}
                    onFav={() =>
                      setFavPrompts(prev => {
                        const n = new Set(prev);
                        n.has(p.id) ? n.delete(p.id) : n.add(p.id);
                        return n;
                      })
                    }
                    onSave={updated => setPromptsList(prev => prev.map(x => (x.id === updated.id ? updated : x)))}
                    faved={favPrompts.has(p.id)}
                    index={i}
                  />
                ))}
              {activeTab === 'tools' &&
                (pageItems as MarketTool[]).map((t, i) => (
                  <ToolCard
                    key={t.id}
                    tool={t}
                    installed={installedTools.has(t.id)}
                    onToggle={() =>
                      setInstalledTools(prev => {
                        const n = new Set(prev);
                        n.has(t.id) ? n.delete(t.id) : n.add(t.id);
                        return n;
                      })
                    }
                    onDelete={() => setToolsList(prev => prev.filter(x => x.id !== t.id))}
                    onSave={updated => setToolsList(prev => prev.map(x => (x.id === updated.id ? updated : x)))}
                    index={i}
                  />
                ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <Pager total={totalPages} current={safePage} onChange={p => setPage(p)} />

      <AnimatePresence>
        {createSkillOpen && (
          <CreateSkillDialog
            onClose={() => setCreateSkillOpen(false)}
            onConfirm={s => {
              setSkillsList(prev => [s, ...prev]);
              setCreateSkillOpen(false);
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {createPromptOpen && (
          <CreatePromptDialog
            onClose={() => setCreatePromptOpen(false)}
            onConfirm={p => {
              setPromptsList(prev => [p, ...prev]);
              setCreatePromptOpen(false);
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {addCatOpen && <AddCategoryDialog onClose={() => setAddCatOpen(false)} onConfirm={handleAddCategory} />}
      </AnimatePresence>
      <CreateToolModal
        open={toolModalOpen}
        onClose={() => setToolModalOpen(false)}
        onCreated={(_type: NewToolType, _name: string) => {}}
      />
    </div>
  );
}
