/* Owlery 底层 Agent 构造封装 */
import { Agent, type AgentTool } from "@earendil-works/pi-agent-core";
import { getModel, getModels, type Api, type KnownProvider, type Model } from "@earendil-works/pi-ai";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app } from "electron";
import { getDatabase } from "../db/connection.js";
import * as queries from "../db/queries/index.js";
import { getSecret } from "../secure.js";
import { buildTools } from "./tools.js";

export class NoDefaultLlmError extends Error {
  constructor() {
    super("尚未设置默认对话模型，请在「设置 → LLM 配置」中选择默认模型后再试。");
    this.name = "NoDefaultLlmError";
  }
}

const FALLBACK_SYSTEM_PROMPT = "你是 OwlOS 的 Boss Agent，直截了当解决问题。";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolvePromptPath(role: string): string | null {
  const candidates: string[] = [];
  const fileName = `${role}.md`;
  // 开发态：apps/desktop/dist/main → 仓库根 /prompt/
  candidates.push(path.resolve(__dirname, "../../../../prompt", fileName));
  // 打包后：resourcesPath/prompt/
  try {
    if (app?.isPackaged) {
      candidates.push(path.join(process.resourcesPath, "prompt", fileName));
    }
  } catch {
    // ignore，非主进程上下文
  }
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export function loadSystemPrompt(role: string = "boss_agent"): string {
  const filePath = resolvePromptPath(role);
  if (!filePath) {
    console.warn(`[agent] ${role}.md 未找到，使用内置默认提示词`);
    return FALLBACK_SYSTEM_PROMPT;
  }
  try {
    const text = fs.readFileSync(filePath, "utf-8").trim();
    return text || FALLBACK_SYSTEM_PROMPT;
  } catch (err) {
    console.warn(`[agent] 读取 ${role}.md 失败，使用内置默认提示词:`, err);
    return FALLBACK_SYSTEM_PROMPT;
  }
}

function getSetting(key: string): string | undefined {
  return queries.getSetting(getDatabase(), key);
}

interface LlmModelMeta {
  id: string;
  name: string;
  baseUrl: string;
  provider?: string;
  category: "llm" | "embedding" | "voice";
  isDefault?: boolean;
}

function parseLlmModels(raw: string | undefined): LlmModelMeta[] {
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.filter((m): m is LlmModelMeta => {
      if (!m || typeof m !== "object") return false;
      const v = m as Record<string, unknown>;
      return (
        typeof v.id === "string" &&
        typeof v.name === "string" &&
        typeof v.baseUrl === "string" &&
        (v.category === "llm" || v.category === "embedding" || v.category === "voice")
      );
    });
  } catch {
    return [];
  }
}

const PROVIDER_DOMAIN_MAP: Array<[RegExp, KnownProvider]> = [
  [/openrouter\.ai/i, "openrouter"],
  [/anthropic\.com/i, "anthropic"],
  [/api\.openai\.com/i, "openai"],
  [/api\.deepseek\.com/i, "deepseek"],
  [/generativelanguage\.googleapis\.com/i, "google"],
  [/api\.groq\.com/i, "groq"],
  [/api\.mistral\.ai/i, "mistral"],
  [/api\.x\.ai/i, "xai"],
  [/api\.together\.xyz/i, "together"],
  [/api\.moonshot\.cn/i, "moonshotai-cn"],
];

function inferProvider(meta: LlmModelMeta): string {
  if (meta.provider && meta.provider.trim()) return meta.provider.trim();
  for (const [pattern, provider] of PROVIDER_DOMAIN_MAP) {
    if (pattern.test(meta.baseUrl)) return provider;
  }
  return "openai";
}

function resolveDefaultLlm(): { meta: LlmModelMeta; provider: string; apiKey: string } | null {
  const models = parseLlmModels(getSetting("llmModels"));
  const def = models.find((m) => m.category === "llm" && m.isDefault === true);
  if (!def) return null;
  const provider = inferProvider(def);
  const apiKey = getSecret(`llm_model_key/${def.id}`) ?? "";
  return { meta: def, provider, apiKey };
}

export function hasDefaultLlm(): boolean {
  return resolveDefaultLlm() !== null;
}

function getEnvKeyForProvider(provider: string): string {
  const map: Record<string, string> = {
    openai: "OPENAI_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    deepseek: "DEEPSEEK_API_KEY",
    google: "GOOGLE_API_KEY",
    groq: "GROQ_API_KEY",
    mistral: "MISTRAL_API_KEY",
    xai: "XAI_API_KEY",
    together: "TOGETHER_API_KEY",
    openrouter: "OPENROUTER_API_KEY",
  };
  return map[provider.toLowerCase()] ?? `${provider.toUpperCase()}_API_KEY`;
}

function resolveModel(provider: string, modelId: string, baseUrl?: string): Model<Api> {
  const known = getModel(provider as KnownProvider, modelId as never);
  if (known) {
    if (baseUrl) return { ...known, baseUrl } as Model<Api>;
    return known;
  }

  const template = getModels(provider as KnownProvider)[0];
  if (template) {
    return { ...template, id: modelId, name: modelId, ...(baseUrl ? { baseUrl } : {}) } as Model<Api>;
  }

  return {
    id: modelId,
    name: modelId,
    api: "openai-completions",
    provider,
    baseUrl: baseUrl || "https://api.openai.com/v1",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128_000,
    maxTokens: 4096,
  } as Model<Api>;
}

export interface CreatePlainAgentOptions {
  systemPrompt: string;
  tools?: AgentTool[];
}

export function createPlainAgent(
  sessionId: string,
  windowId: number,
  options: CreatePlainAgentOptions
): Agent {
  const resolved = resolveDefaultLlm();
  if (!resolved) {
    throw new NoDefaultLlmError();
  }

  const { meta, provider, apiKey } = resolved;
  const modelId = meta.id.replace(/^deepseek-/, "");
  const baseUrl = meta.baseUrl;

  const envKey = getEnvKeyForProvider(provider);
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
      tools: options.tools ?? buildTools(sessionId),
    },
    getApiKey: () => apiKey,
  });
}
