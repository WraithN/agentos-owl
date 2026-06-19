import type { AgentDriver } from "./AgentDriver.js";
import { BaseAgentRuntime, type ElderAgentRuntime, type SentinelAgentRuntime, type WorkerAgentRuntime } from "./AgentRuntime.js";
import type { AgentId, AgentProfile, AgentRole, AgentTitle, AgentToolRegistration, RecruitInput, SentinelKind, SessionId } from "./types.js";
import type { TeammateManager } from "../owlery/TeammateManager.js";

export type AgentDriverFactory = (input: {
  agentId: AgentId;
  role: AgentRole;
  title: AgentTitle;
  sessionId: SessionId;
  tools: AgentToolRegistration[];
}) => AgentDriver;

export type AgentNameGenerator = (input: { locale: string; role: AgentRole; title: AgentTitle }) => string;
export type RecruitHandler = (elder: ElderAgentRuntime, input: RecruitInput) => Promise<TeammateManager>;
export type AgentToolFactory = (input: { agentId: AgentId; role: AgentRole; title: AgentTitle; sessionId: SessionId }) => AgentToolRegistration[];

export interface AgentFactoryOptions {
  driverFactory: AgentDriverFactory;
  nameGenerator: AgentNameGenerator;
  recruitHandler?: RecruitHandler;
  toolFactory?: AgentToolFactory;
}

export interface CreateAgentInput {
  id: AgentId;
  sessionId: SessionId;
  role: AgentRole;
  title: AgentTitle;
  locale?: string;
  sentinelKind?: SentinelKind;
  parentSentinelId?: AgentId;
  childAgentIds?: AgentId[];
}

class ElderAgent extends BaseAgentRuntime implements ElderAgentRuntime {
  readonly role = "elder" as const;

  constructor(profile: AgentProfile & { driver: AgentDriver }, private readonly recruitHandler?: RecruitHandler) {
    super(profile);
  }

  recruit(input: RecruitInput): Promise<TeammateManager> {
    if (!this.recruitHandler) throw new Error("Recruit handler is not configured");
    return this.recruitHandler(this, input);
  }
}

class SentinelAgent extends BaseAgentRuntime implements SentinelAgentRuntime {
  readonly role = "sentinel" as const;
  readonly sentinelKind: SentinelKind;
  readonly parentSentinelId?: AgentId;
  readonly childAgentIds: AgentId[];

  constructor(profile: AgentProfile & { driver: AgentDriver; sentinelKind?: SentinelKind; parentSentinelId?: AgentId; childAgentIds?: AgentId[] }) {
    super(profile);
    this.sentinelKind = profile.sentinelKind ?? "primary";
    this.parentSentinelId = profile.parentSentinelId;
    this.childAgentIds = profile.childAgentIds ?? [];
  }
}

class WorkerAgent extends BaseAgentRuntime implements WorkerAgentRuntime {
  readonly role = "worker" as const;
}

export class AgentFactory {
  constructor(private readonly options: AgentFactoryOptions) {}

  createAgent(input: CreateAgentInput): ElderAgentRuntime | SentinelAgentRuntime | WorkerAgentRuntime {
    const locale = input.locale ?? "zh-CN";
    const name = this.options.nameGenerator({ locale, role: input.role, title: input.title });
    const tools = this.options.toolFactory?.({ agentId: input.id, role: input.role, title: input.title, sessionId: input.sessionId }) ?? [];
    const driver = this.options.driverFactory({ agentId: input.id, role: input.role, title: input.title, sessionId: input.sessionId, tools });
    const profile = { id: input.id, role: input.role, name, title: input.title, locale, tools, driver };

    if (input.role === "elder") return new ElderAgent(profile, this.options.recruitHandler);
    if (input.role === "sentinel") return new SentinelAgent({ ...profile, sentinelKind: input.sentinelKind, parentSentinelId: input.parentSentinelId, childAgentIds: input.childAgentIds });
    return new WorkerAgent(profile);
  }
}

export const fixedNameGenerator: AgentNameGenerator = ({ title }) => title;
