export type AgentId = string;
export type SessionId = string;
export type ChannelId = string;
export type TeammateId = string;
export type TemplateTeammateId = string;

export type AgentRole = "elder" | "sentinel" | "worker";
export type SentinelKind = "primary" | "sub";
export type AgentTitle = string;
export type TeammateMode = "pipeline" | "brainstorm" | "supervisor" | "hierarchy";
export type AgentMessageKind = "request" | "response" | "event" | "control";
export type AgentWorkStatus = "not_started" | "in_progress" | "completed" | "failed" | "cancelled";

export interface AgentProfile {
  id: AgentId;
  role: AgentRole;
  name: string;
  title: AgentTitle;
  locale: string;
  tools?: AgentToolRegistration[];
}

export interface AgentMessage<TPayload = unknown> {
  id: string;
  from: AgentId;
  to: AgentId;
  sessionId: SessionId;
  kind: AgentMessageKind;
  payload: TPayload;
  createdAt: number;
}

export interface AgentTask {
  id: string;
  sessionId: SessionId;
  instruction: string;
  context?: unknown;
  expectedOutput?: string;
  constraints?: string[];
  createdAt: number;
}

export interface AgentTaskResult<TContent = unknown> {
  taskId: string;
  agentId: AgentId;
  status: "success" | "failed" | "cancelled";
  content: TContent;
  error?: string;
  createdAt: number;
}

export interface ConversationContext {
  messages: string[];
}

export interface RecruitAgentSpec {
  id?: AgentId;
  role: Exclude<AgentRole, "elder">;
  title: AgentTitle;
  sentinelKind?: SentinelKind;
  parentSentinelId?: AgentId;
  childAgentIds?: AgentId[];
  capabilities?: string[];
  instruction?: string;
}

export interface Teammate {
  id: TeammateId;
  templateTeammateId?: TemplateTeammateId;
  name: string;
}

export interface RecruitTeamSpec {
  id?: TeammateId;
  templateTeammateId?: TemplateTeammateId;
  name?: string;
  mode: TeammateMode;
  agents: RecruitAgentSpec[];
}

export interface RecruitInput {
  sessionId: SessionId;
  userPrompt: string;
  conversationContext: ConversationContext;
  templateTeammateId?: TemplateTeammateId;
  userPreferredMode?: TeammateMode;
  userPreferredTeam?: RecruitTeamSpec;
  constraints?: string[];
  expectedOutput?: string;
}

export interface RecruitPlan {
  teammate: Teammate;
  mode: TeammateMode;
  primarySentinel: RecruitAgentSpec;
  agents: RecruitAgentSpec[];
  source: "user" | "llm" | "default";
  reason?: string;
}

export interface RecruitToolInput {
  sessionId: SessionId;
  teammateId: TeammateId;
  parentAgentId: AgentId;
  userPrompt: string;
  mode: TeammateMode;
  conversationContext: ConversationContext;
  existingAgentIds: AgentId[];
}

export interface AgentToolRegistration {
  name: "recruit" | string;
  description: string;
  execute?: (input: RecruitToolInput) => Promise<RecruitAgentSpec[]>;
}

export interface ModeEvaluationResult {
  mode: TeammateMode;
  confidence: number;
  reason: string;
}

export interface AgentDriverInput {
  sessionId: SessionId;
  agentId: AgentId;
  messages: AgentMessage[];
  systemPrompt?: string;
  context?: unknown;
}

export type AgentDriverChunk =
  | { type: "text_delta"; text: string }
  | { type: "reasoning_delta"; text: string }
  | { type: "tool_event"; event: unknown }
  | { type: "status_card"; text: string; agentId?: AgentId; agentName?: string; agentTitle?: AgentTitle; role?: AgentRole }
  | { type: "agent_chunk"; agentId: AgentId; agentName: string; agentTitle: AgentTitle; role: AgentRole; chunk: AgentDriverChunk }
  | { type: "done" }
  | { type: "error"; error: string };
