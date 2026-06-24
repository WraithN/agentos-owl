import { AgentWorkStatus } from "@owl-os/core";
import type { AgentDriverChunk, AgentDriverInput, AgentMessage, AgentRuntime, AgentTask } from "@owl-os/core";
import type { SessionChannel } from "../session/session-channel.js";

export interface AgentTurnResult {
  text: string;
  reasoning: string;
  toolEvents: unknown[];
}

/**
 * 所有 Agent Runner 的抽象基类。
 * 封装 pi-agent 内核（AgentRuntime）、消息队列、沉睡唤醒调度循环、输出冒泡。
 * 具体角色通过继承实现 createMessage 与 handleMessage。
 */
export interface RunnerStatus {
  status: AgentWorkStatus;
  currentTask?: string;
}

export abstract class BaseAgentRunner {
  protected readonly messageQueue: AgentMessage[] = [];
  protected wakeResolve?: () => void;
  protected isRunning = false;
  private currentStatus: RunnerStatus = { status: AgentWorkStatus.WAITING };

  constructor(
    protected readonly agent: AgentRuntime,
    protected readonly sessionChannel: SessionChannel,
  ) {}

  get id(): string {
    return this.agent.id;
  }

  get role(): string {
    return this.agent.role;
  }

  get title(): string {
    return this.agent.title;
  }

  /**
   * 获取 Runner 当前状态快照。
   */
  get status(): RunnerStatus {
    return this.currentStatus;
  }

  /**
   * 将任务加入队列并唤醒 Runner。
   */
  enqueueTask(task: AgentTask): void {
    this.messageQueue.push(this.createMessage(task));
    this.wake();
  }

  /**
   * 启动调度循环。
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    void this.schedulerLoop();
  }

  /**
   * 停止调度循环并中断当前 LLM 调用。
   */
  destroy(): void {
    this.isRunning = false;
    this.wake();
    this.agent.driver.abort?.()?.catch(() => {});
  }

  /**
   * 由子类实现：将 AgentTask 转换为 AgentMessage。
   */
  protected abstract createMessage(task: AgentTask): AgentMessage;

  /**
   * 由子类实现：处理单条消息。
   */
  protected abstract handleMessage(message: AgentMessage): Promise<void>;

  private async schedulerLoop(): Promise<void> {
    while (this.isRunning) {
      const messages = this.messageQueue.splice(0);
      for (const message of messages) {
        await this.handleMessage(message);
      }
      if (!this.isRunning) break;
      await this.sleep();
    }
  }

  private sleep(): Promise<void> {
    return new Promise((resolve) => {
      this.wakeResolve = resolve;
    });
  }

  private wake(): void {
    this.wakeResolve?.();
    this.wakeResolve = undefined;
  }

  /**
   * 调用 Agent 的 streamChat，自动将非文本 chunk 冒泡到 SessionChannel，并返回文本内容。
   */
  protected async streamChat(input: Omit<AgentDriverInput, "agentId">): Promise<string> {
    const textParts: string[] = [];
    for await (const chunk of this.agent.streamChat(input)) {
      if (chunk.type === "text_delta") {
        textParts.push(chunk.text);
      }
      this.output(chunk);
    }
    return textParts.join("");
  }

  /**
   * 运行一轮 Agent 对话，收集指定工具的调用事件。
   */
  protected async runAgentTurn(
    input: Omit<AgentDriverInput, "agentId">,
    collectTools?: string[],
  ): Promise<AgentTurnResult> {
    const textParts: string[] = [];
    const reasoningParts: string[] = [];
    const toolEvents: unknown[] = [];

    for await (const chunk of this.agent.streamChat(input)) {
      if (chunk.type === "text_delta") {
        textParts.push(chunk.text);
      } else if (chunk.type === "reasoning_delta") {
        reasoningParts.push(chunk.text);
      } else if (chunk.type === "tool_event") {
        const event = chunk.event as Record<string, unknown>;
        const toolName = String(event?.toolName ?? event?.name ?? "");
        if (collectTools?.includes(toolName)) {
          toolEvents.push(event);
        }
      }
      this.output(chunk);
    }

    return {
      text: textParts.join(""),
      reasoning: reasoningParts.join(""),
      toolEvents,
    };
  }

  /**
   * 将 Agent 输出通过 SessionChannel 冒泡。
   */
  protected output(content: AgentDriverChunk): void {
    this.sessionChannel.emitOutput(
      {
        agentId: this.agent.id,
        agentName: this.agent.name,
        role: this.agent.role,
        title: this.agent.title,
      },
      content,
    );
  }

  /**
   * 报告 Agent 当前状态。
   */
  protected emitStatus(status: AgentWorkStatus, currentTask?: string): void {
    this.currentStatus = { status, currentTask };
    this.sessionChannel.emitAgentStatusEvent(
      {
        agentId: this.agent.id,
        agentName: this.agent.name,
        role: this.agent.role,
        title: this.agent.title,
      },
      status,
      currentTask,
    );
  }
}
