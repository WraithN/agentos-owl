import type Database from "better-sqlite3";
import type { AuditLog, SessionLog } from "../db/types.js";
import * as queries from "../db/queries/index.js";
import { getDatabase } from "../db/connection.js";
import { conversationDetailPath } from "./conversation-detail-store.js";

/**
 * 审计日志记录器 - 统一记录所有用户操作和会话事件
 * 负责生成唯一 ID、自动填充时间戳、提供便捷的记录方法
 */
export class AuditLogger {
  private db: Database.Database;
  private userName: string;
  private ip: string;

  constructor(db?: Database.Database) {
    this.db = db ?? getDatabase();
    this.userName = "当前用户";
    this.ip = "127.0.0.1";
  }

  // ===== 操作日志 =====

  log(action: string, detail: string, result: "success" | "failed" = "success"): void {
    const log: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      userName: this.userName,
      action,
      detail,
      ip: this.ip,
      result,
    };
    queries.insertAuditLog(this.db, log);
  }

  success(action: string, detail: string): void {
    this.log(action, detail, "success");
  }

  failed(action: string, detail: string, error?: Error): void {
    const errorDetail = error ? `${detail} - ${error.message}` : detail;
    this.log(action, errorDetail, "failed");
  }

  // LLM 配置相关
  logLlmConfig(action: "create" | "update" | "delete", modelName: string): void {
    this.success("LLM 配置", `${action === "create" ? "创建" : action === "update" ? "更新" : "删除"} 模型「${modelName}」`);
  }

  logDefaultLlmChanged(modelName: string): void {
    this.success("修改 LLM 配置", `设置默认对话模型为「${modelName}」`);
  }

  // Agent 相关
  logAgentAction(action: "create" | "update" | "delete", agentName: string): void {
    this.success("Agent 配置", `${action === "create" ? "创建" : action === "update" ? "更新" : "删除"} Agent「${agentName}」`);
  }

  // 团队相关
  logTeamAction(action: "create" | "update" | "delete", teamName: string): void {
    this.success("团队配置", `${action === "create" ? "创建" : action === "update" ? "更新" : "删除"} 团队「${teamName}」`);
  }

  // 扩展模块相关（技能、提示词、工具）
  logExtensionAction(scope: "skill" | "prompt" | "tool", action: "create" | "update" | "delete", name: string): void {
    const scopeName = scope === "skill" ? "技能" : scope === "prompt" ? "提示词" : "工具";
    this.success(`${scopeName}配置`, `${action === "create" ? "创建" : action === "update" ? "更新" : "删除"} ${scopeName}「${name}」`);
  }

  // 知识库相关
  logKnowledgeAction(action: "upload" | "delete" | "reindex", docName: string): void {
    this.success("知识库", `${action === "upload" ? "上传" : action === "delete" ? "删除" : "重新索引"} 文档「${docName}」`);
  }

  // ===== 会话日志 =====

  logSession(log: Omit<SessionLog, "id" | "timestamp">): void {
    const sessionLog: SessionLog = {
      id: `slog-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      ...log,
      detailPath: log.detailPath ?? (log.conversationId ? conversationDetailPath(log.conversationId) : undefined),
    };
    queries.insertSessionLog(this.db, sessionLog);
  }

  // 会话创建
  logConversationCreated(conversationId: string, title: string, mode: string): void {
    this.logSession({
      conversationId,
      conversationTitle: title || "新会话",
      mode,
      agentName: "System",
      model: "",
      event: "conversation.create",
      summary: `创建会话「${title || "新会话"}」`,
      tokens: 0,
      durationMs: 0,
      status: "success",
    });
  }

  // 用户发送消息
  logMessageSent(conversationId: string, title: string, mode: string, messageLength: number): void {
    this.logSession({
      conversationId,
      conversationTitle: title,
      mode,
      agentName: "User",
      model: "",
      event: "message.send",
      summary: `用户发送 ${messageLength} 字符消息`,
      tokens: 0,
      durationMs: 0,
      status: "success",
    });
  }

  // Agent 调用开始
  logAgentInvokeStart(conversationId: string, title: string, mode: string, agentName: string, model: string): void {
    this.logSession({
      conversationId,
      conversationTitle: title,
      mode,
      agentName,
      model,
      event: "agent.invoke",
      summary: `Agent「${agentName}」开始调用`,
      tokens: 0,
      durationMs: 0,
      status: "running",
    });
  }

  // Agent 调用完成
  logAgentInvokeComplete(
    conversationId: string,
    title: string,
    mode: string,
    agentName: string,
    model: string,
    tokens: number,
    durationMs: number,
    summary?: string
  ): void {
    this.logSession({
      conversationId,
      conversationTitle: title,
      mode,
      agentName,
      model,
      event: "agent.invoke",
      summary: summary ?? `Agent「${agentName}」调用完成`,
      tokens,
      durationMs,
      status: "success",
    });
  }

  // Agent 调用失败
  logAgentInvokeFailed(
    conversationId: string,
    title: string,
    mode: string,
    agentName: string,
    model: string,
    error: string
  ): void {
    this.logSession({
      conversationId,
      conversationTitle: title,
      mode,
      agentName,
      model,
      event: "agent.error",
      summary: error,
      tokens: 0,
      durationMs: 0,
      status: "failed",
    });
  }

  // 工具调用
  logToolCall(
    conversationId: string,
    title: string,
    mode: string,
    agentName: string,
    toolName: string,
    durationMs: number,
    success: boolean
  ): void {
    this.logSession({
      conversationId,
      conversationTitle: title,
      mode,
      agentName,
      model: "",
      event: "tool.call",
      summary: `调用工具「${toolName}」${success ? "成功" : "失败"}`,
      tokens: 0,
      durationMs,
      status: success ? "success" : "failed",
    });
  }

  // ===== 清理 =====

  clearAuditLogs(): void {
    queries.clearAuditLogs(this.db);
    this.success("日志管理", "清空操作日志");
  }

  clearSessionLogs(): void {
    queries.clearSessionLogs(this.db);
    this.success("日志管理", "清空会话日志");
  }
}

// 全局单例
let auditLoggerInstance: AuditLogger | null = null;

export function getAuditLogger(): AuditLogger {
  if (!auditLoggerInstance) {
    auditLoggerInstance = new AuditLogger();
  }
  return auditLoggerInstance;
}
