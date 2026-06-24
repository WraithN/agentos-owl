import { describe, expect, it } from "vitest";
import { getLlmProvider, hasDefaultLlm, inferLlmProvider, parseLlmModels } from "../llm-providers.js";

describe("llm-providers", () => {
  describe("getLlmProvider", () => {
    it("returns metadata for known providers", () => {
      expect(getLlmProvider("openai")?.name).toBe("OpenAI");
      expect(getLlmProvider("deepseek")?.envKey).toBe("DEEPSEEK_API_KEY");
    });

    it("returns undefined for unknown provider", () => {
      expect(getLlmProvider("unknown")).toBeUndefined();
    });
  });

  describe("inferLlmProvider", () => {
    it("returns explicit provider when set", () => {
      expect(inferLlmProvider("https://api.openai.com/v1", "deepseek")).toBe("deepseek");
    });

    it("infers provider from baseUrl", () => {
      expect(inferLlmProvider("https://api.anthropic.com/v1", "")).toBe("anthropic");
      expect(inferLlmProvider("https://api.deepseek.com/v1", "")).toBe("deepseek");
      expect(inferLlmProvider("https://openrouter.ai/api/v1", "")).toBe("openrouter");
    });

    it("falls back to openai-compatible", () => {
      expect(inferLlmProvider("https://example.com/v1", "")).toBe("openai-compatible");
    });
  });

  describe("parseLlmModels", () => {
    it("parses valid model list", () => {
      const models = parseLlmModels(
        JSON.stringify([
          { id: "gpt-4o", name: "GPT-4o", baseUrl: "https://api.openai.com/v1", provider: "openai", category: "llm", isDefault: true },
        ]),
      );
      expect(models).toHaveLength(1);
      expect(models[0]?.provider).toBe("openai");
      expect(models[0]?.isDefault).toBe(true);
    });

    it("rejects models without required provider", () => {
      const models = parseLlmModels(
        JSON.stringify([{ id: "x", name: "x", baseUrl: "https://api.openai.com/v1", category: "llm" }]),
      );
      expect(models).toHaveLength(0);
    });

    it("returns empty array for invalid JSON", () => {
      expect(parseLlmModels("not-json")).toHaveLength(0);
      expect(parseLlmModels(undefined)).toHaveLength(0);
    });
  });

  describe("hasDefaultLlm", () => {
    it("returns true when a llm model is default", () => {
      expect(
        hasDefaultLlm([
          { id: "x", name: "x", baseUrl: "", provider: "openai", category: "llm", isDefault: true },
        ]),
      ).toBe(true);
    });

    it("returns false when no default llm", () => {
      expect(
        hasDefaultLlm([
          { id: "x", name: "x", baseUrl: "", provider: "openai", category: "llm" },
          { id: "y", name: "y", baseUrl: "", provider: "openai", category: "embedding", isDefault: true },
        ]),
      ).toBe(false);
    });
  });
});
