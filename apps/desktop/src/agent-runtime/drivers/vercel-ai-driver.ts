import type { AgentDriver, AgentDriverChunk, AgentDriverInput, AgentMessage } from "@owl-os/core";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { generateText, jsonSchema, streamText, tool, type LanguageModel } from "ai";

/**
 * 将 pi-agent-core 的 AgentTool 转换为 Vercel AI SDK 的 tool。
 * pi-ai 的 Type.Object 本身即 JSON Schema，可直接作为 jsonSchema 输入。
 */
function convertTool(piTool: AgentTool) {
  return tool({
    description: piTool.description,
    inputSchema: jsonSchema(piTool.parameters as Parameters<typeof jsonSchema>[0]),
    execute: async (input) => {
      const result = await piTool.execute("vercel-ai", input);
      return result;
    },
  });
}

function formatMessagePayload(payload: unknown): string {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (typeof record.text === "string") return record.text;
    if (record.task && typeof record.task === "object") {
      const task = record.task as Record<string, unknown>;
      if (typeof task.instruction === "string") return task.instruction;
    }
  }
  if (typeof payload === "string") return payload;
  return JSON.stringify(payload);
}

function buildMessages(input: AgentDriverInput, fallbackSystemPrompt?: string): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  const systemPrompt = input.systemPrompt ?? fallbackSystemPrompt;
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }

  for (const message of input.messages) {
    const text = formatMessagePayload(message.payload);
    if (message.kind === "response") {
      messages.push({ role: "assistant", content: text });
    } else {
      messages.push({ role: "user", content: text });
    }
  }

  return messages;
}

export interface VercelAiDriverOptions {
  model: LanguageModel;
  systemPrompt?: string;
  tools?: AgentTool[];
}

/**
 * 基于 Vercel AI SDK 的 AgentDriver 实现。
 * 支持流式文本、reasoning 片段与 tool 事件透传。
 */
export class VercelAiDriver implements AgentDriver {
  private abortController?: AbortController;

  constructor(private readonly options: VercelAiDriverOptions) {}

  async *streamChat(input: AgentDriverInput): AsyncIterable<AgentDriverChunk> {
    this.abortController = new AbortController();
    const tools = this.options.tools?.length ? Object.fromEntries(this.options.tools.map((t) => [t.name, convertTool(t)])) : undefined;

    try {
      const result = streamText({
        model: this.options.model,
        messages: buildMessages(input, this.options.systemPrompt),
        tools,
        abortSignal: this.abortController.signal,
      });

      for await (const part of result.fullStream) {
        switch (part.type) {
          case "text-delta":
            yield { type: "text_delta", text: part.text };
            break;
          case "reasoning-delta":
            yield { type: "reasoning_delta", text: part.text };
            break;
          case "tool-call":
          case "tool-result":
          case "tool-error":
            yield { type: "tool_event", event: part };
            break;
          case "error":
            yield { type: "error", error: String(part.error) };
            break;
          case "finish":
            break;
        }
      }
      yield { type: "done" };
    } catch (error: unknown) {
      yield { type: "error", error: error instanceof Error ? error.message : String(error) };
      yield { type: "done" };
    }
  }

  async send(message: AgentMessage): Promise<void> {
    await generateText({
      model: this.options.model,
      messages: [{ role: "user", content: formatMessagePayload(message.payload) }],
    });
  }

  async *receive(): AsyncIterable<AgentMessage> {
    // Vercel AI SDK 的对话通过 streamChat 一次完成，无需独立 receive 循环。
  }

  async abort(): Promise<void> {
    this.abortController?.abort();
  }
}
