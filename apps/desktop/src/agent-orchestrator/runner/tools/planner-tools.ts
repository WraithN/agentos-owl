import { Type } from "@earendil-works/pi-ai";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { buildRecruitWorkersTool } from "./recruitment-tools.js";
import { textResult } from "../../../agent-runtime/tools/tool-result.js";

/**
 * 构建 Planner Sentinel 可用的工具集合。
 * Planner 只负责调度：招募 Worker、派发任务、校验产出、提交给 Elder。
 * 按照 sentinel_planner.md 的约束，Planner 不应拥有 read_file / list_directory /
 * create_x_file / execute_command 等直接执行工具。
 */
export function buildPlannerTools(_sessionId: string): AgentTool[] {
  return [
    buildRecruitWorkersTool(),
    ...buildTaskDispatchTools(),
  ];
}

function buildTaskDispatchTools(): AgentTool[] {
  return [
    {
      name: "dispatch_task",
      label: "派发任务",
      description:
        "把子任务派发给指定 Worker。只允许派发给你已经招募的 Worker。参数：workerTitle（如 researcher/writer）、stage（阶段编号 1/2/...）、instruction（任务说明，必须包含用户需求、前置依赖、验收标准）、expectedOutput（期望产出，可选）。顺序要求：必须先 dispatch_task 给 researcher（阶段 1），等 researcher 产出返回并校验通过后，再 dispatch_task 给 writer（阶段 2）。",
      parameters: Type.Object({
        workerTitle: Type.String(),
        stage: Type.Number(),
        instruction: Type.String(),
        expectedOutput: Type.Optional(Type.String()),
      }),
      execute: async (_id, params) => {
        const { workerTitle, stage, instruction } = params as {
          workerTitle: string;
          stage: number;
          instruction: string;
        };
        return textResult(`[系统将派发任务] 阶段 ${stage} → ${workerTitle}\n任务说明：${instruction}`);
      },
    },
    {
      name: "validate_output",
      label: "校验产出",
      description:
        "校验上一阶段 Worker 的产出是否满足验收标准。参数：stage（阶段名，如 researcher/writer）、output（待校验产出）、criteria（验收标准字符串数组）。必须通过本工具校验并确认通过后，才能进入下一阶段。",
      parameters: Type.Object({
        stage: Type.String(),
        output: Type.String(),
        criteria: Type.Array(Type.String()),
      }),
      execute: async (_id, params) => {
        const { stage, output, criteria } = params as {
          stage: string;
          output: string;
          criteria: string[];
        };
        return textResult(
          `[系统请求校验] 阶段：${stage}\n产出：${output}\n验收标准：\n${criteria.map((c, i) => `${i + 1}. ${c}`).join("\n")}`,
        );
      },
    },
    {
      name: "submit_to_elder",
      label: "提交给老板",
      description:
        "当所有阶段都完成并通过校验后，调用此工具把最终成果提交给 Elder（老板）做最终评审。参数：finalOutput（最终成果文本或摘要，文档类任务需包含生成的文件名）。",
      parameters: Type.Object({
        finalOutput: Type.String(),
      }),
      execute: async (_id, params) => {
        const { finalOutput } = params as { finalOutput: string };
        return textResult(`[系统将提交给 Elder]\n${finalOutput}`);
      },
    },
  ];
}
