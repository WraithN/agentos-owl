import { ipcMain } from "electron";
import fs from "node:fs";
import path from "node:path";

function parseTxt(content: string) {
  return content.split(/\n\s*\n/).map((paragraph, index) => ({
    index,
    text: paragraph.trim(),
    metadata: { type: "paragraph" },
  }));
}

function parseMarkdown(content: string) {
  // 简单按标题与段落拆分
  const sections = content.split(/^#{1,6}\s+/m).filter(Boolean);
  return sections.map((section, index) => ({
    index,
    text: section.trim(),
    metadata: { type: "section" },
  }));
}

export function registerParseDocumentHandlers(): void {
  ipcMain.handle("parse_document", async (_event, filePath: string) => {
    const ext = path.extname(filePath).toLowerCase();
    const content = fs.readFileSync(filePath, "utf-8");

    if (ext === ".md" || ext === ".markdown") {
      return parseMarkdown(content);
    }

    if (ext === ".txt") {
      return parseTxt(content);
    }

    if (ext === ".json") {
      return JSON.parse(content);
    }

    throw new Error(`不支持的文件类型: ${ext}`);
  });
}
