/* 单 Agent 构造封装 */
import { Agent, type AgentTool } from "@earendil-works/pi-agent-core";
import type { LlmModelConfig } from "@owl-os/core";
import { getLlmProvider, hasDefaultLlm, inferLlmProvider, parseLlmModels } from "@owl-os/core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolvePromptPathFrom } from "./prompt-path.js";
import { getDatabase } from "../db/connection.js";
import * as queries from "../db/queries/index.js";
import { getSecret } from "../utils/crypto/secrets.js";
import { buildFileTools, buildShellTools } from "./tools/index.js";
import { resolveModel } from "./drivers/provider-config.js";

export interface LlmConfig {
  models: LlmModelConfig[];
  apiKey: string;
}

// 主线程内直接读取数据库的兼容入口；Worker 线程应使用传配置版本。
function getSetting(key: string): string | undefined {
  return queries.getSetting(getDatabase(), key);
}

export class NoDefaultLlmError extends Error {
  constructor() {
    super("尚未设置默认对话模型，请在「设置 → LLM 配置」中选择默认模型后再试。");
    this.name = "NoDefaultLlmError";
  }
}

const FALLBACK_SYSTEM_PROMPT = "你是 OwlOS 的 Boss Agent，直截了当解决问题。";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function resolvePromptPath(role: string): string | null {
  return resolvePromptPathFrom(__dirname, `${role}.md`);
}

export function tryLoadSystemPrompt(role: string): string | undefined {
  const filePath = resolvePromptPath(role);
  if (!filePath) return undefined;
  try {
    const text = fs.readFileSync(filePath, "utf-8").trim();
    return text || undefined;
  } catch {
    return undefined;
  }
}

export function loadSystemPrompt(role: string = "elder_boss"): string {
  const text = tryLoadSystemPrompt(role);
  if (text) return text;
  console.warn(`[agent] ${role}.md 未找到或读取失败，使用内置默认提示词`);
  return FALLBACK_SYSTEM_PROMPT;
}

function resolveDefaultLlmFromConfig(config: LlmConfig): { meta: LlmModelConfig; provider: string; apiKey: string } | null {
  const models = config.models;
  const def = models.find((m) => m.category === "llm" && m.isDefault === true);
  if (!def) return null;
  const provider = inferLlmProvider(def.baseUrl, def.provider);
  return { meta: def, provider, apiKey: config.apiKey };
}

function resolveDefaultLlm(): { meta: LlmModelConfig; provider: string; apiKey: string } | null {
  const models = parseLlmModels(getSetting("llmModels"));
  const def = models.find((m) => m.category === "llm" && m.isDefault === true);
  if (!def) return null;
  const provider = inferLlmProvider(def.baseUrl, def.provider);
  const apiKey = getSecret(`llm_model_key/${def.id}`) ?? "";
  return { meta: def, provider, apiKey };
}

export { hasDefaultLlm };

export interface CreatePlainAgentOptions {
  systemPrompt: string;
  tools?: AgentTool[];
}

function buildAgent(
  sessionId: string,
  resolved: { meta: LlmModelConfig; provider: string; apiKey: string },
  options: CreatePlainAgentOptions,
): Agent {
  const { meta, provider, apiKey } = resolved;
  const modelId = meta.id.replace(/^deepseek-/, "");
  const baseUrl = meta.baseUrl;

  const envKey = getLlmProvider(provider)?.envKey ?? `${provider.toUpperCase()}_API_KEY`;
  if (apiKey) {
    process.env[envKey] = apiKey;
  }
  if (baseUrl) {
    process.env[`${provider.toUpperCase()}_BASE_URL`] = baseUrl;
  }

  const model = resolveModel(provider, modelId, baseUrl);

  return new Agent({
    initialState: {
      systemPrompt: options.systemPrompt,
      model,
      tools: options.tools ?? [...buildFileTools(sessionId), ...buildShellTools(sessionId)],
    },
    getApiKey: () => apiKey,
  });
}

// 主线程版本：直接读取数据库获取 LLM 配置
export function createPlainAgent(
  sessionId: string,
  _windowId: number,
  options: CreatePlainAgentOptions,
): Agent {
  const resolved = resolveDefaultLlm();
  if (!resolved) {
    throw new NoDefaultLlmError();
  }
  return buildAgent(sessionId, resolved, options);
}

// Worker 线程版本：由主线程预读取配置后传入，Worker 不再访问数据库
export function createPlainAgentWithConfig(
  sessionId: string,
  config: LlmConfig,
  options: CreatePlainAgentOptions,
): Agent {
  const resolved = resolveDefaultLlmFromConfig(config);
  if (!resolved) {
    throw new NoDefaultLlmError();
  }
  return buildAgent(sessionId, resolved, options);
}
