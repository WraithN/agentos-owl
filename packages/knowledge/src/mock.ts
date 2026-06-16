/* 知识库 Mock 数据 */
import type { KnowledgeDoc, DocChunk } from './types.js';

export const KNOWLEDGE_DOCS: KnowledgeDoc[] = [
  { id: 'doc-1', name: 'Q2 用户增长策略报告.pdf', size: '2.4 MB', status: 'ready', chunks: 48, createdAt: new Date('2026-06-01'), type: 'pdf' },
  { id: 'doc-2', name: '产品技术架构文档.md', size: '156 KB', status: 'ready', chunks: 23, createdAt: new Date('2026-05-28'), type: 'md' },
  { id: 'doc-3', name: '竞品分析数据集.csv', size: '890 KB', status: 'processing', chunks: 0, createdAt: new Date('2026-06-12'), type: 'csv' },
  { id: 'doc-4', name: '用户调研访谈记录.docx', size: '3.1 MB', status: 'ready', chunks: 67, createdAt: new Date('2026-05-15'), type: 'docx' },
  {
    id: 'doc-5',
    name: '2025 年度财务报告.pdf',
    size: '8.7 MB',
    status: 'error',
    chunks: 0,
    errorMsg: '文件解析失败：PDF 版本不兼容，请尝试重新导出后上传。',
    createdAt: new Date('2026-06-10'),
    type: 'pdf',
  },
];

export const DOC_CHUNKS: DocChunk[] = [
  {
    id: 'chunk-1',
    index: 0,
    content: '## 用户增长现状分析\n\nQ2 整体 DAU 为 124,800，环比增长 8.2%。但增长曲线在 5 月下旬出现明显放缓，主要受到竞品新版本发布影响。核心留存指标（Day-1 留存）为 43%，Day-7 为 22%，均低于行业标杆产品的 52% 和 31%。',
    tokens: 128,
  },
  {
    id: 'chunk-2',
    index: 1,
    content: '## 关键漏斗分析\n\n注册流程分析显示，手机号验证环节是最大流失点（34% 用户在此放弃）。用户测试反馈：验证码延迟高、界面流程繁琐是主要抱怨点。建议优先解决验证码下发速度（P99 目前 23s，目标 < 3s）。',
    tokens: 142,
  },
  {
    id: 'chunk-3',
    index: 2,
    content: '## 增长实验建议\n\n基于数据分析，建议按以下顺序开展增长实验：\n1. **验证流程优化**（预计 +12% 注册转化）\n2. **首周任务引导**（预计 +8% Day-7 留存）\n3. **智能推送策略**（预计 +15% 次日打开率）\n\n三项实验如全部成功，可实现 Q3 DAU 提升 ~28%。',
    tokens: 168,
  },
];
