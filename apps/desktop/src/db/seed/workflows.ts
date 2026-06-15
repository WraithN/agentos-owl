import type Database from "better-sqlite3";
import * as queries from "../queries/index.js";
import type { WorkflowTemplate } from "../types.js";
import { daysAgo, now } from "./utils.js";

export function seedWorkflows(db: Database.Database): void {
  const count = db.prepare("SELECT COUNT(*) FROM workflow_templates").pluck().get() as number;
  if (count > 0) return;

  const wf: WorkflowTemplate = {
    id: "wf-1",
    name: "每日竞品监控",
    description: "每天 9:00 自动抓取竞品动态，AI 分析后推送摘要报告",
    nodes: [
      { id: "node-1", name: "定时触发", type: "trigger", status: "done", duration: 12, output: "触发时间: 2026-06-12 09:00:00" },
      { id: "node-2", name: "抓取竞品页面", type: "tool", status: "done", duration: 8420, input: "目标站点...", output: "成功抓取 3 个站点..." },
      { id: "node-3", name: "AI 对比分析", type: "llm", status: "running", input: "分析维度：定价/功能/UX/营销文案" },
      { id: "node-4", name: "生成并推送报告", type: "end", status: "pending" },
    ],
    createdAt: daysAgo(45),
    lastRun: now() - 1000 * 60 * 23,
  };

  queries.upsertWorkflow(db, wf);
}
