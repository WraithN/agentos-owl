/* 扩展模块 — 技能市场 / 提示词市场 / 工具市场 */
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Code2, GitBranch, BarChart3,
  MessageSquare, FileText, Database, Mail, Shield,
  Plus, ChevronLeft, ChevronRight, Cpu, Terminal, Puzzle,
  Wand2, BookOpen, Zap, Trash2, Copy, Upload, X, Star, Bookmark, AlertTriangle,
  PackagePlus, PackageMinus, Pencil, Loader2, Save,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { inputCls, btnPrimary } from '@/lib/ui-styles';
import { MARKET_TOOLS } from '@/data/mockData';
import type { MarketTool } from '@/types';
import CreateToolModal, { type NewToolType } from './CreateToolModal';

/* ── 技能市场初始数据 ─────────────────────────────────────────────── */
type SkillItem = { id: string; name: string; category: string; description: string; stars: number; installs: number; official: boolean; iconBg: string; icon: string; tags: string[] };
const INIT_SKILLS: SkillItem[] = [
  { id: 's1', name: '智能摘要', category: '文档', description: '自动提取长文档核心摘要，支持中英文', stars: 4.8, installs: 12400, official: true, iconBg: 'from-cyan-500 to-blue-600', icon: 'FileText', tags: ['NLP', '摘要'] },
  { id: 's2', name: '代码审查', category: '代码', description: '基于规则与 AI 的代码质量检测与建议', stars: 4.7, installs: 9800, official: true, iconBg: 'from-violet-500 to-purple-600', icon: 'Code2', tags: ['代码', 'QA'] },
  { id: 's3', name: '情感分析', category: '分析', description: '多粒度情感识别，支持评论、对话等场景', stars: 4.5, installs: 7600, official: false, iconBg: 'from-rose-500 to-pink-600', icon: 'BarChart3', tags: ['NLP', '情感'] },
  { id: 's4', name: '邮件起草', category: '通信', description: '根据意图自动起草专业邮件并优化措辞', stars: 4.6, installs: 8300, official: false, iconBg: 'from-amber-500 to-orange-500', icon: 'Mail', tags: ['写作', '邮件'] },
  { id: 's5', name: '数据清洗', category: '数据', description: '智能识别并修复结构化数据中的异常值', stars: 4.4, installs: 5200, official: true, iconBg: 'from-emerald-500 to-teal-600', icon: 'Database', tags: ['数据', '清洗'] },
  { id: 's6', name: '会议纪要', category: '文档', description: '录音转文字并自动生成结构化会议纪要', stars: 4.9, installs: 15700, official: true, iconBg: 'from-blue-500 to-indigo-600', icon: 'MessageSquare', tags: ['语音', '文档'] },
  { id: 's7', name: 'SQL 生成', category: '代码', description: '自然语言转 SQL，支持多种数据库方言', stars: 4.7, installs: 11200, official: false, iconBg: 'from-slate-500 to-gray-600', icon: 'GitBranch', tags: ['SQL', '代码'] },
  { id: 's8', name: '风险评估', category: '分析', description: '基于上下文自动识别业务风险并给出建议', stars: 4.3, installs: 4100, official: false, iconBg: 'from-red-500 to-rose-600', icon: 'Shield', tags: ['风控', '分析'] },
  { id: 's9', name: '多语翻译', category: '通信', description: '支持 100+ 语言的高精度场景化翻译', stars: 4.8, installs: 20300, official: true, iconBg: 'from-sky-500 to-cyan-600', icon: 'MessageSquare', tags: ['翻译', '多语言'] },
  { id: 's10', name: 'OCR 识别', category: '文档', description: '图片文字识别，支持表格、公式与手写体', stars: 4.6, installs: 18300, official: false, iconBg: 'from-amber-500 to-orange-600', icon: 'FileText', tags: ['OCR', '文档'] },
  { id: 's11', name: '日志解析', category: '分析', description: '自动分析系统日志，定位异常根因', stars: 4.5, installs: 9500, official: true, iconBg: 'from-indigo-500 to-violet-600', icon: 'BarChart3', tags: ['日志', '运维'] },
  { id: 's12', name: 'API 生成', category: '代码', description: '根据数据库模型自动生成 RESTful API', stars: 4.7, installs: 12100, official: false, iconBg: 'from-emerald-500 to-teal-600', icon: 'Code2', tags: ['API', '后端'] },
  { id: 's13', name: '合同审查', category: '文档', description: '法律合同条款自动审查与风险提示', stars: 4.4, installs: 6700, official: false, iconBg: 'from-rose-500 to-pink-600', icon: 'Shield', tags: ['法律', '合规'] },
];

