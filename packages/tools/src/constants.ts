import { createElement } from 'react';
import type { ReactNode } from 'react';
import {
  Search,
  Code2,
  GitBranch,
  BarChart3,
  MessageSquare,
  FileText,
  Database,
  Mail,
  Shield,
  Puzzle,
  Cpu,
  Terminal,
  Zap,
  Wand2,
} from 'lucide-react';
import type { ComponentType } from 'react';
import type { SkillItem, PromptItem, TabId } from './types.js';

const icon = (Component: ComponentType<{ className?: string }>, cls: string): ReactNode =>
  createElement(Component, { className: cls });

/* ── 技能市场初始数据 ─────────────────────────────────────────────── */
export const INIT_SKILLS: SkillItem[] = [
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
export const INIT_PROMPTS: PromptItem[] = [
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

export const SKILL_CATEGORIES_DEFAULT = ['全部', '文档', '代码', '分析', '通信', '数据'];
export const PROMPT_CATEGORIES_DEFAULT = ['全部', '写作', '代码', '产品', 'HR', '分析'];
export const TOOL_CATEGORIES_DEFAULT = ['全部', '搜索', '代码', '数据分析', '文档', '通信', '通用'];

export const TOOL_TYPES: { value: 'all' | 'mcp' | 'cli'; label: string; icon: ReactNode; color: string }[] = [
  { value: 'all', label: '全部类型', icon: icon(Puzzle, 'w-3.5 h-3.5'), color: 'text-slate-400' },
  { value: 'mcp', label: 'MCP', icon: icon(Cpu, 'w-3.5 h-3.5'), color: 'text-violet-400' },
  { value: 'cli', label: 'CLI', icon: icon(Terminal, 'w-3.5 h-3.5'), color: 'text-emerald-400' },
];

export const ICON_COLORS = [
  'from-cyan-500 to-blue-600',
  'from-violet-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-600',
  'from-sky-500 to-cyan-600',
];

export const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  Search,
  Code2,
  GitBranch,
  BarChart3,
  MessageSquare,
  FileText,
  Database,
  Mail,
  Shield,
};

export const PAGE_SIZE = 9;

export const TABS: { id: TabId; label: string; icon: ReactNode }[] = [
  { id: 'skills', label: '技能市场', icon: icon(Zap, 'w-4 h-4') },
  { id: 'prompts', label: '提示词市场', icon: icon(Wand2, 'w-4 h-4') },
  { id: 'tools', label: '工具市场', icon: icon(Puzzle, 'w-4 h-4') },
];

export const DIALOG_BG = 'var(--panel-bg-solid)';
export const DIALOG_BD = 'var(--border-subtle)';

export const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  mcp: { label: 'MCP', cls: 'bg-violet-500/15 text-violet-500 dark:text-violet-400 border-violet-500/25' },
  skill: { label: 'Skill', cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25' },
  cli: { label: 'CLI', cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25' },
};
