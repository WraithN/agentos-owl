/* 知识库共享常量 */
import { Database, BookOpen, Network, FileText, FileCode } from 'lucide-react';
import { cn } from '@owl-os/core';
import type { KBType, Strategy, KnowledgeBase, SliceRule } from './types.js';

/** 知识库类型元信息 */
export const KB_TYPE_META: Record<
  KBType,
  { label: string; icon: typeof Database; gradient: string; badgeCls: string }
> = {
  vector: {
    label: '向量知识库',
    icon: Database,
    gradient: 'from-cyan-500 to-blue-600',
    badgeCls: 'bg-cyan-500/15 text-cyan-500 dark:text-cyan-400 border-cyan-500/25',
  },
  wiki: {
    label: 'Wiki知识库',
    icon: BookOpen,
    gradient: 'from-emerald-500 to-teal-600',
    badgeCls: 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border-emerald-500/25',
  },
  ontology: {
    label: 'Ontology',
    icon: Network,
    gradient: 'from-violet-500 to-purple-600',
    badgeCls: 'bg-violet-500/15 text-violet-500 dark:text-violet-400 border-violet-500/25',
  },
};

/** 预处理选项 */
export const PREPROCESS_OPTIONS = [
  { id: 'clean', label: '自动清洗无效内容（空行、多余空格、页眉页脚）' },
  { id: 'filter', label: '过滤低质量短块与乱码内容' },
  { id: 'table', label: '保留表格结构化格式，不强行拆分' },
  { id: 'dedup', label: '自动去重重复知识块' },
] as const;

/** 文档状态样式 */
export const statusConfig = {
  ready: {
    label: '已就绪',
    cls: 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border-emerald-500/25',
  },
  processing: {
    label: '处理中',
    cls: 'bg-cyan-500/15 text-cyan-500 dark:text-cyan-400 border-cyan-500/25 animate-pulse',
  },
  error: {
    label: '解析失败',
    cls: 'bg-rose-500/15 text-rose-500 dark:text-rose-400 border-rose-500/25',
  },
};

/** 文档类型图标 */
export const docTypeIcon: Record<string, typeof FileText> = {
  pdf: FileText,
  docx: FileText,
  md: FileCode,
  csv: Database,
  txt: FileText,
};

/** 默认切片规则 */
export const DEFAULT_SLICE_RULES: SliceRule[] = [
  {
    id: 'sr-1',
    name: '固定长度切片',
    strategy: 'fixed',
    chunkSize: 512,
    overlap: 64,
    separator: '\n',
    preprocess: ['clean', 'dedup'],
    description: '按固定 token 数切割，适合格式均匀的文档',
  },
  {
    id: 'sr-2',
    name: '段落切片',
    strategy: 'paragraph',
    chunkSize: 800,
    overlap: 80,
    separator: '\n\n',
    preprocess: ['clean', 'table'],
    description: '按段落边界切割，保留语义完整性',
  },
  {
    id: 'sr-3',
    name: '语义切片',
    strategy: 'semantic',
    chunkSize: 600,
    overlap: 100,
    separator: '',
    preprocess: ['clean', 'filter', 'dedup'],
    description: '基于语义相似度自动分割，效果最佳',
  },
];

/** 策略标签 */
export const STRATEGY_LABELS: Record<Strategy, string> = {
  fixed: '固定长度',
  sentence: '按句子',
  paragraph: '按段落',
  semantic: '语义分割',
};

/** 策略颜色 */
export const STRATEGY_COLORS: Record<Strategy, string> = {
  fixed: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  sentence: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  paragraph: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  semantic: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};

/** 初始知识库列表 */
export const INIT_KBS: KnowledgeBase[] = [
  { id: 'kb-1', name: '默认知识库', vectorDbUrl: 'http://localhost:6333', docCount: 5, chunkCount: 138, storageSize: '15.3 MB', processingCount: 1, isGlobal: true, kbType: 'vector' },
  { id: 'kb-2', name: '产品文档库', vectorDbUrl: 'http://localhost:6333', docCount: 12, chunkCount: 342, storageSize: '38.7 MB', processingCount: 0, isGlobal: false, kbType: 'vector' },
  { id: 'kb-3', name: '外部知识库', vectorDbUrl: 'https://qdrant.example.com:6333', docCount: 89, chunkCount: 2140, storageSize: '210.5 MB', processingCount: 3, isGlobal: false, kbType: 'vector' },
  { id: 'kb-4', name: '法务合规库', vectorDbUrl: 'http://localhost:6333', docCount: 34, chunkCount: 890, storageSize: '56.2 MB', processingCount: 0, isGlobal: false, kbType: 'vector' },
  { id: 'kb-5', name: '技术架构库', vectorDbUrl: 'http://localhost:6333', docCount: 21, chunkCount: 567, storageSize: '42.1 MB', processingCount: 2, isGlobal: false, kbType: 'vector' },
  { id: 'kb-6', name: '用户反馈库', vectorDbUrl: 'http://localhost:6333', docCount: 156, chunkCount: 4200, storageSize: '128.6 MB', processingCount: 0, isGlobal: false, kbType: 'vector' },
  { id: 'kb-7', name: '竞品资料库', vectorDbUrl: 'https://qdrant.example.com:6333', docCount: 45, chunkCount: 1120, storageSize: '78.3 MB', processingCount: 1, isGlobal: false, kbType: 'vector' },
  { id: 'kb-8', name: '财务数据仓', vectorDbUrl: 'http://localhost:6333', docCount: 67, chunkCount: 1560, storageSize: '95.4 MB', processingCount: 0, isGlobal: false, kbType: 'vector' },
  { id: 'kb-9', name: '产品 Wiki', vectorDbUrl: 'https://wiki.example.com', docCount: 230, chunkCount: 3800, storageSize: '62.4 MB', processingCount: 0, isGlobal: false, kbType: 'wiki' },
  { id: 'kb-10', name: '工程 Wiki', vectorDbUrl: 'https://wiki.example.com', docCount: 415, chunkCount: 7200, storageSize: '134.8 MB', processingCount: 2, isGlobal: false, kbType: 'wiki' },
  { id: 'kb-11', name: '业务领域本体', vectorDbUrl: 'http://localhost:7474', docCount: 18, chunkCount: 520, storageSize: '28.1 MB', processingCount: 0, isGlobal: false, kbType: 'ontology' },
  { id: 'kb-12', name: '产品知识图谱', vectorDbUrl: 'http://localhost:7474', docCount: 42, chunkCount: 1340, storageSize: '56.7 MB', processingCount: 1, isGlobal: false, kbType: 'ontology' },
];

/** 弹窗背景 */
export const DIALOG_BG = 'var(--panel-bg-solid)';

/** 弹窗边框 */
export const DIALOG_BD = 'var(--border-subtle)';

/** 标准输入框样式 */
export const inputCls =
  'w-full bg-black/5 dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 outline-none focus:border-cyan-500/50 transition-colors';

/** 带错误状态的输入框 */
export const inputClsErr = (hasError?: boolean) =>
  cn(inputCls, hasError && 'border-rose-500/60 focus:border-rose-500/60');
