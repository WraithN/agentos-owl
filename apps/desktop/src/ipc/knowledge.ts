import { ipcMain } from "electron";
import { getDatabase } from "../db/connection.js";
import * as queries from "../db/queries/index.js";
import type { KnowledgeDoc, DocChunk } from "../db/types.js";
import { nowMs, uuid } from "./_utils.js";

export function registerKnowledgeHandlers(): void {
  ipcMain.handle("list_knowledge_docs", () => {
    return queries.listDocs(getDatabase());
  });

  ipcMain.handle("get_knowledge_doc", (_event, id: string) => {
    return queries.listDocs(getDatabase()).find((d) => d.id === id);
  });

  ipcMain.handle("save_knowledge_doc", (_event, doc: KnowledgeDoc) => {
    const db = getDatabase();
    if (!doc.id) {
      doc.id = uuid();
      doc.createdAt = nowMs();
    }
    queries.upsertDoc(db, doc);
    return doc;
  });

  ipcMain.handle("delete_knowledge_doc", (_event, id: string) => {
    queries.deleteDoc(getDatabase(), id);
  });

  ipcMain.handle("list_doc_chunks", (_event, docId: string) => {
    return queries.listChunks(getDatabase(), docId);
  });

  ipcMain.handle("save_doc_chunk", (_event, chunk: DocChunk) => {
    const db = getDatabase();
    if (!chunk.id) {
      chunk.id = uuid();
    }
    queries.insertChunk(db, chunk);
    return chunk;
  });

  ipcMain.handle("save_doc_chunks", (_event, chunks: DocChunk[]) => {
    const db = getDatabase();
    for (const chunk of chunks) {
      if (!chunk.id) {
        chunk.id = uuid();
      }
      queries.insertChunk(db, chunk);
    }
  });
}
