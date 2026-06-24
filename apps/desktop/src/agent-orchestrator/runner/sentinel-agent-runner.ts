import { AgentWorkStatus } from "@owl-os/core";
import type { AgentMessage, AgentRuntime, AgentTask } from "@owl-os/core";
import { BaseAgentRunner } from "./base-agent-runner.js";
import type { SessionChannel } from "../session/session-channel.js";
import type { PeerChannel } from "./channel/peer-channel.js";
import type { IStrategyExecutor } from "../strategy/strategy.js";
import { defaultStrategyRegistry } from "../strategy/strategy.js";
import type { WorkerAgentRunner } from "./worker-agent-runner.js";
import type { StrategyConfig } from "../strategy/strategy.js";
import type { Task } from "../task-board/task.js";
import { TaskStatus } from "../task-board/task-status.js";
import type { TaskBoard } from "../task-board/task-board.js";
import type { SessionRuntimeEvent } from "../session/port-types.js";

export interface SentinelTaskPayload {
  task: AgentTask;
}

export interface SentinelResultPayload {
  taskId: string;
  result: unknown;
}

export interface SentinelAgentRunnerDeps {
  createWorker: (title: string) => { runner: WorkerAgentRunner; channel: PeerChannel };
  postEvent: (event: SessionRuntimeEvent) => void;
  taskBoard: TaskBoard;
}

/**
 * SentinelAgentRunner：中层调度者。
 * - 通过父 PeerChannel 接收 Elder 派发的任务
 * - 根据任务上下文中的 mode 选择协作策略
 * - 作为 IStrategyExecutor 提供招募 Worker、派发任务、校验产出、提交 Elder 的能力
 * - 策略执行完毕后通过父 PeerChannel 返回结果
 */
export class SentinelAgentRunner extends BaseAgentRunner implements IStrategyExecutor {
  private readonly workers = new Map<string, WorkerAgentRunner>();
  private readonly workerChannels = new Map<string, PeerChannel>();
  private readonly pendingResults = new Map<string, { resolve: (value: string) => void; reject: (reason: unknown) => void }>();
  private readonly parentResults = new Map<string, { resolve: (value: unknown) => void; reject: (reason: unknown) => void }>();
  private currentTaskId?: string;
  private currentFinalOutput?: string;

  constructor(
    agent: AgentRuntime,
    sessionChannel: SessionChannel,
    private readonly parentChannel: PeerChannel,
    private readonly deps: SentinelAgentRunnerDeps,
  ) {
    super(agent, sessionChannel);
    if (!deps.taskBoard) throw new Error("SentinelAgentRunner 需要 TaskBoard 依赖");
    this.parentChannel.on("task", (payload) => {
      const task = (payload as SentinelTaskPayload).task;
      if (!task) return;
      this.enqueueTask(task);
    });
  }

  get sessionId(): string {
    return this.agent.id.split(":")[0] ?? this.agent.id;
  }

  /**
   * 外部直接触发策略执行并等待结果。
   */
  runStrategy(task: AgentTask): Promise<unknown> {
    return new Promise((resolve, reject) => {
      this.parentResults.set(task.id, { resolve, reject });
      this.enqueueTask(task);
    });
  }

  protected createMessage(task: AgentTask): AgentMessage {
    return {
      id: `${task.id}:sentinel`,
      from: "system",
      to: this.id,
      sessionId: task.sessionId,
      kind: "request",
      payload: { task },
      createdAt: Date.now(),
    };
  }

  protected async handleMessage(message: AgentMessage): Promise<void> {
    const task = (message.payload as SentinelTaskPayload).task;
    if (!task) return;

    this.currentTaskId = task.id;
    this.currentFinalOutput = undefined;
    this.emitStatus(AgentWorkStatus.IN_PROGRESS, task.instruction);

    let rootTask: Task | undefined;
    try {
      const mode = this.resolveMode(task.context);
      const strategy = defaultStrategyRegistry.get(mode);
      if (!strategy) {
        throw new Error(`未找到协作策略：${mode}`);
      }

      rootTask = this.createRootTask(task);
      this.deps.taskBoard.createTask(rootTask);
      this.sessionChannel.emitTaskEvent({
        type: "task_created",
        taskId: rootTask.taskId,
        payload: { title: rootTask.title, description: rootTask.description, status: rootTask.status },
      });

      strategy.init(this.sessionChannel, this.buildStrategyConfig(task), this);
      await strategy.dispatchTask(rootTask);
      const result = await strategy.collectResult(rootTask.taskId);
      this.deps.taskBoard.completeTask(rootTask.taskId, result);
      this.sessionChannel.emitTaskEvent({
        type: "task_completed",
        taskId: rootTask.taskId,
        payload: { result },
      });
      strategy.destroy();

      this.emitStatus(AgentWorkStatus.COMPLETED);
      void this.parentChannel.send("result", { taskId: task.id, result } as SentinelResultPayload);
      this.resolveParentResult(task.id, result);
    } catch (error) {
      if (rootTask) {
        this.deps.taskBoard.failTask(rootTask.taskId, error);
        this.sessionChannel.emitTaskEvent({
          type: "task_failed",
          taskId: rootTask.taskId,
          payload: { error: error instanceof Error ? error.message : String(error) },
        });
      }
      const errorText = error instanceof Error ? error.message : String(error);
      this.emitStatus(AgentWorkStatus.FAILED, errorText);
      void this.parentChannel.send("result", { taskId: task.id, result: `执行失败：${errorText}` } as SentinelResultPayload);
      this.rejectParentResult(task.id, error);
    }
  }

