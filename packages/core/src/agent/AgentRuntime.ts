import type { AgentDriver } from "./AgentDriver.js";
import type { AgentDriverChunk, AgentDriverInput, AgentId, AgentMessage, AgentProfile, RecruitInput } from "./types.js";
import type { TeammateManager } from "../owlery/TeammateManager.js";

export interface AgentRuntime extends AgentProfile {
  driver: AgentDriver;
  streamChat(input: Omit<AgentDriverInput, "agentId">): AsyncIterable<AgentDriverChunk>;
  send(toAgentId: AgentId, message: AgentMessage): Promise<void>;
  receive(): AsyncIterable<AgentMessage>;
}

export interface ElderAgentRuntime extends AgentRuntime {
  role: "elder";
  recruit(input: RecruitInput): Promise<TeammateManager>;
}

export interface SentinelAgentRuntime extends AgentRuntime {
  role: "sentinel";
  sentinelKind: "primary" | "sub";
  parentSentinelId?: AgentId;
  childAgentIds: AgentId[];
}

export interface WorkerAgentRuntime extends AgentRuntime {
  role: "worker";
}

export class BaseAgentRuntime implements AgentRuntime {
  readonly id: AgentProfile["id"];
  readonly role: AgentProfile["role"];
  readonly name: AgentProfile["name"];
  readonly title: AgentProfile["title"];
  readonly locale: AgentProfile["locale"];
  readonly tools: AgentProfile["tools"];

  constructor(profile: AgentProfile & { driver: AgentDriver }) {
    this.id = profile.id;
    this.role = profile.role;
    this.name = profile.name;
    this.title = profile.title;
    this.locale = profile.locale;
    this.tools = profile.tools;
    this.driver = profile.driver;
  }

  readonly driver: AgentDriver;

  streamChat(input: Omit<AgentDriverInput, "agentId">): AsyncIterable<AgentDriverChunk> {
    return this.driver.streamChat({ ...input, agentId: this.id });
  }

  send(_toAgentId: AgentId, message: AgentMessage): Promise<void> {
    return this.driver.send(message);
  }

  receive(): AsyncIterable<AgentMessage> {
    return this.driver.receive();
  }
}
