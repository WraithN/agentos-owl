import type Database from "better-sqlite3";
import * as queries from "../queries/index.js";
import type { WorkflowTemplate } from "../types.js";
import { daysAgo, now } from "../../utils/time.js";

/**
 * 默认工作流：覆盖输入/Agent/工具/条件/输出五种节点 + 连线，
 * 让首次进入"工作流编排"页就能看到完整画布示例。
 */
export function seedWorkflows(db: Database.Database): void {
  const count = db
    .prepare("SELECT COUNT(*) FROM workflow_templates")
    .pluck()
    .get() as number;
  if (count > 0) return;

  const created = daysAgo(45);

  const wf: WorkflowTemplate = {
    id: "wf-1",
    name: "每日竞品监控",
    description: "每天 9:00 自动抓取竞品动态，AI 分析后推送摘要报告",
    nodes: [
      {
        id: "n1",
        type: "input",
        name: "定时触发",
        x: 80,
        y: 80,
        config: { triggerEvent: "schedule", cronExpr: "0 9 * * 1-5" },
      },
      {
        id: "n2",
        type: "agent",
        name: "Analyst 分析",
        x: 340,
        y: 60,
        config: {
          agentName: "Analyst",
          model: "GPT-4o",
          prompt: "分析竞品动态并提取关键信息",
        },
      },
      {
        id: "n3",
        type: "tool",
        name: "网页搜索",
        x: 340,
        y: 200,
        config: { toolName: "web-search", params: '{"query": "{{input}}"}' },
      },
      {
        id: "n4",
        type: "condition",
        name: "结果评分",
        x: 600,
        y: 120,
        config: {
          expression: "score > 0.7",
          trueLabel: "高质量",
          falseLabel: "重试",
        },
      },
      {
        id: "n5",
        type: "output",
        name: "发送报告",
        x: 860,
        y: 120,
        config: { format: "Markdown", target: "notification" },
      },
    ],
    edges: [
      { id: "e1", source: "n1", target: "n2" },
      { id: "e2", source: "n1", target: "n3" },
      { id: "e3", source: "n2", target: "n4" },
      { id: "e4", source: "n3", target: "n4" },
      { id: "e5", source: "n4", target: "n5" },
    ],
    viewport: { x: 0, y: 0, scale: 1 },
    createdAt: created,
    updatedAt: created,
    lastRun: now() - 1000 * 60 * 23,
  };

  queries.upsertWorkflow(db, wf);
}