  // ===== IStrategyExecutor 实现 =====

  async recruitWorkers(titles: string[]): Promise<WorkerAgentRunner[]> {
    const result: WorkerAgentRunner[] = [];
    for (const title of titles) {
      const normalized = this.normalizeTitle(title);
      let worker = this.workers.get(normalized);
      let channel = this.workerChannels.get(normalized);
      if (!worker || !channel) {
        const created = this.deps.createWorker(normalized);
        worker = created.runner;
        channel = created.channel;
        this.workers.set(normalized, worker);
        this.workerChannels.set(normalized, channel);
      }
      result.push(worker);
    }
    return result;
  }

  async dispatchTask(stage: number, workerTitle: string, instruction: string, expectedOutput?: string): Promise<string> {
    const normalized = this.normalizeTitle(workerTitle);
    await this.recruitWorkers([normalized]);
    const worker = this.workers.get(normalized);
    const channel = this.workerChannels.get(normalized);
    if (!worker || !channel) {
      throw new Error(`无法招募 Worker：${workerTitle}`);
    }

    const taskId = `${this.id}:task:${stage}:${normalized}:${Date.now()}`;
    this.emitStatus(AgentWorkStatus.IN_PROGRESS, `阶段 ${stage} → ${normalized}`);

    const workerTask: Task = {
      taskId,
      parentTaskId: this.currentTaskId,
      creatorAgentId: this.id,
      assigneeAgentId: worker.id,
      title: `阶段 ${stage}: ${normalized}`,
      description: instruction,
      status: TaskStatus.RUNNING,
      progress: 0,
      createdAt: Date.now(),
    };
    this.deps.taskBoard.createTask(workerTask);
    this.sessionChannel.emitTaskEvent({
      type: "task_assigned",
      taskId,
      payload: { stage, workerTitle: normalized, instruction, status: workerTask.status },
    });

    return new Promise((resolve, reject) => {
      this.pendingResults.set(taskId, { resolve, reject });

      // 监听 Worker 结果
      const unsubscribe = channel.on("result", (payload) => {
        const { taskId: resultTaskId, result } = payload as { taskId: string; result: string };
        if (resultTaskId !== taskId) return;
        unsubscribe();
        const pending = this.pendingResults.get(taskId);
        if (pending) {
          this.deps.taskBoard.completeTask(taskId, result);
          this.sessionChannel.emitTaskEvent({
            type: "task_completed",
            taskId,
            payload: { result, status: TaskStatus.COMPLETED },
          });
          pending.resolve(result);
          this.pendingResults.delete(taskId);
        }
      });

      worker.execute({
        id: taskId,
        sessionId: this.sessionId,
        instruction,
        context: { expectedOutput },
        createdAt: Date.now(),
      });
    });
  }

  async validateOutput(stage: string, output: string, criteria: string[]): Promise<{ passed: boolean; feedback: string }> {
    const validationPrompt = [
      `请校验以下 ${stage} 产出是否满足验收标准：`,
      "",
      "产出内容：",
      output,
      "",
      "验收标准：",
      ...criteria.map((criterion, index) => `${index + 1}. ${criterion}`),
      "",
      "请直接回复：如果满足，输出「满足」并简要说明理由；如果不满足，输出「不满足」并给出具体修改意见。",
    ].join("\n");

    const validationText = await this.streamChat({
      sessionId: this.sessionId,
      messages: [
        {
          id: `${this.id}:validate:${Date.now()}`,
          from: "user",
          to: this.id,
          sessionId: this.sessionId,
          kind: "request",
          payload: { text: validationPrompt },
          createdAt: Date.now(),
        },
      ],
      context: undefined,
    });

    const passed = validationText.includes("满足") && !validationText.includes("不满足");
    return { passed, feedback: validationText };
  }

  submitToElder(finalOutput: string): void {
    this.currentFinalOutput = finalOutput;
  }

  // ===== 内部工具 =====

  private resolveMode(context: unknown): string {
    const mode = (context as Record<string, unknown> | undefined)?.teammateMode;
    return typeof mode === "string" ? mode : "pipeline";
  }

  private buildStrategyConfig(task: AgentTask): StrategyConfig {
    return {
      maxWorkers: 5,
      allowRetry: true,
      instruction: task.instruction,
      context: task.context,
    };
  }

  private createRootTask(task: AgentTask): Task {
    return {
      taskId: task.id,
      creatorAgentId: this.id,
      title: "根任务",
      description: task.instruction,
      status: TaskStatus.RUNNING,
      progress: 0,
      createdAt: Date.now(),
    };
  }

  private normalizeTitle(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  private getParentResult(taskId: string): { resolve: (value: unknown) => void; reject: (reason: unknown) => void } | undefined {
    return this.parentResults.get(taskId);
  }

  private resolveParentResult(taskId: string, value: unknown): void {
    const pending = this.getParentResult(taskId);
    if (!pending) return;
    pending.resolve(value);
    this.parentResults.delete(taskId);
  }

  private rejectParentResult(taskId: string, reason: unknown): void {
    const pending = this.getParentResult(taskId);
    if (!pending) return;
    pending.reject(reason);
    this.parentResults.delete(taskId);
  }
}
