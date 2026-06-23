import { Type } from "@earendil-works/pi-ai";
import type { AgentTool, AgentToolResult } from "@earendil-works/pi-agent-core";
import { AgentFactory } from "@owl-os/core";
import type {
  AgentDriverFactory,
  AgentNameGenerator,
  AgentToolFactory,
} from "@owl-os/core";
import {
  createPlainAgent,
  createPlainAgentWithConfig,
  hasDefaultLlm,
  loadSystemPrompt,
  tryLoadSystemPrompt,
  NoDefaultLlmError,
} from "./agent.js";
import type { LlmConfig } from "./llmConfig.js";
import { buildPlannerTools, buildTools } from "./tools.js";
import { PiAgentDriver } from "./drivers/PiAgentDriver.js";
import { generateBossName, localeAwareNameGenerator } from "./agentNames.js";

export type { LlmConfig } from "./llmConfig.js";

function buildRecruitSentinelTool(): AgentTool {
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

function buildRecruitWorkersTool(): AgentTool {
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

function pickTool(tools: AgentTool[], name: string): AgentTool {
  const tool = tools.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool not found: ${name}`);
  return tool;
}

const owleryNameGenerator: AgentNameGenerator = localeAwareNameGenerator;

function sanitizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function loadSentinelPrompt(title: string): string {
  const common = tryLoadSystemPrompt("sentinel_common");
  const specific = tryLoadSystemPrompt(`sentinel_${sanitizeTitle(title)}`);
  const parts = [common, specific].filter((text): text is string => Boolean(text));
  if (parts.length === 0) {
    return loadSystemPrompt("elder_boss");
  }
  return parts.join("\n\n---\n\n");
}

type OwleryDriverInput = Parameters<AgentDriverFactory>[0];

function buildOwlerySystemPrompt(input: OwleryDriverInput): string {
  return input.role === "elder"
    ? loadSystemPrompt("elder_boss")
    : input.role === "sentinel"
      ? loadSentinelPrompt(input.title)
      : loadSystemPrompt("worker");
}

function buildOwleryTools(input: OwleryDriverInput): AgentTool[] {
  if (input.role === "elder") {
    return [buildRecruitSentinelTool()];
  }

  const allTools = buildTools(input.sessionId);
  const readFileTool = pickTool(allTools, "read_file");
  const listDirectoryTool = pickTool(allTools, "list_directory");

  if (input.role === "sentinel") {
    return [
      readFileTool,
      listDirectoryTool,
      buildRecruitWorkersTool(),
      ...buildPlannerTools(input.sessionId),
    ];
  }

  const createXFileTool = pickTool(allTools, "create_x_file");
  const executeCommandTool = pickTool(allTools, "execute_command");
  return [readFileTool, listDirectoryTool, createXFileTool, executeCommandTool];
}

function buildOwleryToolFactory(): AgentToolFactory {
  return (input) => {
    if (input.role !== "sentinel" || input.title !== "supervisor") return [];
    return [{ name: "recruit", description: "评估任务并招募当前 Teammate 的后续成员" }];
  };
}

// 主线程内运行的 Owlery（如 IPC 回退路径）使用：直接读取数据库
export function createOwleryAgentFactory(): AgentFactory {
  const driverFactory: AgentDriverFactory = (input) => {
    if (!hasDefaultLlm()) throw new NoDefaultLlmError();
    const systemPrompt = buildOwlerySystemPrompt(input);
    const tools = buildOwleryTools(input);

    return new PiAgentDriver(
      createPlainAgent(input.sessionId, 0, {
        systemPrompt,
        tools,
      }),
    );
  };

  return new AgentFactory({
    driverFactory,
    nameGenerator: owleryNameGenerator,
    toolFactory: buildOwleryToolFactory(),
  });
}

// Worker 线程使用：由主线程传入 LLM 配置，Worker 不再访问数据库
export function createOwleryAgentFactoryWithConfig(config: LlmConfig): AgentFactory {
  const driverFactory: AgentDriverFactory = (input) => {
    if (!hasDefaultLlm(config.models)) throw new NoDefaultLlmError();
    const systemPrompt = buildOwlerySystemPrompt(input);
    const tools = buildOwleryTools(input);

    return new PiAgentDriver(
      createPlainAgentWithConfig(input.sessionId, config, {
        systemPrompt,
        tools,
      }),
    );
  };

  return new AgentFactory({
    driverFactory,
    nameGenerator: owleryNameGenerator,
    toolFactory: buildOwleryToolFactory(),
  });
}
