import type { Task } from "../task-board/task.js";
import type { SessionChannel } from "../session/session-channel.js";
import type { ICollaborationStrategy, StrategyConfig, IStrategyExecutor } from "./strategy.js";

const DEFAULT_BRAINSTORM_ROLES = ["researcher", "writer", "analyst"];

/**
 * 头脑风暴策略：并行发散、隔离执行、全量汇总。
 * Phase 3 实现：招募多个 Worker 从不同角度并行产出，最后汇总提交给 Elder。
 */
export class BrainstormStrategy implements ICollaborationStrategy {
  readonly mode = "brainstorm";
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
      throw new Error("BrainstormStrategy 未初始化 executor");
    }

    this.sessionChannel?.emitTaskEvent({ type: "strategy_dispatch", taskId: rootTask.taskId });

    const roles = this.config?.roles && Array.isArray(this.config.roles)
      ? (this.config.roles as string[])
      : DEFAULT_BRAINSTORM_ROLES;
    const instruction = this.config?.instruction ?? rootTask.description;

    await this.executor.recruitWorkers(roles);

    const outputs = await Promise.all(
      roles.map((title, index) =>
        this.executor!.dispatchTask(
          index + 1,
          title,
          `请从 "${title}" 的角度对以下需求进行发散思考，输出你的独立见解：\n\n${instruction}`,
          `${title} 角度的高质量见解`,
        )
      ),
    );

    const finalOutput = [
      "# 头脑风暴汇总",
      ...outputs.map((output, index) => `## ${roles[index]}\n\n${output}`),
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
