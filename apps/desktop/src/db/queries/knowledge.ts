import type Database from "better-sqlite3";
import type { DocChunk, KnowledgeDoc } from "../types.js";

const docColumns = `
  SELECT id, name, size, status, error_msg, chunks, created_at, doc_type, file_path
  FROM knowledge_docs
`;

export function listDocs(db: Database.Database): KnowledgeDoc[] {
  const rows = db
    .prepare(`${docColumns} ORDER BY created_at DESC`)
    .all() as Record<string, unknown>[];
  return rows.map(mapDoc);
}

export function upsertDoc(db: Database.Database, doc: KnowledgeDoc): void {
  db.prepare(
    `INSERT INTO knowledge_docs (id, name, size, status, error_msg, chunks, created_at, doc_type, file_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, size = excluded.size, status = excluded.status,
        error_msg = excluded.error_msg, chunks = excluded.chunks, doc_type = excluded.doc_type,
        file_path = excluded.file_path`
  ).run(
    doc.id,
    doc.name,
    doc.size,
    doc.status,
    doc.errorMsg ?? null,
    doc.chunks,
    doc.createdAt,
    doc.docType,
    doc.filePath ?? null
  );
}

export function deleteDoc(db: Database.Database, id: string): void {
  db.prepare("DELETE FROM knowledge_docs WHERE id = ?").run(id);
}

export function listChunks(
  db: Database.Database,
  docId: string
): DocChunk[] {
  const rows = db
    .prepare(
      "SELECT id, doc_id, idx, content, tokens FROM doc_chunks WHERE doc_id = ? ORDER BY idx"
    )
    .all(docId) as Record<string, unknown>[];
  return rows.map(mapChunk);
}

export function insertChunk(db: Database.Database, chunk: DocChunk): void {
  db.prepare(
    "INSERT INTO doc_chunks (id, doc_id, idx, content, tokens) VALUES (?, ?, ?, ?, ?)"
  ).run(chunk.id, chunk.docId, chunk.idx, chunk.content, chunk.tokens);
}

export function deleteChunksForDoc(db: Database.Database, docId: string): void {
  db.prepare("DELETE FROM doc_chunks WHERE doc_id = ?").run(docId);
}

function mapDoc(row: Record<string, unknown>): KnowledgeDoc {
  return {
    id: String(row.id),
    name: String(row.name),
    size: String(row.size),
    status: String(row.status),
    errorMsg: row.error_msg ? String(row.error_msg) : undefined,
    chunks: Number(row.chunks),
    createdAt: Number(row.created_at),
    docType: String(row.doc_type),
    filePath: row.file_path ? String(row.file_path) : undefined,
  };
}

function mapChunk(row: Record<string, unknown>): DocChunk {
  return {
    id: String(row.id),
    docId: String(row.doc_id),
    idx: Number(row.idx),
    content: String(row.content),
    tokens: Number(row.tokens),
  };
}
