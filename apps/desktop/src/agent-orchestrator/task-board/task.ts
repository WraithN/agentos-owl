import type { TaskStatus } from "./task-status.js";

/**
 * 任务实体，支持通过 parentTaskId 形成任务树，表达多 Agent 协作中的子任务关系。
 */
export interface Task {
  /** 任务唯一标识 */
  taskId: string;
  /** 父任务 ID，根任务为空 */
  parentTaskId?: string;
  /** 创建者 Agent ID */
  creatorAgentId: string;
  /** 执行者 Agent ID */
  assigneeAgentId?: string;
  /** 任务标题 */
  title: string;
  /** 任务详细说明 */
  description: string;
  /** 当前状态 */
  status: TaskStatus;
  /** 进度 0-100 */
  progress: number;
  /** 任务结果，成功后填充 */
  result?: unknown;
  /** 创建时间戳 */
  createdAt: number;
  /** 完成/失败时间戳 */
  finishedAt?: number;
}
