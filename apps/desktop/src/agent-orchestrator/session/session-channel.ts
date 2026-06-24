import type { AgentDriverChunk, AgentId, AgentRole, AgentTitle, AgentWorkStatus } from "@owl-os/core";

/**
 * SessionChannel 是会话内部的事件总线。
 * 所有 AgentRunner、TaskBoard、SessionSlot 都通过它进行解耦通信：
 * - AgentRunner 发布输出、任务事件
 * - TaskBoard 订阅任务事件并更新状态
 * - SessionSlot 订阅输出事件并冒泡到全局 EventBus / WebSocket
 */
export class SessionChannel {
  private readonly subscribers = new Map<string, Set<(payload: unknown) => void>>();

  constructor(readonly sessionId: string) {}

  /**
   * 发布事件到指定 topic。
   */
  publish(topic: string, payload: unknown): void {
    const handlers = this.subscribers.get(topic);
    if (!handlers) return;
    for (const handler of handlers) {
      handler(payload);
    }
  }

  /**
   * 订阅指定 topic 的事件，返回取消订阅函数。
   */
  subscribe(topic: string, handler: (payload: unknown) => void): () => void {
    const handlers = this.subscribers.get(topic) ?? new Set<(payload: unknown) => void>();
    handlers.add(handler);
    this.subscribers.set(topic, handlers);
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.subscribers.delete(topic);
      }
    };
  }

  /**
   * Agent 输出内容时的快捷方法。
   */
  emitOutput(
    agentInfo: { agentId: AgentId; agentName: string; role: AgentRole; title: AgentTitle },
    content: AgentDriverChunk,
  ): void {
    this.publish("output", { agentInfo, content });
  }

  /**
   * 任务状态变更时的快捷方法。
   */
  emitTaskEvent(event: { type: string; taskId: string; payload?: unknown }): void {
    this.publish("task_event", event);
  }

  /**
   * Agent 状态变更时的快捷方法。
   */
  emitAgentStatusEvent(
    agentInfo: { agentId: AgentId; agentName: string; role: AgentRole; title: AgentTitle },
    status: AgentWorkStatus,
    currentTask?: string,
  ): void {
    this.publish("agent_status", { agentInfo, status, currentTask });
  }
}
