import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

export interface ConversationDetailEntry {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: number;
  status?: string;
  meta?: unknown;
}

function detailDir(): string {
  const dir = path.join(app.getPath("userData"), "conversation-details");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function conversationDetailPath(conversationId: string): string {
  return path.join(detailDir(), `${conversationId}.jsonl`);
}

export function appendConversationDetail(entry: ConversationDetailEntry): string {
  const filePath = conversationDetailPath(entry.conversationId);
  fs.appendFileSync(filePath, `${JSON.stringify(entry)}\n`, "utf-8");
  return filePath;
}

export function readConversationDetails(conversationId: string): ConversationDetailEntry[] {
  const filePath = conversationDetailPath(conversationId);
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, "utf-8")
    .split("\n")
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as ConversationDetailEntry];
      } catch {
        return [];
      }
    });
}

export function purgeExpiredConversationDetails(): void {
  const expireBefore = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const dir = detailDir();
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith(".jsonl")) continue;
    const filePath = path.join(dir, name);
    const stat = fs.statSync(filePath);
    if (stat.mtimeMs < expireBefore) {
      fs.unlinkSync(filePath);
    }
  }
}
