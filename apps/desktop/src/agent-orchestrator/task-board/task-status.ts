/**
 * 任务状态枚举。
 * 统一全链路任务状态定义，供 TaskBoard、AgentRunner、前端任务卡片共同使用。
 */
export enum TaskStatus {
  PENDING = "pending",
  ASSIGNED = "assigned",
  RUNNING = "running",
  REVIEWING = "reviewing",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}
