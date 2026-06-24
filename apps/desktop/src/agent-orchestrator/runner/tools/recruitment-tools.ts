import { Type } from "@earendil-works/pi-ai";
import type { AgentTool, AgentToolResult } from "@earendil-works/pi-agent-core";

export function buildRecruitSentinelTool(): AgentTool {
  return {
    name: "recruit_sentinel",
    label: "招募 Sentinel",
    description:
      "根据任务复杂度选择一个 Sentinel title 并招募它。参数 title 必须是 planner、supervisor、coordinator、cto 之一。",
    parameters: Type.Object({
      title: Type.String(),
      reason: Type.Optional(Type.String()),
    }),
    execute: async (_id, params): Promise<AgentToolResult<unknown>> => {
      const { title, reason } = params as { title: string; reason?: string };
      return {
        content: [
          {
            type: "text",
            text: `已选择 Sentinel: ${title}${reason ? `，原因：${reason}` : ""}`,
          },
        ],
        details: undefined,
      };
    },
  };
}

export function buildRecruitWorkersTool(): AgentTool {
  return {
    name: "recruit_workers",
    label: "招募 Workers",
    description:
      "分析任务后，决定需要哪些 Worker 角色。参数 workers 是一个 title 字符串数组，例如 [\"developer\", \"tester\"]。",
    parameters: Type.Object({
      workers: Type.Array(Type.String()),
    }),
    execute: async (_id, params): Promise<AgentToolResult<unknown>> => {
      const { workers } = params as { workers: string[] };
      return {
        content: [
          {
            type: "text",
            text: `已决定 Workers: ${workers.join(", ")}`,
          },
        ],
        details: undefined,
      };
    },
  };
}