/* ── 提示词市场初始数据 ────────────────────────────────────────────── */
type PromptItem = { id: string; name: string; category: string; description: string; content: string; official: boolean; tags: string[] };
const INIT_PROMPTS: PromptItem[] = [
  { id: 'p1', name: '专业邮件写作', category: '写作', description: '生成商务场景专业邮件，语气正式，逻辑清晰', content: '你是一位专业的商务写作助手，请根据用户描述生成语气正式、逻辑清晰的商务邮件。', official: true, tags: ['写作', '商务'] },
  { id: 'p2', name: '代码注释生成', category: '代码', description: '为任意代码片段自动生成规范注释与文档', content: '你是一位资深工程师，请为以下代码生成清晰规范的注释和文档说明。', official: true, tags: ['代码', '文档'] },
  { id: 'p3', name: '产品需求分析', category: '产品', description: '将用户描述转化为结构化 PRD，包含用户故事', content: '你是一位产品经理，请将用户描述转化为结构化的产品需求文档，包含用户故事和验收标准。', official: false, tags: ['产品', 'PRD'] },
  { id: 'p4', name: '面试问题生成', category: 'HR', description: '根据岗位 JD 生成针对性面试题目与评分标准', content: '你是一位 HR 专家，请根据以下岗位描述生成有针对性的面试题目和评分标准。', official: false, tags: ['HR', '面试'] },
  { id: 'p5', name: '市场竞品分析', category: '分析', description: '多维度竞品对比框架，输出结构化分析报告', content: '你是一位市场分析师，请对以下产品进行多维度竞品分析并输出结构化报告。', official: true, tags: ['分析', '竞品'] },
  { id: 'p6', name: '用户故事提炼', category: '产品', description: '从访谈记录或反馈中提炼关键用户故事', content: '你是一位用户研究专家，请从以下访谈记录中提炼关键用户故事和核心痛点。', official: false, tags: ['产品', '用户研究'] },
  { id: 'p7', name: '技术方案撰写', category: '代码', description: '根据需求描述生成详细技术实现方案文档', content: '你是一位架构师，请根据以下需求描述生成详细的技术实现方案，包含架构设计、技术选型和实施步骤。', official: true, tags: ['代码', '文档'] },
  { id: 'p8', name: '社媒文案创作', category: '写作', description: '针对微博/小红书/朋友圈生成高互动文案', content: '你是一位社交媒体运营专家，请为以下主题创作适合微博/小红书/朋友圈的高互动文案。', official: false, tags: ['写作', '营销'] },
  { id: 'p9', name: '周报自动撰写', category: '写作', description: '结合工作记录生成专业周报，一键完成汇报', content: '你是一位专业助手，请根据以下工作记录生成结构清晰、重点突出的工作周报。', official: true, tags: ['写作', '效率'] },
  { id: 'p10', name: 'API 文档生成', category: '代码', description: '为接口自动生成 OpenAPI 规范文档', content: '你是一位后端架构师，请根据以下接口描述生成符合 OpenAPI 3.0 规范的接口文档。', official: false, tags: ['代码', '文档'] },
  { id: 'p11', name: '招聘 JD 撰写', category: 'HR', description: '根据岗位需求生成专业招聘描述', content: '你是一位资深 HR 招聘专家，请根据以下岗位需求生成吸引人才的招聘 JD 描述。', official: true, tags: ['HR', '招聘'] },
  { id: 'p12', name: '数据洞察提炼', category: '分析', description: '从数据中提取关键发现与商业建议', content: '你是一位数据分析专家，请从以下数据中提炼关键发现，并给出可操作的商业建议。', official: false, tags: ['分析', '洞察'] },
];

const SKILL_CATEGORIES_DEFAULT = ['全部', '文档', '代码', '分析', '通信', '数据'];
const PROMPT_CATEGORIES_DEFAULT = ['全部', '写作', '代码', '产品', 'HR', '分析'];
const TOOL_CATEGORIES_DEFAULT = ['全部', '搜索', '代码', '数据分析', '文档', '通信', '通用'];
const TOOL_TYPES: { value: 'all' | 'mcp' | 'cli'; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'all', label: '全部类型', icon: <Puzzle className="w-3.5 h-3.5" />, color: 'text-slate-400' },
  { value: 'mcp', label: 'MCP',      icon: <Cpu className="w-3.5 h-3.5" />,   color: 'text-violet-400' },
  { value: 'cli', label: 'CLI',      icon: <Terminal className="w-3.5 h-3.5" />, color: 'text-emerald-400' },
];

const ICON_COLORS = [
  'from-cyan-500 to-blue-600', 'from-violet-500 to-purple-600', 'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-500', 'from-rose-500 to-pink-600', 'from-sky-500 to-cyan-600',
];

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Search, Code2, GitBranch, BarChart3, MessageSquare, FileText, Database, Mail, Shield,
};

const PAGE_SIZE = 9;
type TabId = 'skills' | 'prompts' | 'tools';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'skills',  label: '技能市场',  icon: <Zap className="w-4 h-4" /> },
  { id: 'prompts', label: '提示词市场', icon: <Wand2 className="w-4 h-4" /> },
  { id: 'tools',   label: '工具市场',  icon: <Puzzle className="w-4 h-4" /> },
];

