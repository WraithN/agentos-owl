import { Type } from "@earendil-works/pi-ai";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { textResult } from "../../../agent-runtime/tools/tool-result.js";

export function buildSentinelTaskDispatchTools(_sessionId: string): AgentTool[] {
  return [
    {
      name: "dispatch_task",
      label: "派发任务",
      description:
        "把子任务派发给指定 Worker。只允许派发给你已经招募的 Worker。参数：workerTitle（如 researcher/writer）、stage（阶段编号 1/2/...）、instruction（任务说明）、expectedOutput（期望产出，可选）。",
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
        "校验上一阶段 Worker 的产出是否满足验收标准。参数：stage（阶段名，如 researcher/writer）、output（待校验产出）、criteria（验收标准数组）。",
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
        "当所有阶段都完成并通过校验后，调用此工具把最终成果提交给 Elder（老板）做最终评审。参数：finalOutput（最终成果文本）。",
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
