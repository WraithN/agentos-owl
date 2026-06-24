/**
 * LLM Provider 元数据与模型配置共享定义。
 * 此文件不依赖具体 SDK，供前后端共用。
 */

export type LlmModelCategory = "llm" | "embedding" | "voice";

export interface LlmModelConfig {
  id: string;
  name: string;
  baseUrl: string;
  provider: string;
  category: LlmModelCategory;
  isDefault?: boolean;
}

export interface LlmProvider {
  id: string;
  name: string;
  defaultBaseUrl: string;
  envKey: string;
  /** 是否有 Vercel AI SDK 官方 provider 包 */
  official: boolean;
}

/**
 * 支持的 LLM 供应商列表。
 * 与 Vercel AI SDK 官方 provider 及 openai-compatible 兜底对齐。
 */
export const LLM_PROVIDERS: LlmProvider[] = [
  { id: "openai", name: "OpenAI", defaultBaseUrl: "https://api.openai.com/v1", envKey: "OPENAI_API_KEY", official: true },
  { id: "anthropic", name: "Anthropic", defaultBaseUrl: "https://api.anthropic.com/v1", envKey: "ANTHROPIC_API_KEY", official: true },
  { id: "google", name: "Google", defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta", envKey: "GOOGLE_API_KEY", official: true },
  { id: "deepseek", name: "DeepSeek", defaultBaseUrl: "https://api.deepseek.com/v1", envKey: "DEEPSEEK_API_KEY", official: true },
  { id: "mistral", name: "Mistral", defaultBaseUrl: "https://api.mistral.ai/v1", envKey: "MISTRAL_API_KEY", official: true },
  { id: "groq", name: "Groq", defaultBaseUrl: "https://api.groq.com/openai/v1", envKey: "GROQ_API_KEY", official: true },
  { id: "xai", name: "xAI", defaultBaseUrl: "https://api.x.ai/v1", envKey: "XAI_API_KEY", official: true },
  { id: "openrouter", name: "OpenRouter", defaultBaseUrl: "https://openrouter.ai/api/v1", envKey: "OPENROUTER_API_KEY", official: false },
  { id: "together", name: "Together", defaultBaseUrl: "https://api.together.xyz/v1", envKey: "TOGETHER_API_KEY", official: false },
  { id: "moonshotai-cn", name: "Moonshot", defaultBaseUrl: "https://api.moonshot.cn/v1", envKey: "MOONSHOT_API_KEY", official: false },
  { id: "openai-compatible", name: "OpenAI Compatible", defaultBaseUrl: "https://api.openai.com/v1", envKey: "OPENAI_API_KEY", official: false },
];

export function getLlmProvider(id: string): LlmProvider | undefined {
  return LLM_PROVIDERS.find((p) => p.id === id);
}

const PROVIDER_DOMAIN_MAP: Array<[RegExp, string]> = [
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

/**
 * 根据显式 provider 或 baseUrl 推断供应商。
 * 无法识别时返回 openai-compatible，用于 Vercel AI SDK openai-compatible 兜底。
 */
export function inferLlmProvider(baseUrl: string, explicitProvider?: string): string {
  if (explicitProvider?.trim()) return explicitProvider.trim();
  for (const [pattern, provider] of PROVIDER_DOMAIN_MAP) {
    if (pattern.test(baseUrl)) return provider;
  }
  return "openai-compatible";
}

export function parseLlmModels(raw: string | undefined): LlmModelConfig[] {
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.filter((m): m is LlmModelConfig => {
      if (!m || typeof m !== "object") return false;
      const v = m as Record<string, unknown>;
      return (
        typeof v.id === "string" &&
        typeof v.name === "string" &&
        typeof v.baseUrl === "string" &&
        typeof v.provider === "string" &&
        (v.category === "llm" || v.category === "embedding" || v.category === "voice")
      );
    });
  } catch {
    return [];
  }
}

export function hasDefaultLlm(models: LlmModelConfig[]): boolean {
  return models.some((m) => m.category === "llm" && m.isDefault === true);
}
