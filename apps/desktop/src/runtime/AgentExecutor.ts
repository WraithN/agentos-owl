import type { AgentDriverChunk, AgentId, AgentMessage, AgentRuntime, ChannelId, CrystalBall, MessageBox } from "@owl-os/core";

const MESSAGE_WAIT_TIMEOUT_MS = 50;

type ChannelAwareAgent = AgentRuntime & { channelIds?: Set<ChannelId> };

export interface AgentExecutorOptions {
  sessionId: string;
  messageBox: MessageBox;
  crystalBall: CrystalBall;
  onChunk: (chunk: AgentDriverChunk) => void;
  onStatus: () => void;
}

export class AgentExecutor {
  private readonly agents = new Map<AgentId, ChannelAwareAgent>();
  private readonly pendingMessages = new Map<AgentId, AgentMessage[]>();
  private readonly messageWaiters = new Map<AgentId, () => void>();
  private isRunning = false;

  constructor(private readonly options: AgentExecutorOptions) {}

  get isExecuting(): boolean {
    return this.isRunning;
  }

  register(agent: ChannelAwareAgent): void {
    this.agents.set(agent.id, agent);
    this.pendingMessages.set(agent.id, []);
    this.options.crystalBall.registerAgent(agent);
  }

  dispatchToAgent(agentId: AgentId, message: AgentMessage): void {
    if (!this.agents.has(agentId)) throw new Error(`Agent ${agentId} not registered`);
    const pending = this.pendingMessages.get(agentId) ?? [];
    pending.push(message);
    this.pendingMessages.set(agentId, pending);
    this.notifyAgent(agentId);
  }

  async execute(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    const loops = [...this.agents.values()].map((agent) => this.runAgentLoop(agent));
    await Promise.all(loops);
  }

  stopAllAgents(): void {
    this.isRunning = false;
    for (const agent of this.agents.values()) {
      void agent.driver.abort?.();
      this.notifyAgent(agent.id);
    }
  }

  private async runAgentLoop(agent: ChannelAwareAgent): Promise<void> {
    const unsubscribers = [...(agent.channelIds ?? [])].map((channelId) =>
      this.options.messageBox.subscribe(channelId, agent.id, (message) => this.dispatchToAgent(agent.id, message)),
    );

    try {
      while (this.isRunning) {
        const messages = this.pendingMessages.get(agent.id) ?? [];
        this.pendingMessages.set(agent.id, []);
        for (const message of messages) {
          await this.processAgentMessage(agent, message);
        }
        await this.waitForMessage(agent.id);
      }
    } finally {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    }
  }

  private async processAgentMessage(agent: AgentRuntime, message: AgentMessage): Promise<void> {
    this.options.crystalBall.updateStatus(agent.id, "in_progress", this.describeMessage(message));
    this.options.onStatus();

    try {
      for await (const chunk of agent.streamChat({
        sessionId: this.options.sessionId,
        messages: [message],
        context: undefined,
      })) {
        this.handleChunk(agent, chunk);
      }
      this.options.crystalBall.updateStatus(agent.id, "completed");
    } catch (error) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.options.crystalBall.updateStatus(agent.id, "failed", errorText);
      this.handleChunk(agent, { type: "error", error: errorText });
    }

    this.options.onStatus();
  }

  private handleChunk(agent: AgentRuntime, chunk: AgentDriverChunk): void {
    if (agent.role !== "elder") return;
    this.options.onChunk(chunk);
  }

  private waitForMessage(agentId: AgentId): Promise<void> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.messageWaiters.delete(agentId);
        resolve();
      }, MESSAGE_WAIT_TIMEOUT_MS);
      this.messageWaiters.set(agentId, () => {
        clearTimeout(timeout);
        this.messageWaiters.delete(agentId);
        resolve();
      });
    });
  }

  private notifyAgent(agentId: AgentId): void {
    this.messageWaiters.get(agentId)?.();
  }

  private describeMessage(message: AgentMessage): string | undefined {
    if (!message.payload || typeof message.payload !== "object") return undefined;
    const text = (message.payload as Record<string, unknown>).text;
    return typeof text === "string" ? text : undefined;
  }
}
