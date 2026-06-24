import { ipcMain } from "electron";
import { getDatabase } from "../../db/connection.js";
import * as queries from "../../db/queries/index.js";

function getSettingString(key: string): string | undefined {
  return queries.getSetting(getDatabase(), key);
}

export function registerLlmHandlers(): void {
  ipcMain.handle("llm_chat", async (_event, request: { model?: string; messages: unknown[]; stream?: boolean }) => {
    const apiKey = getSettingString("llmApiKey") ?? "";
    const baseUrl = getSettingString("llmBaseUrl") ?? "https://api.openai.com/v1";
    const defaultModel = getSettingString("defaultModel") ?? "gpt-4o-mini";
    const model = request.model ?? defaultModel;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: request.messages,
        stream: request.stream ?? false,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM request failed: ${response.status}`);
    }

    return response.json();
  });
}
