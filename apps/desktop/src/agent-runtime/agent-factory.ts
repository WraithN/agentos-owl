import { Type } from "@earendil-works/pi-ai";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { AgentFactory } from "@owl-os/core";
import type {
  AgentDriverFactory,
  AgentNameGenerator,
  AgentToolFactory,
} from "@owl-os/core";
import {
  createPlainAgentWithConfig,
  hasDefaultLlm,
  loadSystemPrompt,
  tryLoadSystemPrompt,
  NoDefaultLlmError,
} from "./agent.js";
import type { LlmConfig } from "./llm-config.js";
import { readLlmConfig } from "./llm-config.js";
import { buildPlannerTools } from "../agent-orchestrator/runner/tools/planner-tools.js";
import {
  buildElderTools,
  buildSentinelTools,
  buildWorkerTools,
} from "../agent-orchestrator/runner/tools/factory.js";
import { PiAgentDriver } from "./drivers/pi-agent-driver.js";
import { VercelAiDriver } from "./drivers/vercel-ai-driver.js";
import { createVercelLanguageModel, inferProvider } from "./drivers/provider-config.js";
import { generateBossName, localeAwareNameGenerator } from "./agent-names.js";
import { renderPlannerSystemPrompt } from "../agent-orchestrator/runner/tools/prompt-builder.js";

export type { LlmConfig } from "./llm-config.js";

const defaultNameGenerator: AgentNameGenerator = localeAwareNameGenerator;

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

type AgentFactoryDriverInput = Parameters<AgentDriverFactory>[0];

function buildSystemPrompt(input: AgentFactoryDriverInput): string {
  if (input.role === "elder") {
    return loadSystemPrompt("elder_boss");
  }
  if (input.role === "sentinel") {
    if (input.title === "planner") {
      return renderPlannerSystemPrompt(buildPlannerTools(input.sessionId));
    }
    return loadSentinelPrompt(input.title);
  }
  return loadSystemPrompt("worker");
}

function buildTools(input: AgentFactoryDriverInput): AgentTool[] {
  if (input.role === "elder") {
    return buildElderTools(input.sessionId);
  }

  if (input.role === "sentinel") {
    return buildSentinelTools(input.sessionId);
  }

  return buildWorkerTools(input.sessionId);
}

function buildToolFactory(): AgentToolFactory {
  return (input) => {
    if (input.role !== "sentinel" || input.title !== "supervisor") return [];
    return [{ name: "recruit", description: "评估任务并招募当前 Teammate 的后续成员" }];
  };
}

/**
 * 默认使用 pi-ai（pi-agent）作为 LLM Driver。
 * 设置 USE_VERCEL_AI=1 或 true 可切换到 Vercel AI SDK Driver。
 */
function isVercelAiEnabled(): boolean {
  const value = process.env.USE_VERCEL_AI;
  return value === "1" || value === "true";
}

function buildPiAgentDriver(input: AgentFactoryDriverInput, config: LlmConfig): PiAgentDriver {
  return new PiAgentDriver(
    createPlainAgentWithConfig(input.sessionId, config, {
      systemPrompt: buildSystemPrompt(input),
      tools: buildTools(input),
    }),
  );
}

function buildVercelAiDriver(input: AgentFactoryDriverInput, config: LlmConfig): VercelAiDriver {
  const defaultModel = config.models.find((m) => m.category === "llm" && m.isDefault === true);
  if (!defaultModel) throw new NoDefaultLlmError();
  const provider = inferProvider(defaultModel);
  const model = createVercelLanguageModel(provider, defaultModel.id, defaultModel.baseUrl, config.apiKey);
  return new VercelAiDriver({
    model,
    systemPrompt: buildSystemPrompt(input),
    tools: buildTools(input),
  });
}

function buildDriver(input: AgentFactoryDriverInput, config: LlmConfig): PiAgentDriver | VercelAiDriver {
  return isVercelAiEnabled() ? buildVercelAiDriver(input, config) : buildPiAgentDriver(input, config);
}

// 主线程内使用：直接读取数据库获取 LLM 配置
export function createAgentFactory(): AgentFactory {
  const config = readLlmConfig();
  const driverFactory: AgentDriverFactory = (input) => {
    if (!hasDefaultLlm(config.models)) throw new NoDefaultLlmError();
    return buildDriver(input, config);
  };

  return new AgentFactory({
    driverFactory,
    nameGenerator: defaultNameGenerator,
    toolFactory: buildToolFactory(),
  });
}

// Worker 线程使用：由主线程传入 LLM 配置，Worker 不再访问数据库
export function createAgentFactoryWithConfig(config: LlmConfig): AgentFactory {
  const driverFactory: AgentDriverFactory = (input) => {
    if (!hasDefaultLlm(config.models)) throw new NoDefaultLlmError();
    return buildDriver(input, config);
  };

  return new AgentFactory({
    driverFactory,
    nameGenerator: defaultNameGenerator,
    toolFactory: buildToolFactory(),
  });
}
