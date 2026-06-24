import { createAnthropic } from "@ai-sdk/anthropic";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createMistral } from "@ai-sdk/mistral";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createXai } from "@ai-sdk/xai";
import { getLlmProvider, inferLlmProvider, type LlmModelConfig } from "@owl-os/core";
import { getModel, getModels, type Api, type KnownProvider, type Model } from "@earendil-works/pi-ai";
import type { LanguageModel } from "ai";

/**
 * 根据模型配置推断供应商。
 * 优先使用显式设置的 provider，否则按 baseUrl 推断。
 */
export function inferProvider(meta: LlmModelConfig): string {
  return inferLlmProvider(meta.baseUrl, meta.provider);
}

/**
 * 根据 provider 名称返回对应的环境变量 key。
 */
export function getEnvKeyForProvider(provider: string): string {
  return getLlmProvider(provider)?.envKey ?? `${provider.toUpperCase()}_API_KEY`;
}

/**
 * 解析并构造 pi-ai 可用的 Model 对象。
 * 若 provider/modelId 不在已知列表中，则回退为 openai-completions 通用模板。
 */
export function resolveModel(provider: string, modelId: string, baseUrl?: string): Model<Api> {
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

/**
 * 使用 Vercel AI SDK 构造 LanguageModel。
 * 对无官方 provider 的服务（openrouter/together/moonshot 等）回退到 openai-compatible。
 */
export function createVercelLanguageModel(
  provider: string,
  modelId: string,
  baseUrl?: string,
  apiKey?: string,
): LanguageModel {
  const normalizedProvider = provider.toLowerCase();
  const providerMeta = getLlmProvider(normalizedProvider);
  const settings = { apiKey, baseURL: baseUrl ?? providerMeta?.defaultBaseUrl };

  switch (normalizedProvider) {
    case "openai":
      return createOpenAI(settings)(modelId);
    case "anthropic":
      return createAnthropic(settings)(modelId);
    case "google":
      return createGoogleGenerativeAI(settings)(modelId);
    case "deepseek":
      return createDeepSeek(settings)(modelId);
    case "mistral":
      return createMistral(settings)(modelId);
    case "groq":
      return createGroq(settings)(modelId);
    case "xai":
      return createXai(settings)(modelId);
    case "openrouter":
      return createOpenAICompatible({
        name: "openrouter",
        apiKey,
        baseURL: baseUrl || providerMeta?.defaultBaseUrl || "https://openrouter.ai/api/v1",
      }).chatModel(modelId);
    case "together":
      return createOpenAICompatible({
        name: "together",
        apiKey,
        baseURL: baseUrl || providerMeta?.defaultBaseUrl || "https://api.together.xyz/v1",
      }).chatModel(modelId);
    case "moonshotai-cn":
      return createOpenAICompatible({
        name: "moonshot",
        apiKey,
        baseURL: baseUrl || providerMeta?.defaultBaseUrl || "https://api.moonshot.cn/v1",
      }).chatModel(modelId);
    default:
      return createOpenAICompatible({
        name: normalizedProvider,
        apiKey,
        baseURL: baseUrl || providerMeta?.defaultBaseUrl || "https://api.openai.com/v1",
      }).chatModel(modelId);
  }
}
