import type { AgentTool } from "@earendil-works/pi-agent-core";
import { buildFileTools, buildShellTools } from "../../../agent-runtime/tools/index.js";
import { buildRecruitSentinelTool, buildRecruitWorkersTool } from "./recruitment-tools.js";
import { buildSentinelTaskDispatchTools } from "./sentinel-task-dispatch.js";

/**
 * 构建 Elder（老板）Agent 可用的工具集合。
 * Elder 只负责为任务选择并招募合适的 Sentinel。
 */
export function buildElderTools(_sessionId: string): AgentTool[] {
  return [buildRecruitSentinelTool()];
}

/**
 * 构建 Sentinel Agent 可用的工具集合。
 * Sentinel 负责任务拆解、Worker 招募、任务派发、产出校验与最终提交。
 */
export function buildSentinelTools(sessionId: string): AgentTool[] {
  // Sentinel 需要读取工作区以验证 Worker 产出，但不需要 Shell/文件生成能力。
  const fileTools = buildFileTools(sessionId);
  const readFileTool = fileTools.find((tool) => tool.name === "read_file");
  const listDirectoryTool = fileTools.find((tool) => tool.name === "list_directory");

  if (!readFileTool || !listDirectoryTool) {
    throw new Error("Sentinel 工具工厂缺少必需的 read_file 或 list_directory 工具");
  }

  return [
    readFileTool,
    listDirectoryTool,
    buildRecruitWorkersTool(),
    ...buildSentinelTaskDispatchTools(sessionId),
  ];
}

/**
 * 构建 Worker Agent 可用的工具集合。
 * Worker 负责实际执行：读写文件、生成结构化文件、执行 Shell 命令。
 */
export function buildWorkerTools(sessionId: string): AgentTool[] {
  return [...buildFileTools(sessionId), ...buildShellTools(sessionId)];
}
