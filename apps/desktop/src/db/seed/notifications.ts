import type Database from "better-sqlite3";
import * as queries from "../queries/index.js";
import type { Notification } from "../types.js";
import { now } from "./utils.js";

export function seedNotifications(db: Database.Database): void {
  const count = db.prepare("SELECT COUNT(*) FROM notifications").pluck().get() as number;
  if (count > 0) return;

  const t = now();
  const notifs: Notification[] = [
    { id: "notif-1", title: "任务完成", content: "「用户增长方案」项目看板任务「竞品 UI 调研报告」已完成", notifType: "success", read: false, timestamp: t - 1000 * 60 * 5 },
    { id: "notif-2", title: "需要审批", content: "Aria 已提交用户增长方案优先级确认，请审阅并通过", notifType: "warning", read: false, timestamp: t - 1000 * 60 * 10 },
    { id: "notif-3", title: "工作流执行中", content: "「每日竞品监控」工作流正在执行步骤 3/4", notifType: "info", read: true, timestamp: t - 1000 * 60 * 23 },
    { id: "notif-4", title: "文档上传失败", content: "「2025 年度财务报告.pdf」解析失败，请检查文件格式后重新上传", notifType: "error", read: true, timestamp: t - 1000 * 60 * 60 * 2 },
  ];

  for (const n of notifs) {
    queries.upsertNotification(db, n);
  }
}
