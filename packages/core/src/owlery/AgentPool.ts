import type { AgentRuntime, SentinelAgentRuntime, WorkerAgentRuntime } from "../agent/AgentRuntime.js";
import type { AgentId } from "../agent/types.js";

export class AgentPool {
  private readonly agents = new Map<AgentId, AgentRuntime>();

  constructor(readonly primarySentinelId: AgentId) {}

  addAgent(agent: AgentRuntime): void {
    this.agents.set(agent.id, agent);
  }

  removeAgent(agentId: AgentId): void {
    this.agents.delete(agentId);
  }

  getAgent(agentId: AgentId): AgentRuntime | undefined {
    return this.agents.get(agentId);
  }

  getPrimarySentinel(): SentinelAgentRuntime {
    const sentinel = this.agents.get(this.primarySentinelId);
    if (!sentinel || sentinel.role !== "sentinel") throw new Error("Primary sentinel not found");
    return sentinel as SentinelAgentRuntime;
  }

  listAgents(): AgentRuntime[] {
    return [...this.agents.values()];
  }

  listSentinels(): SentinelAgentRuntime[] {
    return this.listAgents().filter((agent): agent is SentinelAgentRuntime => agent.role === "sentinel");
  }

  listSubSentinels(): SentinelAgentRuntime[] {
    return this.listSentinels().filter((agent) => agent.sentinelKind === "sub");
  }

  listWorkers(): WorkerAgentRuntime[] {
    return this.listAgents().filter((agent): agent is WorkerAgentRuntime => agent.role === "worker");
  }
}
