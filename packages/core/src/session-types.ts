import type { AgentId, AgentRole, AgentTitle, AgentWorkStatus, TeammateMode } from "./agent/types.js";

export enum SessionVisibility {
  ACTIVE = "active",
  BACKGROUND = "background",
}

export enum SessionRunStatus {
  IDLE = "idle",
  RUNNING = "running",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  FAILED = "failed",
}

export interface SessionSummary {
  sessionId: string;
  visibility: SessionVisibility;
  runStatus: SessionRunStatus;
  bufferedChunkCount: number;
  activeAgentCount: number;
}

export interface TeammateAgentStatus {
  agentId: AgentId;
  name: string;
  title: AgentTitle;
  role: AgentRole;
  status: AgentWorkStatus;
  currentTask?: string;
}

export interface AgentWorkSnapshot {
  agentId: AgentId;
  name: string;
  title: AgentTitle;
  role: AgentRole;
  status: AgentWorkStatus;
  currentTask?: string;
  updatedAt: number;
}

export interface TeammateStatus {
  sessionId: string;
  mode: TeammateMode;
  visibility: SessionVisibility;
  runStatus: SessionRunStatus;
  teammateName?: string;
  leader?: TeammateAgentStatus;
  members: TeammateAgentStatus[];
}
