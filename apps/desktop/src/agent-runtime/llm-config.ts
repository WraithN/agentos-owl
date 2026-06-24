import type { LlmModelConfig } from "@owl-os/core";
import { parseLlmModels } from "@owl-os/core";
import { getDatabase } from "../db/connection.js";
import * as queries from "../db/queries/index.js";
import { getSecret } from "../utils/crypto/secrets.js";

export interface LlmConfig {
  models: LlmModelConfig[];
  apiKey: string;
}

export function readLlmConfig(): LlmConfig {
  const db = getDatabase();
  const raw = queries.getSetting(db, "llmModels");
  const models = parseLlmModels(raw);
  const defaultModel = models.find((m) => m.category === "llm" && m.isDefault === true);
  const apiKey = defaultModel ? getSecret(`llm_model_key/${defaultModel.id}`) ?? "" : "";
  return { models, apiKey };
}
