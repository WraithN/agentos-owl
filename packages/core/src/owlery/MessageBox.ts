import type { AgentId, AgentMessage, ChannelId, SessionId } from "../agent/types.js";

export class MessageChannel {
  private readonly queues = new Map<AgentId, AgentMessage[]>();

  constructor(
    readonly id: ChannelId,
    readonly sessionId: SessionId,
    readonly endpointA: AgentId,
    readonly endpointB: AgentId,
  ) {
    this.queues.set(endpointA, []);
    this.queues.set(endpointB, []);
  }

  hasAgent(agentId: AgentId): boolean {
    return agentId === this.endpointA || agentId === this.endpointB;
  }

  async send(from: AgentId, message: AgentMessage): Promise<void> {
    if (!this.hasAgent(from)) throw new Error("Sender is not a channel endpoint");
    if (!this.hasAgent(message.to)) throw new Error("Recipient is not a channel endpoint");
    this.queues.get(message.to)?.push(message);
  }

  async *receive(agentId: AgentId): AsyncIterable<AgentMessage> {
    if (!this.hasAgent(agentId)) throw new Error("Receiver is not a channel endpoint");
    const queue = this.queues.get(agentId) ?? [];
    while (queue.length > 0) {
      const message = queue.shift();
      if (message) yield message;
    }
  }
}

export class MessageBox {
  private readonly channels = new Map<ChannelId, MessageChannel>();

  createChannel(params: { id?: ChannelId; sessionId: SessionId; endpointA: AgentId; endpointB: AgentId }): MessageChannel {
    const id = params.id ?? `${params.sessionId}:${params.endpointA}:${params.endpointB}`;
    const existing = this.channels.get(id);
    if (existing) return existing;
    const channel = new MessageChannel(id, params.sessionId, params.endpointA, params.endpointB);
    this.channels.set(id, channel);
    return channel;
  }

  getChannel(channelId: ChannelId): MessageChannel | undefined {
    return this.channels.get(channelId);
  }

  async send(channelId: ChannelId, from: AgentId, message: AgentMessage): Promise<void> {
    const channel = this.channels.get(channelId);
    if (!channel) throw new Error("Channel not found");
    await channel.send(from, message);
  }

  receive(channelId: ChannelId, agentId: AgentId): AsyncIterable<AgentMessage> {
    const channel = this.channels.get(channelId);
    if (!channel) throw new Error("Channel not found");
    return channel.receive(agentId);
  }
}
