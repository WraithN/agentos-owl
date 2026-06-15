import type Database from "better-sqlite3";
import * as queries from "../queries/index.js";
import type { DocChunk, KnowledgeDoc } from "../types.js";
import { daysAgo } from "./utils.js";

export function seedKnowledge(db: Database.Database): void {
  const count = db.prepare("SELECT COUNT(*) FROM knowledge_docs").pluck().get() as number;
  if (count > 0) return;

  const docs: KnowledgeDoc[] = [
    { id: "doc-1", name: "Q2 用户增长策略报告.pdf", size: "2.4 MB", status: "ready", chunks: 48, createdAt: daysAgo(14), docType: "pdf" },
    { id: "doc-2", name: "产品技术架构文档.md", size: "156 KB", status: "ready", chunks: 23, createdAt: daysAgo(18), docType: "md" },
    { id: "doc-3", name: "竞品分析数据集.csv", size: "890 KB", status: "processing", chunks: 0, createdAt: daysAgo(3), docType: "csv" },
    { id: "doc-4", name: "用户调研访谈记录.docx", size: "3.1 MB", status: "ready", chunks: 67, createdAt: daysAgo(30), docType: "docx" },
    { id: "doc-5", name: "2025 年度财务报告.pdf", size: "8.7 MB", status: "error", errorMsg: "文件解析失败：PDF 版本不兼容...", chunks: 0, createdAt: daysAgo(5), docType: "pdf" },
  ];

  for (const doc of docs) {
    queries.upsertDoc(db, doc);
  }

  const chunks: DocChunk[] = [
    { id: "chunk-1", docId: "doc-1", idx: 0, content: "## 用户增长现状分析\n\nQ2 整体 DAU 为 124,800...", tokens: 128 },
    { id: "chunk-2", docId: "doc-1", idx: 1, content: "## 关键漏斗分析\n\n注册流程分析显示...", tokens: 142 },
    { id: "chunk-3", docId: "doc-1", idx: 2, content: "## 增长实验建议\n\n基于数据分析...", tokens: 168 },
  ];

  for (const chunk of chunks) {
    queries.insertChunk(db, chunk);
  }
}
