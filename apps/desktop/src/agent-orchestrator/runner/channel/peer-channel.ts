import type { AgentId, AgentMessage, MessageBox, SessionId } from "@owl-os/core";

/**
 * PeerChannel 封装父子 Agent 之间的点对点通信。
 * 基于 MessageBox/MessageChannel 实现，提供 send(type, payload) / on(type, handler) 语义。
 */
export class PeerChannel {
  private readonly unsubscribers: Array<() => void> = [];

  constructor(
    private readonly messageBox: MessageBox,
    private readonly channelId: string,
    private readonly sessionId: SessionId,
    private readonly selfId: AgentId,
    private readonly peerId: AgentId,
  ) {
    this.messageBox.createChannel({ id: channelId, sessionId, endpointA: selfId, endpointB: peerId });
  }

  /**
   * 向对端发送指定类型的消息。
   */
  async send(type: string, payload: unknown): Promise<void> {
    const message: AgentMessage<{ type: string; payload: unknown }> = {
      id: `${this.selfId}:${Date.now()}:${type}`,
      from: this.selfId,
      to: this.peerId,
      sessionId: this.sessionId,
      kind: "request",
      payload: { type, payload },
      createdAt: Date.now(),
    };
    await this.messageBox.send(this.channelId, this.selfId, message);
  }

  /**
   * 监听对端发送的指定类型消息。
   * 返回取消监听函数。
   */
  on(type: string, handler: (payload: unknown) => void): () => void {
    const unsubscribe = this.messageBox.subscribe(this.channelId, this.selfId, (message) => {
      const wrapper = message.payload as { type?: string; payload?: unknown } | undefined;
      if (wrapper?.type !== type) return;
      handler(wrapper.payload);
    });
    this.unsubscribers.push(unsubscribe);
    return () => {
      unsubscribe();
      const index = this.unsubscribers.indexOf(unsubscribe);
      if (index >= 0) this.unsubscribers.splice(index, 1);
    };
  }

  /**
   * 销毁通道，清理所有订阅。
   */
  destroy(): void {
    for (const unsubscribe of this.unsubscribers) {
      unsubscribe();
    }
    this.unsubscribers.length = 0;
  }
}
