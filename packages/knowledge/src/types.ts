/* 知识库共享类型 */
import type { ReactNode } from 'react';

/** 文档状态 */
export type DocStatus = 'ready' | 'processing' | 'error';

/** 知识库文档 */
export interface KnowledgeDoc {
  id: string;
  name: string;
  size: string;
  status: DocStatus;
  errorMsg?: string;
  chunks: number;
  createdAt: Date;
  type: 'pdf' | 'docx' | 'txt' | 'md' | 'csv';
}

/** 文档知识块 */
export interface DocChunk {
  id: string;
  index: number;
  content: string;
  tokens: number;
  similarity?: number;
}

/** 知识库类型 */
export type KBType = 'vector' | 'wiki' | 'ontology';

/** 知识库 */
export interface KnowledgeBase {
  id: string;
  name: string;
  vectorDbUrl: string;
  description?: string;
  docCount: number;
  chunkCount: number;
  storageSize: string;
  processingCount: number;
  isGlobal: boolean;
  kbType: KBType;
}

/** 切片策略 */
export type Strategy = 'fixed' | 'sentence' | 'paragraph' | 'semantic';

/** 切片规则 */
export interface SliceRule {
  id: string;
  name: string;
  strategy: Strategy;
  chunkSize: number;
  overlap: number;
  separator: string;
  preprocess: string[];
  description: string;
}

/** 切片规则表单数据 */
export type RuleFormData = Omit<SliceRule, 'id'>;

/** 知识库表单数据 */
export interface KBFormData {
  name: string;
  vectorDbUrl: string;
  description: string;
  kbType: KBType;
}

/** 检索对话消息 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  chunks?: { chunk: DocChunk; docName: string; score: number }[];
}

/** 知识库外壳 Tab */
export type KBShellTab = { id: string; label: string; icon?: ReactNode };