const DIALOG_BG = 'var(--panel-bg-solid)';
const DIALOG_BD = 'var(--border-subtle)';

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star key={i} className={cn('w-3 h-3', i < Math.round(value) ? 'text-amber-400 fill-amber-400' : 'text-slate-600')} />
      ))}
    </div>
  );
}

/* ── 分类下拉 + 新建分类 ─────────────────────────────────────────────── */
function CategorySelect({
  categories, value, onChange,
}: {
  categories: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [all, setAll] = useState(categories);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [err, setErr] = useState('');

  const confirm = () => {
    const v = draft.trim();
    if (!v) { setErr('分类不能为空'); return; }
    if (!all.includes(v)) setAll(prev => [...prev, v]);
    onChange(v);
    setAdding(false);
    setDraft('');
    setErr('');
  };

  if (adding) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={draft}
            onChange={e => { setDraft(e.target.value); setErr(''); }}
            onKeyDown={e => { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') setAdding(false); }}
            placeholder="输入新分类名称"
            className={cn(inputCls, 'flex-1')}
          />
          <button onClick={confirm} className="px-3 py-2 text-xs font-medium text-white bg-cyan-500 rounded-xl hover:bg-cyan-600 transition-colors">
            确认
          </button>
          <button onClick={() => setAdding(false)} className="px-3 py-2 text-xs text-slate-500 hover:text-slate-700 rounded-xl transition-colors">
            取消
          </button>
        </div>
        {err && <p className="text-[10px] text-rose-400">{err}</p>}
      </div>
    );
  }

  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => {
          const v = e.target.value;
          if (v === '__new__') { setAdding(true); setDraft(''); setErr(''); }
          else onChange(v);
        }}
        className={cn(inputCls, 'appearance-none cursor-pointer pr-8')}
      >
        {all.map(c => <option key={c} value={c}>{c}</option>)}
        <option value="__new__">+ 新建分类</option>
      </select>
      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
        <Plus className="w-3 h-3 text-slate-400" />
      </div>
    </div>
  );
}

