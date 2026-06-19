import type Database from "better-sqlite3";
import { seedAgents } from "./agents.js";
import { seedAuditLogs } from "./auditLogs.js";
import { seedBilling } from "./billing.js";
import { seedConversations } from "./conversations.js";
import { seedDefaultUser } from "./users.js";
import { seedExtensions } from "./extensions.js";
import { seedKnowledge } from "./knowledge.js";
import { seedMarketTools } from "./marketTools.js";
import { seedNotifications } from "./notifications.js";
import { seedTasks } from "./tasks.js";
import { seedTeams } from "./teams.js";
import { seedWorkflows } from "./workflows.js";

export async function seedIfEmpty(db: Database.Database): Promise<void> {
  await seedDefaultUser(db);
  seedAgents(db);
  seedConversations(db);
  seedTasks(db);
  seedWorkflows(db);
  seedKnowledge(db);
  seedMarketTools(db);
  seedExtensions(db);
  seedTeams(db);
  seedBilling(db);
  seedNotifications(db);
  seedAuditLogs(db);
}
