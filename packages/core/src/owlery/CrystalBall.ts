import type { AgentRuntime } from "../agent/AgentRuntime.js";
import type { AgentId, AgentRole, AgentTitle, AgentWorkStatus } from "../agent/types.js";

export interface AgentWorkSnapshot {
  agentId: AgentId;
  name: string;
  title: AgentTitle;
  role: AgentRole;
  status: AgentWorkStatus;
  currentTask?: string;
  updatedAt: number;
}

export class CrystalBall {
  private readonly snapshots = new Map<AgentId, AgentWorkSnapshot>();
  private readonly listeners = new Set<(snapshot: AgentWorkSnapshot[]) => void>();

  registerAgent(agent: AgentRuntime): void {
    this.snapshots.set(agent.id, {
      agentId: agent.id,
      name: agent.name,
      title: agent.title,
      role: agent.role,
      status: "not_started",
      updatedAt: Date.now(),
    });
    this.emit();
  }

  updateStatus(agentId: AgentId, status: AgentWorkStatus, currentTask?: string): void {
    const current = this.snapshots.get(agentId);
    if (!current) throw new Error("Agent snapshot not found");
    this.snapshots.set(agentId, { ...current, status, currentTask, updatedAt: Date.now() });
    this.emit();
  }

  getSnapshot(): AgentWorkSnapshot[] {
    return [...this.snapshots.values()];
  }

  subscribe(listener: (snapshot: AgentWorkSnapshot[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}