/* ── 删除确认弹窗 ───────────────────────────────────────────────────── */
function DeleteConfirmDialog({ name, onCancel, onConfirm }: { name: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }}
        className="relative w-full max-w-[calc(100%-2rem)] md:max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: DIALOG_BG, border: `1px solid ${DIALOG_BD}`, backdropFilter: 'blur(24px)' }}
        onClick={e => e.stopPropagation()}>
        <div className="p-5 flex flex-col items-center gap-3 text-center">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-rose-500/15">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">确认删除</p>
            <p className="text-xs text-slate-500 mt-1">确定要删除 <span className="text-slate-700 dark:text-slate-200 font-medium">「{name}」</span> 吗？此操作不可撤销。</p>
          </div>
          <div className="flex items-center gap-2 w-full pt-1">
            <button onClick={onCancel} className="flex-1 px-4 py-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 rounded-xl transition-colors border border-[var(--border-subtle)]">取消</button>
            <button onClick={onConfirm} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-colors">
              <Trash2 className="w-3.5 h-3.5" />删除
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ── 新增分类弹窗 ───────────────────────────────────────────────────── */
function AddCategoryDialog({ onClose, onConfirm }: { onClose: () => void; onConfirm: (name: string) => void }) {
  const [val, setVal] = useState('');
  const [err, setErr] = useState('');
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.15 }}
        className="relative w-full max-w-[calc(100%-2rem)] md:max-w-xs rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: DIALOG_BG, border: `1px solid ${DIALOG_BD}`, backdropFilter: 'blur(24px)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${DIALOG_BD}` }}>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">新增分类</p>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <input autoFocus value={val} onChange={e => { setVal(e.target.value); setErr(''); }}
            placeholder="输入分类名称..." className={inputCls}
            onKeyDown={e => { if (e.key === 'Enter') { if (!val.trim()) { setErr('分类名称不能为空'); return; } onConfirm(val.trim()); } }} />
          {err && <p className="text-[10px] text-rose-400">{err}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4" style={{ borderTop: `1px solid ${DIALOG_BD}` }}>
          <button onClick={onClose} className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 rounded-xl transition-colors">取消</button>
          <button onClick={() => { if (!val.trim()) { setErr('分类名称不能为空'); return; } onConfirm(val.trim()); }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white btn-aurora rounded-xl">
            <Plus className="w-3.5 h-3.5" />确认添加
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function CreateSkillDialog({ onClose, onConfirm }: { onClose: () => void; onConfirm: (s: SkillItem) => void }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('通用');
  const [tags, setTags] = useState('');
  const [nameErr, setNameErr] = useState('');

  function submit() {
    if (!name.trim()) { setNameErr('名称为必填项'); return; }
    onConfirm({
      id: `skill-${Date.now()}`, name: name.trim(), category,
      description: desc || '暂无描述', stars: 5, installs: 0, official: false,
      iconBg: ICON_COLORS[Math.floor(Math.random() * ICON_COLORS.length)],
      icon: 'Zap',
      tags: tags.split(/[,，\s]+/).map(t => t.trim()).filter(Boolean),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 12 }} transition={{ duration: 0.16 }}
        className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: DIALOG_BG, border: `1px solid ${DIALOG_BD}`, backdropFilter: 'blur(24px)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${DIALOG_BD}` }}>
          <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-cyan-500" /><h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">新建技能</h2></div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1">名称 <span className="text-rose-400">*</span></label>
            <input value={name} onChange={e => { setName(e.target.value); setNameErr(''); }} placeholder="技能名称" className={inputCls} />
            {nameErr && <p className="text-[10px] text-rose-400 mt-1">{nameErr}</p>}
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">分类</label>
            <CategorySelect categories={['文档', '代码', '分析', '通信', '数据', '通用']} value={category} onChange={setCategory} />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">描述</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="技能功能描述..." className={cn(inputCls, 'resize-none leading-relaxed')} />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">标签 <span className="text-slate-400 font-normal">（逗号分隔）</span></label>
            <input value={tags} onChange={e => setTags(e.target.value)} placeholder="NLP, 文本, 分析" className={inputCls} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4" style={{ borderTop: `1px solid ${DIALOG_BD}` }}>
          <button onClick={onClose} className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 rounded-xl transition-colors">取消</button>
          <button onClick={submit} className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white btn-aurora rounded-xl"><Plus className="w-3.5 h-3.5" />创建技能</button>
        </div>
      </motion.div>
    </div>
  );
}

function CreatePromptDialog({ onClose, onConfirm }: { onClose: () => void; onConfirm: (p: PromptItem) => void }) {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('写作');
  const [tags, setTags] = useState('');
  const [nameErr, setNameErr] = useState('');
  const [contentErr, setContentErr] = useState('');

  function submit() {
    let hasErr = false;
    if (!name.trim()) { setNameErr('名称为必填项'); hasErr = true; }
    if (!content.trim()) { setContentErr('提示词内容为必填项'); hasErr = true; }
    if (hasErr) return;
    onConfirm({
      id: `prompt-${Date.now()}`, name: name.trim(), category,
      description: content.slice(0, 40) + (content.length > 40 ? '...' : ''),
      content: content.trim(), official: false,
      tags: tags.split(/[,，\s]+/).map(t => t.trim()).filter(Boolean),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 12 }} transition={{ duration: 0.16 }}
        className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: DIALOG_BG, border: `1px solid ${DIALOG_BD}`, backdropFilter: 'blur(24px)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${DIALOG_BD}` }}>
          <div className="flex items-center gap-2"><Wand2 className="w-4 h-4 text-violet-400" /><h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">新建提示词</h2></div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1">名称 <span className="text-rose-400">*</span></label>
            <input value={name} onChange={e => { setName(e.target.value); setNameErr(''); }} placeholder="提示词名称" className={inputCls} />
            {nameErr && <p className="text-[10px] text-rose-400 mt-1">{nameErr}</p>}
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">分类</label>
            <CategorySelect categories={['写作', '代码', '产品', 'HR', '分析', '通用']} value={category} onChange={setCategory} />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1">提示词内容 <span className="text-rose-400">*</span></label>
            <textarea value={content} onChange={e => { setContent(e.target.value); setContentErr(''); }} rows={5} placeholder="输入系统提示词内容..." className={cn(inputCls, 'resize-none leading-relaxed')} />
            {contentErr && <p className="text-[10px] text-rose-400 mt-1">{contentErr}</p>}
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">标签 <span className="text-slate-400 font-normal">（逗号分隔）</span></label>
            <input value={tags} onChange={e => setTags(e.target.value)} placeholder="写作, 商务" className={inputCls} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4" style={{ borderTop: `1px solid ${DIALOG_BD}` }}>
          <button onClick={onClose} className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 rounded-xl transition-colors">取消</button>
          <button onClick={submit} className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white btn-aurora rounded-xl"><Plus className="w-3.5 h-3.5" />创建提示词</button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── 技能编辑弹窗 ───────────────────────────────────────────────────── */
function EditSkillDialog({ item, onClose, onSave }: { item: SkillItem; onClose: () => void; onSave: (s: SkillItem) => void }) {
  const [name, setName] = useState(item.name);
  const [desc, setDesc] = useState(item.description);
  const [category, setCategory] = useState(item.category);
  const [tags, setTags] = useState(item.tags.join(', '));

  function submit() {
    if (!name.trim()) return;
    onSave({ ...item, name: name.trim(), description: desc.trim(), category, tags: tags.split(/[,，\s]+/).map(t => t.trim()).filter(Boolean) });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.15 }}
        className="relative w-full max-w-[calc(100%-2rem)] md:max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: DIALOG_BG, border: `1px solid ${DIALOG_BD}`, backdropFilter: 'blur(24px)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${DIALOG_BD}` }}>
          <div className="flex items-center gap-2"><Pencil className="w-4 h-4 text-cyan-400" /><h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">编辑技能</h2></div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">名称</label>
            <input value={name} onChange={e => setName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">分类</label>
            <CategorySelect categories={['文档', '代码', '分析', '通信', '数据', '通用']} value={category} onChange={setCategory} />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">描述</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} className={cn(inputCls, 'resize-none leading-relaxed')} />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">标签（逗号分隔）</label>
            <input value={tags} onChange={e => setTags(e.target.value)} className={inputCls} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4" style={{ borderTop: `1px solid ${DIALOG_BD}` }}>
          <button onClick={onClose} className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 rounded-xl transition-colors">取消</button>
          <button onClick={submit} className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white btn-aurora rounded-xl"><Save className="w-3 h-3" />保存</button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── 提示词编辑弹窗 ─────────────────────────────────────────────────── */
function EditPromptDialog({ item, onClose, onSave }: { item: PromptItem; onClose: () => void; onSave: (p: PromptItem) => void }) {
  const [name, setName] = useState(item.name);
  const [content, setContent] = useState(item.content);
  const [category, setCategory] = useState(item.category);
  const [tags, setTags] = useState(item.tags.join(', '));

  function submit() {
    if (!name.trim() || !content.trim()) return;
    onSave({ ...item, name: name.trim(), content: content.trim(), category, tags: tags.split(/[,，\s]+/).map(t => t.trim()).filter(Boolean) });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.15 }}
        className="relative w-full max-w-[calc(100%-2rem)] md:max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: DIALOG_BG, border: `1px solid ${DIALOG_BD}`, backdropFilter: 'blur(24px)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${DIALOG_BD}` }}>
          <div className="flex items-center gap-2"><Pencil className="w-4 h-4 text-violet-400" /><h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">编辑提示词</h2></div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3 max-h-[65vh] overflow-y-auto">
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">名称</label>
            <input value={name} onChange={e => setName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">分类</label>
            <CategorySelect categories={['写作', '代码', '产品', 'HR', '分析', '通用']} value={category} onChange={setCategory} />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">提示词内容</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={6} className={cn(inputCls, 'resize-none leading-relaxed')} />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">标签（逗号分隔）</label>
            <input value={tags} onChange={e => setTags(e.target.value)} className={inputCls} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4" style={{ borderTop: `1px solid ${DIALOG_BD}` }}>
          <button onClick={onClose} className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 rounded-xl transition-colors">取消</button>
          <button onClick={submit} className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white btn-aurora rounded-xl"><Save className="w-3 h-3" />保存</button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── 工具编辑弹窗 ───────────────────────────────────────────────────── */
function EditToolDialog({ tool, onClose, onSave }: { tool: MarketTool; onClose: () => void; onSave: (t: MarketTool) => void }) {
  const [name, setName] = useState(tool.name);
  const [desc, setDesc] = useState(tool.description);
  const [developer, setDeveloper] = useState(tool.developer);
  const [version, setVersion] = useState(tool.version);

  function submit() {
    if (!name.trim()) return;
    onSave({ ...tool, name: name.trim(), description: desc.trim(), developer: developer.trim(), version: version.trim() });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.15 }}
        className="relative w-full max-w-[calc(100%-2rem)] md:max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: DIALOG_BG, border: `1px solid ${DIALOG_BD}`, backdropFilter: 'blur(24px)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${DIALOG_BD}` }}>
          <div className="flex items-center gap-2"><Pencil className="w-4 h-4 text-amber-400" /><h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">编辑工具</h2></div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">工具名称</label>
            <input value={name} onChange={e => setName(e.target.value)} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1 block">开发者</label>
              <input value={developer} onChange={e => setDeveloper(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1 block">版本</label>
              <input value={version} onChange={e => setVersion(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">描述</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={4} className={cn(inputCls, 'resize-none leading-relaxed')} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4" style={{ borderTop: `1px solid ${DIALOG_BD}` }}>
          <button onClick={onClose} className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 rounded-xl transition-colors">取消</button>
          <button onClick={submit} className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white btn-aurora rounded-xl"><Save className="w-3 h-3" />保存</button>
        </div>
      </motion.div>
    </div>
  );
}

function SkillCard({ item, onDelete, onFav, onSave, faved, index }: { item: SkillItem; onDelete: () => void; onFav: () => void; onSave: (s: SkillItem) => void; faved: boolean; index: number }) {
  const Icon = iconMap[item.icon] ?? Zap;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  return (
    <>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
        onClick={() => setEditOpen(true)}
        className="glass glass-hover rounded-2xl p-4 flex flex-col h-full relative cursor-pointer hover:ring-1 hover:ring-cyan-500/30 transition-all">
        {/* 右上角常驻按钮 */}
        <div className="absolute top-3 right-3 flex items-center gap-1">
          <button onClick={e => { e.stopPropagation(); setEditOpen(true); }} title="编辑"
            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={e => { e.stopPropagation(); onFav(); }} title={faved ? '取消常用' : '添加到常用'}
            className={cn('p-1.5 rounded-lg transition-all', faved ? 'text-amber-400 bg-amber-500/15' : 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10')}>
            <Bookmark className={cn('w-3.5 h-3.5', faved && 'fill-amber-400')} />
          </button>
          <button onClick={e => { e.stopPropagation(); setConfirmDelete(true); }} title="删除"
            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 transition-all">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-start gap-3 mb-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br', item.iconBg)}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1 pr-24">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.name}</span>
              {item.official && <span className="text-[10px] bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded font-medium">官方</span>}
            </div>
            <div className="flex gap-1 flex-wrap mt-0.5">
              {item.tags.map(t => <span key={t} className="text-[10px] text-slate-500 bg-slate-100 dark:bg-white/8 px-1.5 rounded">{t}</span>)}
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed flex-1 text-pretty">{item.description}</p>
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border-subtle)]">
          <StarRating value={item.stars} />
          <span className="text-xs text-slate-500">{item.installs > 0 ? `${(item.installs / 1000).toFixed(1)}k` : '新建'}</span>
        </div>
      </motion.div>
      <AnimatePresence>
        {confirmDelete && (
          <DeleteConfirmDialog name={item.name} onCancel={() => setConfirmDelete(false)} onConfirm={() => { setConfirmDelete(false); onDelete(); }} />
        )}
        {editOpen && (
          <EditSkillDialog item={item} onClose={() => setEditOpen(false)} onSave={s => { onSave(s); setEditOpen(false); }} />
        )}
      </AnimatePresence>
    </>
  );
}

function PromptCard({ item, onDelete, onFav, onSave, faved, index }: { item: PromptItem; onDelete: () => void; onFav: () => void; onSave: (p: PromptItem) => void; faved: boolean; index: number }) {
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  function copy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(item.content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
        onClick={() => setEditOpen(true)}
        className="glass glass-hover rounded-2xl p-4 flex flex-col h-full cursor-pointer hover:ring-1 hover:ring-violet-500/30 transition-all">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-violet-500 to-purple-600">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.name}</span>
              {item.official && <span className="text-[10px] bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded font-medium">官方</span>}
            </div>
            <div className="flex gap-1 flex-wrap mt-0.5">
              {item.tags.map(t => <span key={t} className="text-[10px] text-slate-500 bg-slate-100 dark:bg-white/8 px-1.5 rounded">{t}</span>)}
            </div>
          </div>
          {/* 常驻操作按钮 */}
          <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
            <button onClick={e => { e.stopPropagation(); setEditOpen(true); }} title="编辑"
              className="p-1.5 rounded-lg text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 transition-all">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={e => { e.stopPropagation(); onFav(); }} title={faved ? '取消常用' : '添加到常用'}
              className={cn('p-1.5 rounded-lg transition-all', faved ? 'text-amber-400 bg-amber-500/15' : 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10')}>
              <Bookmark className={cn('w-3.5 h-3.5', faved && 'fill-amber-400')} />
            </button>
            <button onClick={copy} title={copied ? '已复制' : '复制提示词'}
              className={cn('p-1.5 rounded-lg transition-all', copied ? 'text-emerald-500 bg-emerald-500/10' : 'text-slate-400 hover:text-cyan-500 hover:bg-cyan-500/10')}>
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button onClick={e => { e.stopPropagation(); setConfirmDelete(true); }} title="删除"
              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 transition-all">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed flex-1 text-pretty">{item.description}</p>
        <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
          <p className="text-[10px] text-slate-400 font-mono line-clamp-2 leading-relaxed">{item.content}</p>
        </div>
      </motion.div>
      <AnimatePresence>
        {confirmDelete && (
          <DeleteConfirmDialog name={item.name} onCancel={() => setConfirmDelete(false)} onConfirm={() => { setConfirmDelete(false); onDelete(); }} />
        )}
        {editOpen && (
          <EditPromptDialog item={item} onClose={() => setEditOpen(false)} onSave={p => { onSave(p); setEditOpen(false); }} />
        )}
      </AnimatePresence>
    </>
  );
}

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  mcp:   { label: 'MCP',   cls: 'bg-violet-500/15 text-violet-500 dark:text-violet-400 border-violet-500/25' },
  skill: { label: 'Skill', cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25' },
  cli:   { label: 'CLI',   cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25' },
};

function ToolCard({ tool, installed, onToggle, onDelete, onSave, index }: { tool: MarketTool; installed: boolean; onToggle: () => void; onDelete: () => void; onSave: (t: MarketTool) => void; index: number }) {
  const Icon = iconMap[tool.icon] ?? FileText;
  const badge = TYPE_BADGE[tool.toolType];
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [installing, setInstalling] = useState(false);

  function handleInstall(e: React.MouseEvent) {
    e.stopPropagation();
    if (installed) { onToggle(); return; }
    setInstalling(true);
    setTimeout(() => { setInstalling(false); onToggle(); }, 1800);
  }

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
        onClick={() => setEditOpen(true)}
        className="glass glass-hover rounded-2xl p-4 flex flex-col h-full relative cursor-pointer hover:ring-1 hover:ring-amber-500/30 transition-all">
        {/* 右上角常驻：安装 + 删除 */}
        <div className="absolute top-3 right-3 flex items-center gap-1">
          <button onClick={handleInstall} title={installed ? '卸载' : installing ? '安装中...' : '安装'}
            disabled={installing}
            className={cn('p-1.5 rounded-lg transition-all', installing
              ? 'text-cyan-400 bg-cyan-500/15'
              : installed
                ? 'text-emerald-400 bg-emerald-500/15 hover:text-rose-400 hover:bg-rose-500/15'
                : 'text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/15')}>
            {installing
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : installed
                ? <PackageMinus className="w-3.5 h-3.5" />
                : <PackagePlus className="w-3.5 h-3.5" />}
          </button>
          <button onClick={e => { e.stopPropagation(); setConfirmDelete(true); }} title="删除"
            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 transition-all">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-start gap-3 mb-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br', tool.iconBg)}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1 pr-20">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{tool.name}</span>
              {tool.official && <span className="text-[10px] bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded font-medium">官方</span>}
              <span className={cn('text-[10px] border px-1.5 py-0.5 rounded font-medium', badge.cls)}>{badge.label}</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{tool.developer} · v{tool.version}</p>
          </div>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed flex-1 text-pretty">{tool.description}</p>
        <div className="flex flex-wrap gap-1 mt-2">
          {tool.needsApiKey && <span className="text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 px-1.5 py-0.5 rounded">需 API Key</span>}
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <StarRating value={tool.rating} />
            <span className="text-xs text-slate-500">{(tool.installs / 1000).toFixed(0)}k</span>
          </div>
          <span className={cn('text-[10px] font-medium px-2 py-1 rounded-lg border',
            installing
              ? 'bg-cyan-500/15 text-cyan-500 dark:text-cyan-400 border-cyan-500/25'
              : installed
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                : 'bg-slate-100 dark:bg-white/5 text-slate-500 border-[var(--border-subtle)]')}>
            {installing ? '安装中...' : installed ? '已安装' : '未安装'}
          </span>
        </div>
      </motion.div>
      <AnimatePresence>
        {confirmDelete && (
          <DeleteConfirmDialog name={tool.name} onCancel={() => setConfirmDelete(false)} onConfirm={() => { setConfirmDelete(false); onDelete(); }} />
        )}
        {editOpen && (
          <EditToolDialog tool={tool} onClose={() => setEditOpen(false)} onSave={t => { onSave(t); setEditOpen(false); }} />
        )}
      </AnimatePresence>
    </>
  );
}

function Pager({ total, current, onChange }: { total: number; current: number; onChange: (p: number) => void }) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center justify-between px-6 py-3 border-t border-[var(--border-subtle)] shrink-0">
      <span className="text-xs text-slate-500">第 {current + 1} / {total} 页</span>
      <div className="flex items-center gap-1">
        <button disabled={current === 0} onClick={() => onChange(current - 1)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        {Array.from({ length: total }, (_, i) => (
          <button key={i} onClick={() => onChange(i)}
            className={cn('w-7 h-7 rounded-lg text-xs font-medium transition-all',
              i === current ? 'btn-aurora text-white' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8')}>
            {i + 1}
          </button>
        ))}
        <button disabled={current >= total - 1} onClick={() => onChange(current + 1)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

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
          stars: 5, installs: 0, official: false,
          iconBg: ICON_COLORS[skillsList.length % ICON_COLORS.length],
          icon: 'Zap',
          tags: data.tags ?? [],
        };
        setSkillsList(prev => [item, ...prev]);
      } catch { /* ignore */ }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleAddCategory(name: string) {
    if (activeTab === 'skills') setSkillCats(prev => prev.includes(name) ? prev : [...prev, name]);
    else if (activeTab === 'prompts') setPromptCats(prev => prev.includes(name) ? prev : [...prev, name]);
    else setToolCats(prev => prev.includes(name) ? prev : [...prev, name]);
    setAddCatOpen(false);
  }

  const categories = activeTab === 'skills' ? skillCats : activeTab === 'prompts' ? promptCats : toolCats;

  const filteredSkills = skillsList.filter(s =>
    (category === '全部' || s.category === category) &&
    (s.name.includes(searchQuery) || s.description.includes(searchQuery))
  );
  const filteredPrompts = promptsList.filter(p =>
    (category === '全部' || p.category === category) &&
    (p.name.includes(searchQuery) || p.description.includes(searchQuery))
  );
  const filteredTools = toolsList.filter(t =>
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
            <button key={tab.id} onClick={() => handleTabChange(tab.id)}
              className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all',
                activeTab === tab.id
                  ? 'btn-aurora text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8')}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 内工具栏 */}
      <div className="px-6 pb-3 shrink-0 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
              placeholder={`搜索${TABS.find(t => t.id === activeTab)?.label ?? ''}...`}
              className="w-full bg-black/5 dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl pl-9 pr-3 py-2 text-sm text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-600 outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>
          {activeTab === 'skills' && (
            <>
              <button onClick={() => setCreateSkillOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 btn-aurora rounded-xl text-sm font-medium text-white shrink-0">
                <Plus className="w-4 h-4" />新建技能
              </button>
              <button onClick={() => importSkillRef.current?.click()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 border border-[var(--border-subtle)] hover:bg-black/8 dark:hover:bg-white/8 transition-colors shrink-0">
                <Upload className="w-4 h-4" />导入技能
              </button>
              <input ref={importSkillRef} type="file" accept=".json" className="hidden" onChange={handleImportSkill} />
            </>
          )}
          {activeTab === 'prompts' && (
            <button onClick={() => setCreatePromptOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 btn-aurora rounded-xl text-sm font-medium text-white shrink-0">
              <Plus className="w-4 h-4" />新建提示词
            </button>
          )}
          {activeTab === 'tools' && (
            <button onClick={() => setToolModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 btn-aurora rounded-xl text-sm font-medium text-white shrink-0">
              <Plus className="w-4 h-4" />新建工具
            </button>
          )}
        </div>

        {activeTab === 'tools' && (
          <div className="flex gap-2">
            {TOOL_TYPES.map(t => (
              <button key={t.value} onClick={() => { setToolType(t.value); setPage(0); }}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border shrink-0',
                  toolType === t.value
                    ? 'bg-white/10 border-white/20 text-slate-100'
                    : 'border-[var(--border-subtle)] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/5')}>
                <span className={toolType === t.value ? 'text-cyan-400' : t.color}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* 分类筛选 + 新增分类 */}
        <div className="flex gap-2 overflow-x-auto whitespace-nowrap pb-0.5">
          {categories.map(c => (
            <button key={c} onClick={() => { setCategory(c); setPage(0); }}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0',
                category === c
                  ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-500 dark:text-slate-400 border border-[var(--border-subtle)] hover:border-slate-400/30 dark:hover:border-white/15 hover:text-slate-700 dark:hover:text-slate-200')}>
              {c}
            </button>
          ))}
          <button onClick={() => setAddCatOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 text-slate-400 border border-dashed border-[var(--border-subtle)] hover:text-cyan-500 hover:border-cyan-500/40 transition-all">
            <Plus className="w-3 h-3" />新增分类
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
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {activeTab === 'skills' && (pageItems as SkillItem[]).map((s, i) => (
                <SkillCard key={s.id} item={s}
                  onDelete={() => setSkillsList(prev => prev.filter(x => x.id !== s.id))}
                  onFav={() => setFavSkills(prev => { const n = new Set(prev); n.has(s.id) ? n.delete(s.id) : n.add(s.id); return n; })}
                  onSave={updated => setSkillsList(prev => prev.map(x => x.id === updated.id ? updated : x))}
                  faved={favSkills.has(s.id)}
                  index={i} />
              ))}
              {activeTab === 'prompts' && (pageItems as PromptItem[]).map((p, i) => (
                <PromptCard key={p.id} item={p}
                  onDelete={() => setPromptsList(prev => prev.filter(x => x.id !== p.id))}
                  onFav={() => setFavPrompts(prev => { const n = new Set(prev); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n; })}
                  onSave={updated => setPromptsList(prev => prev.map(x => x.id === updated.id ? updated : x))}
                  faved={favPrompts.has(p.id)}
                  index={i} />
              ))}
              {activeTab === 'tools' && (pageItems as MarketTool[]).map((t, i) => (
                <ToolCard key={t.id} tool={t} installed={installedTools.has(t.id)}
                  onToggle={() => setInstalledTools(prev => { const n = new Set(prev); n.has(t.id) ? n.delete(t.id) : n.add(t.id); return n; })}
                  onDelete={() => setToolsList(prev => prev.filter(x => x.id !== t.id))}
                  onSave={updated => setToolsList(prev => prev.map(x => x.id === updated.id ? updated : x))}
                  index={i} />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <Pager total={totalPages} current={safePage} onChange={p => setPage(p)} />

      <AnimatePresence>
        {createSkillOpen && (
          <CreateSkillDialog onClose={() => setCreateSkillOpen(false)}
            onConfirm={s => { setSkillsList(prev => [s, ...prev]); setCreateSkillOpen(false); }} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {createPromptOpen && (
          <CreatePromptDialog onClose={() => setCreatePromptOpen(false)}
            onConfirm={p => { setPromptsList(prev => [p, ...prev]); setCreatePromptOpen(false); }} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {addCatOpen && (
          <AddCategoryDialog onClose={() => setAddCatOpen(false)} onConfirm={handleAddCategory} />
        )}
      </AnimatePresence>
      <CreateToolModal open={toolModalOpen} onClose={() => setToolModalOpen(false)} onCreated={(_type: NewToolType, _name: string) => {}} />
    </div>
  );
}
