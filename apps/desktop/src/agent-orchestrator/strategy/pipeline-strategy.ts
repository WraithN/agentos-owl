import type { Task } from "../task-board/task.js";
import type { SessionChannel } from "../session/session-channel.js";
import type { ICollaborationStrategy, StrategyConfig, IStrategyExecutor } from "./strategy.js";

/**
 * 流水线策略：串行执行、逐步验收、前序不通过不进入下一步。
 * Phase 2 实现基础 researcher → writer 两阶段流水线；后续可接入 PlannerSelfDriveLoop 做动态规划。
 */
export class PipelineStrategy implements ICollaborationStrategy {
  readonly mode = "pipeline";
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
      throw new Error("PipelineStrategy 未初始化 executor");
    }

    this.sessionChannel?.emitTaskEvent({ type: "strategy_dispatch", taskId: rootTask.taskId });

    await this.executor.recruitWorkers(["researcher", "writer"]);

    const instruction = this.config?.instruction ?? rootTask.description;

    const researcherOutput = await this.executor.dispatchTask(
      1,
      "researcher",
      `请根据以下用户需求进行资料收集与研究，输出结构化研究成果：\n\n${instruction}`,
      "结构化研究成果，覆盖用户需求的关键点",
    );

    const researcherValidation = await this.executor.validateOutput("researcher", researcherOutput, [
      "产出为结构化研究成果",
      "覆盖用户需求的关键点",
    ]);

    if (!researcherValidation.passed) {
      this.result = `阶段 researcher 校验未通过：${researcherValidation.feedback}`;
      return;
    }

    const writerOutput = await this.executor.dispatchTask(
      2,
      "writer",
      `请基于以下研究成果生成最终交付物（文档类任务需生成对应格式文件）。\n\n原始需求：\n${instruction}\n\n研究成果：\n${researcherOutput}`,
      "最终交付物完整、可直接使用，文档类任务已生成文件",
    );

    const writerValidation = await this.executor.validateOutput("writer", writerOutput, [
      "最终交付物完整且可直接使用",
      "文档类任务已生成对应格式文件",
    ]);

    if (!writerValidation.passed) {
      this.result = `阶段 writer 校验未通过：${writerValidation.feedback}`;
      return;
    }

    this.executor.submitToElder(writerOutput);
    this.result = writerOutput;
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
