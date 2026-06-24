import type { Task } from "../task-board/task.js";
import type { SessionChannel } from "../session/session-channel.js";
import type { ICollaborationStrategy, StrategyConfig, IStrategyExecutor } from "./strategy.js";

/**
 * 层级树策略：递归拆分、多级嵌套、逐级汇总。
 * Phase 3 实现基础两层级联：高层角色拆解 → 执行角色实现 → 汇总提交。
 */
export class HierarchyStrategy implements ICollaborationStrategy {
  readonly mode = "hierarchy";
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
      throw new Error("HierarchyStrategy 未初始化 executor");
    }

    this.sessionChannel?.emitTaskEvent({ type: "strategy_dispatch", taskId: rootTask.taskId });

    const instruction = this.config?.instruction ?? rootTask.description;
    await this.executor.recruitWorkers(["architect", "developer"]);

    const architectOutput = await this.executor.dispatchTask(
      1,
      "architect",
      `请对以下需求进行高层架构拆解，输出模块划分、关键接口与执行顺序：\n\n${instruction}`,
      "清晰的架构拆解",
    );

    const developerOutput = await this.executor.dispatchTask(
      2,
      "developer",
      `请基于以下架构设计给出具体实现方案：\n\n${architectOutput}`,
      "可落地的实现方案",
    );

    const finalOutput = [
      "# 层级汇总",
      "## 高层架构",
      architectOutput,
      "",
      "## 实现方案",
      developerOutput,
    ].join("\n");

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
