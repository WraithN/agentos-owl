import { AgentWorkStatus } from "@owl-os/core";
import type { AgentMessage, AgentRuntime, AgentTask } from "@owl-os/core";
import { BaseAgentRunner } from "./base-agent-runner.js";
import type { SessionChannel } from "../session/session-channel.js";
import type { PeerChannel } from "./channel/peer-channel.js";

export interface WorkerTaskPayload {
  task: AgentTask;
}

export interface WorkerResultPayload {
  taskId: string;
  result: string;
}

/**
 * WorkerAgentRunner：底层执行单元，仅执行具体任务并回传结果。
 * 通过父 Sentinel 的 PeerChannel 接收任务，执行完成后通过同一通道返回结果。
 */
export class WorkerAgentRunner extends BaseAgentRunner {
  private readonly pendingExecutions = new Map<string, { resolve: (value: string) => void; reject: (reason: unknown) => void }>();

  constructor(
    agent: AgentRuntime,
    sessionChannel: SessionChannel,
    private readonly parentChannel: PeerChannel,
  ) {
    super(agent, sessionChannel);
    this.parentChannel.on("task", (payload) => {
      const task = (payload as WorkerTaskPayload).task;
      if (!task) return;
      this.enqueueTask(task);
    });
  }

  /**
   * 外部直接派发任务并等待结果。
   */
  execute(task: AgentTask): Promise<string> {
    return new Promise((resolve, reject) => {
      this.pendingExecutions.set(task.id, { resolve, reject });
      this.enqueueTask(task);
    });
  }

  protected createMessage(task: AgentTask): AgentMessage {
    return {
      id: `${task.id}:worker`,
      from: "system",
      to: this.id,
      sessionId: task.sessionId,
      kind: "request",
      payload: { task },
      createdAt: Date.now(),
    };
  }

  protected async handleMessage(message: AgentMessage): Promise<void> {
    const task = (message.payload as WorkerTaskPayload).task;
    if (!task) return;

    this.emitStatus(AgentWorkStatus.IN_PROGRESS, task.instruction);
    try {
      const result = await this.streamChat({
        sessionId: task.sessionId,
        messages: [message],
        context: task.context,
      });
      this.emitStatus(AgentWorkStatus.COMPLETED);
      void this.parentChannel.send("result", { taskId: task.id, result } as WorkerResultPayload);
      this.resolveExecution(task.id, result);
    } catch (error) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.emitStatus(AgentWorkStatus.FAILED, errorText);
      void this.parentChannel.send("result", { taskId: task.id, result: `执行失败：${errorText}` } as WorkerResultPayload);
      this.rejectExecution(task.id, error);
    }
  }

  private resolveExecution(taskId: string, result: string): void {
    const pending = this.pendingExecutions.get(taskId);
    if (!pending) return;
    pending.resolve(result);
    this.pendingExecutions.delete(taskId);
  }

  private rejectExecution(taskId: string, reason: unknown): void {
    const pending = this.pendingExecutions.get(taskId);
    if (!pending) return;
    pending.reject(reason);
    this.pendingExecutions.delete(taskId);
  }
}
