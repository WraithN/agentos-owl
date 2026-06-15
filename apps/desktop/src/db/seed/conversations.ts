import type Database from "better-sqlite3";
import * as queries from "../queries/index.js";
import type { Conversation, Message } from "../types.js";
import { now } from "./utils.js";

export function seedConversations(db: Database.Database): void {
  const count = db.prepare("SELECT COUNT(*) FROM conversations").pluck().get() as number;
  if (count > 0) return;

  const t = now();
  const convs: Conversation[] = [
    {
      id: "conv-1",
      title: "用户增长方案设计",
      mode: "squad",
      lastMessage: "Analyst: 已完成 DAU 数据分析...",
      lastTime: t - 1000 * 60 * 8,
      unread: 3,
      agentIds: ["aria", "coder", "muse", "analyst"],
      pinned: true,
      createdAt: t - 1000 * 60 * 60 * 24,
      updatedAt: t - 1000 * 60 * 8,
    },
    {
      id: "conv-2",
      title: "每日竞品监控",
      mode: "auto",
      lastMessage: "⚡ 正在执行步骤 3/4...",
      lastTime: t - 1000 * 60 * 23,
      unread: 1,
      agentIds: ["analyst"],
      pinned: false,
      createdAt: t - 1000 * 60 * 60 * 24,
      updatedAt: t - 1000 * 60 * 23,
    },
    {
      id: "conv-3",
      title: "帮我写一个 React 拖拽组件",
      mode: "single",
      lastMessage: "Aria: 这是一个基于 @dnd-kit 的完整拖拽实现...",
      lastTime: t - 1000 * 60 * 60 * 2,
      unread: 0,
      agentIds: ["aria"],
      pinned: false,
      createdAt: t - 1000 * 60 * 60 * 3,
      updatedAt: t - 1000 * 60 * 60 * 2,
    },
    {
      id: "conv-4",
      title: "分析 Q2 销售数据",
      mode: "single",
      lastMessage: "Q2 整体收入同比增长 18.3%...",
      lastTime: t - 1000 * 60 * 60 * 26,
      unread: 0,
      agentIds: ["analyst"],
      pinned: false,
      createdAt: t - 1000 * 60 * 60 * 30,
      updatedAt: t - 1000 * 60 * 60 * 26,
    },
  ];

  for (const conv of convs) {
    queries.upsertConversation(db, conv);
  }

  const msgs: Message[] = [
    {
      id: "msg-1",
      conversationId: "conv-1",
      msgType: "user",
      contentType: "text",
      status: "done",
      content:
        "帮我设计用户增长方案，需要包含数据分析、工程实现和设计规范，目标是 Q3 DAU 提升 30%。",
      timestamp: t - 1000 * 60 * 40,
    },
    {
      id: "msg-sys-1",
      conversationId: "conv-1",
      msgType: "system",
      contentType: "text",
      status: "done",
      content: "Aria 已召集 Analyst、Coder、Muse 组成「用户增长攻坚队」...",
      timestamp: t - 1000 * 60 * 39,
    },
  ];

  for (const msg of msgs) {
    queries.upsertMessage(db, msg);
  }
}
