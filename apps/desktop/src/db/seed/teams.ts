import type Database from "better-sqlite3";
import * as queries from "../queries/index.js";
import type { TeamTemplate } from "../types.js";
import { daysAgo } from "./utils.js";

export function seedTeams(db: Database.Database): void {
  const count = db.prepare("SELECT COUNT(*) FROM team_templates").pluck().get() as number;
  if (count > 0) return;

  const teams: TeamTemplate[] = [
    { id: "team-1", name: "用户增长攻坚队", description: "处理用户增长相关的数据分析、工程优化与设计改版", memberIds: ["aria", "analyst", "coder", "muse"], coordinatorId: "aria", triggerRule: "当用户提到增长、留存、DAU、转化率等关键词时自动召集", mode: "parallel", enabled: true, createdAt: daysAgo(60), updatedAt: daysAgo(10) },
    { id: "team-2", name: "技术方案评审组", description: "对复杂技术方案进行多维度评审", memberIds: ["aria", "coder", "analyst"], coordinatorId: "coder", triggerRule: "当用户提到技术方案、架构设计、代码评审时自动召集", mode: "sequential", enabled: false, createdAt: daysAgo(60), updatedAt: daysAgo(10) },
    { id: "team-3", name: "内容创作工作室", description: "负责文案撰写、品牌内容与设计素材产出", memberIds: ["muse", "writer", "designer"], coordinatorId: "muse", triggerRule: "当用户提到文案、品牌、海报、内容营销时自动召集", mode: "parallel", enabled: true, createdAt: daysAgo(60), updatedAt: daysAgo(10) },
    { id: "team-4", name: "产品开发全栈组", description: "端到端产品交付：需求 → 设计 → 开发 → 部署", memberIds: ["pm", "designer", "coder", "ops"], coordinatorId: "pm", triggerRule: "当用户提到产品、上线、迭代、全栈时自动召集", mode: "pipeline", enabled: true, createdAt: daysAgo(60), updatedAt: daysAgo(10) },
    { id: "team-5", name: "运维保障小分队", description: "监控、告警、故障排查与自动化运维", memberIds: ["ops", "coder", "analyst"], coordinatorId: "ops", triggerRule: "当用户提到故障、告警、监控、部署时自动召集", mode: "supervisor", enabled: false, createdAt: daysAgo(60), updatedAt: daysAgo(10) },
    { id: "team-6", name: "数据分析洞察组", description: "多维度数据分析、报告撰写与商业洞察", memberIds: ["analyst", "writer", "pm"], coordinatorId: "analyst", triggerRule: "当用户提到报表、分析、洞察、KPI时自动召集", mode: "brainstorming", enabled: true, createdAt: daysAgo(60), updatedAt: daysAgo(10) },
    { id: "team-7", name: "创意头脑风暴群", description: "快速创意发散，收集想法并筛选最优方案", memberIds: ["muse", "writer", "pm", "designer"], coordinatorId: "", triggerRule: "当用户提到创意、头脑风暴、方案、灵感时自动召集", mode: "swarm", enabled: false, createdAt: daysAgo(60), updatedAt: daysAgo(10) },
    { id: "team-8", name: "代码质量监控站", description: "代码审查、性能分析与重构建议", memberIds: ["coder", "ops", "aria"], coordinatorId: "coder", triggerRule: "当用户提到性能、重构、Bug、质量时自动召集", mode: "pipeline", enabled: true, createdAt: daysAgo(60), updatedAt: daysAgo(10) },
  ];

  for (const team of teams) {
    queries.upsertTeam(db, team);
  }
}
