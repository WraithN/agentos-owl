import type { Task } from "../task-board/task.js";
import type { SessionChannel } from "../session/session-channel.js";
import type { WorkerAgentRunner } from "../runner/worker-agent-runner.js";

/**
 * 策略执行器接口。
 * 策略只负责“怎么调度任务”，具体 Agent 创建、LLM 交互、PeerChannel 通信由 SentinelAgentRunner 通过该接口提供。
 */
export interface IStrategyExecutor {
  /** 当前会话 ID */
  readonly sessionId: string;
  /** 招募指定 title 的 Worker */
  recruitWorkers(titles: string[]): Promise<WorkerAgentRunner[]>;
  /** 派发任务给指定 Worker，返回 Worker 产出文本 */
  dispatchTask(stage: number, workerTitle: string, instruction: string, expectedOutput?: string): Promise<string>;
  /** 校验上一阶段产出 */
  validateOutput(stage: string, output: string, criteria: string[]): Promise<{ passed: boolean; feedback: string }>;
  /** 向 Elder 提交最终成果 */
  submitToElder(finalOutput: string): void;
}

/**
 * 协作策略配置。
 */
export interface StrategyConfig {
  /** 最大 Worker 数量 */
  maxWorkers?: number;
  /** 最大评审轮数 */
  maxReviewRounds?: number;
  /** 是否允许失败后重试 */
  allowRetry?: boolean;
  /** 其他策略专属配置 */
  [key: string]: unknown;
}

/**
 * 协作策略统一接口。
 * 每种协作模式（Pipeline / Brainstorm / Supervisor / Hierarchy）实现该接口。
 */
export interface ICollaborationStrategy {
  readonly mode: string;

  /** 初始化策略，绑定会话通道、配置与执行器 */
  init(sessionChannel: SessionChannel, config: StrategyConfig, executor: IStrategyExecutor): void;

  /** 分发根任务 */
  dispatchTask(rootTask: Task): Promise<void>;

  /** 收集指定任务的结果 */
  collectResult(taskId: string): Promise<unknown>;

  /** 销毁策略，释放资源 */
  destroy(): void;
}

/**
 * 策略注册表，根据 mode 字符串获取对应策略类。
 */
export class StrategyRegistry {
  private readonly strategies = new Map<string, new () => ICollaborationStrategy>();

  register(mode: string, clazz: new () => ICollaborationStrategy): void {
    this.strategies.set(mode, clazz);
  }

  get(mode: string): ICollaborationStrategy | undefined {
    const clazz = this.strategies.get(mode);
    return clazz ? new clazz() : undefined;
  }

  has(mode: string): boolean {
    return this.strategies.has(mode);
  }
}

/**
 * 全局默认策略注册表实例。
 */
export const defaultStrategyRegistry = new StrategyRegistry();

// Phase 1 注册所有策略骨架
import { PipelineStrategy } from "./pipeline-strategy.js";
import { BrainstormStrategy } from "./brainstorm-strategy.js";
import { SupervisorStrategy } from "./supervisor-strategy.js";
import { HierarchyStrategy } from "./hierarchy-strategy.js";

defaultStrategyRegistry.register("pipeline", PipelineStrategy);
defaultStrategyRegistry.register("brainstorm", BrainstormStrategy);
defaultStrategyRegistry.register("supervisor", SupervisorStrategy);
defaultStrategyRegistry.register("hierarchy", HierarchyStrategy);
