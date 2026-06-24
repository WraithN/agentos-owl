import { describe, expect, it } from "vitest";
import { createVercelLanguageModel, getEnvKeyForProvider, inferProvider, resolveModel } from "../provider-config.js";

describe("provider-config", () => {
  describe("inferProvider", () => {
    it("returns explicit provider when set", () => {
      expect(
        inferProvider({
          id: "x",
          name: "x",
          baseUrl: "https://api.openai.com/v1",
          provider: "deepseek",
          category: "llm",
        }),
      ).toBe("deepseek");
    });

    it("infers provider from baseUrl", () => {
      expect(
        inferProvider({ id: "x", name: "x", baseUrl: "https://api.anthropic.com", provider: "", category: "llm" }),
      ).toBe("anthropic");
      expect(
        inferProvider({ id: "x", name: "x", baseUrl: "https://api.openai.com/v1", provider: "", category: "llm" }),
      ).toBe("openai");
    });

    it("falls back to openai-compatible when unknown", () => {
      expect(
        inferProvider({ id: "x", name: "x", baseUrl: "https://example.com", provider: "", category: "llm" }),
      ).toBe("openai-compatible");
    });
  });

  describe("getEnvKeyForProvider", () => {
    it("returns known provider env keys", () => {
      expect(getEnvKeyForProvider("openai")).toBe("OPENAI_API_KEY");
      expect(getEnvKeyForProvider("anthropic")).toBe("ANTHROPIC_API_KEY");
    });

    it("returns uppercase fallback for unknown providers", () => {
      expect(getEnvKeyForProvider("custom-provider")).toBe("CUSTOM-PROVIDER_API_KEY");
    });
  });

  describe("createVercelLanguageModel", () => {
    it("creates openai model", () => {
      const model = createVercelLanguageModel("openai", "gpt-4o");
      expect(model).toBeDefined();
      expect(typeof model).toBe("object");
    });

    it("creates anthropic model", () => {
      const model = createVercelLanguageModel("anthropic", "claude-3-5-sonnet");
      expect(model).toBeDefined();
      expect(typeof model).toBe("object");
    });

    it("creates openrouter-compatible model", () => {
      const model = createVercelLanguageModel("openrouter", "openai/gpt-4o");
      expect(model).toBeDefined();
      expect(typeof model).toBe("object");
    });
  });

  describe("resolveModel (pi-ai)", () => {
    it("resolves known openai model", () => {
      const model = resolveModel("openai", "gpt-4o");
      expect(model.id).toBe("gpt-4o");
    });

    it("falls back to openai-compatible template for unknown provider", () => {
      const model = resolveModel("unknown", "custom-model");
      expect(model.id).toBe("custom-model");
      expect(model.api).toBe("openai-completions");
    });
  });
});
