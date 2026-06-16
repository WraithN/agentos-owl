/* 桌面端 Pi Agent 运行时封装 */
import { Agent } from "@earendil-works/pi-agent-core";
import { getModel, getModels, type Api, type KnownProvider, type Model } from "@earendil-works/pi-ai";
import { getDatabase } from "../db/connection.js";
import * as queries from "../db/queries/index.js";
import { getSecret, setSecret } from "../secure.js";
import { buildTools } from "./tools.js";

export interface AgentSession {
  id: string;
  agent: Agent;
  windowId: number;
}

const sessions = new Map<string, AgentSession>();

function getSetting(key: string): string | undefined {
  return queries.getSetting(getDatabase(), key);
}

function getApiKey(): string | undefined {
  return getSecret("llm_api_key") ?? getSetting("llmApiKey");
}

function setApiKeyFallback(value: string): void {
  setSecret("llm_api_key", value);
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

export function createAgentSession(sessionId: string, windowId: number): AgentSession {
  disposeAgentSession(sessionId);

  const provider = getSetting("llmProvider") ?? "openai";
  const modelId = getSetting("defaultModel") ?? "gpt-4o-mini";
  let apiKey = getApiKey();
  const baseUrl = getSetting("llmBaseUrl");
  if (!apiKey) {
    apiKey = getSetting("llmApiKey");
    if (apiKey) setApiKeyFallback(apiKey);
  }

  // 设置环境变量供 pi-ai 读取
  const envKey = getEnvKeyForProvider(provider);
  if (apiKey) {
    process.env[envKey] = apiKey;
  }
  if (baseUrl) {
    process.env[`${provider.toUpperCase()}_BASE_URL`] = baseUrl;
  }

  const model = resolveModel(provider, modelId, baseUrl);
  const systemPrompt = getSetting("agentSystemPrompt") ?? "You are a helpful coding assistant.";

  const agent = new Agent({
    initialState: {
      systemPrompt,
      model,
      tools: buildTools(sessionId),
    },
    getApiKey: () => apiKey,
  });

  const session: AgentSession = { id: sessionId, agent, windowId };
  sessions.set(sessionId, session);
  return session;
}

export function getAgentSession(sessionId: string): AgentSession | undefined {
  return sessions.get(sessionId);
}

export function disposeAgentSession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.agent.abort();
    sessions.delete(sessionId);
  }
}

export function disposeAllAgentSessions(): void {
  for (const [id] of sessions) {
    disposeAgentSession(id);
  }
}
