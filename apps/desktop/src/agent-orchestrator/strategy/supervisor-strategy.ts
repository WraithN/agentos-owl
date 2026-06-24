import type { Task } from "../task-board/task.js";
import type { SessionChannel } from "../session/session-channel.js";
import type { ICollaborationStrategy, StrategyConfig, IStrategyExecutor } from "./strategy.js";

const DEFAULT_SUPERVISOR_ROLES = ["developer", "tester"];

/**
 * 监督者策略：任务池动态分配、负载均衡、批量验收。
 * Phase 3 实现：将根任务按 Worker 角色拆分为子任务，并行执行后汇总。
 */
export class SupervisorStrategy implements ICollaborationStrategy {
  readonly mode = "supervisor";
  private sessionChannel?: SessionChannel;
  private config?: StrategyConfig;
  private executor?: IStrategyExecutor;
  private result?: unknown;

  init(sessionChannel: SessionChannel, config: StrategyConfig, executor: IStrategyExecutor): void {
    this.sessionChannel = sessionChannel;
    this.config = config;
    this.executor = executor;
  }

  async dispatchTask(rootTask: Task): Promise<void> {
    if (!this.executor) {
      throw new Error("SupervisorStrategy 未初始化 executor");
    }

    this.sessionChannel?.emitTaskEvent({ type: "strategy_dispatch", taskId: rootTask.taskId });

    const roles = this.config?.roles && Array.isArray(this.config.roles)
      ? (this.config.roles as string[])
      : DEFAULT_SUPERVISOR_ROLES;
    const instruction = this.config?.instruction ?? rootTask.description;

    await this.executor.recruitWorkers(roles);

    const outputs = await Promise.all(
      roles.map((title, index) =>
        this.executor!.dispatchTask(
          index + 1,
          title,
          `你是 ${title}，请完成以下任务中属于你的部分：\n\n${instruction}`,
          `${title} 部分的高质量产出`,
        )
      ),
    );

    const finalOutput = [
      "# 监督者汇总",
      ...outputs.map((output, index) => `## ${roles[index]} 产出\n\n${output}`),
    ].join("\n\n---\n\n");

    this.executor.submitToElder(finalOutput);
    this.result = finalOutput;
  }

  async collectResult(taskId: string): Promise<unknown> {
    return this.result ?? { taskId, mode: this.mode };
  }

  destroy(): void {
    this.sessionChannel = undefined;
    this.config = undefined;
    this.executor = undefined;
    this.result = undefined;
  }
}
