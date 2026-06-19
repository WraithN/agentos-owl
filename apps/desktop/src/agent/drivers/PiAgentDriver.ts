import type { AgentDriver, AgentDriverChunk, AgentDriverInput, AgentMessage } from "@owl-os/core";
import { AsyncQueue } from "./AsyncQueue.js";

type PiAgentEvent = {
  type?: string;
  message?: {
    content?: string | Array<{ type?: string; text?: string; thinking?: string }>;
  };
  [key: string]: unknown;
};

export interface PiAgentLike {
  subscribe(listener: (event: unknown) => void): void | (() => void);
  prompt(text: string): Promise<void>;
  abort(): void;
}

export interface PromptCompiler {
  compile(input: AgentDriverInput): string;
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

export class DefaultPromptCompiler implements PromptCompiler {
  compile(input: AgentDriverInput): string {
    const messages = input.messages.map((message) => formatMessagePayload(message.payload)).join("\n\n");
    // systemPrompt 已由 createPlainAgent 设置到 Agent 的 initialState，
    // 这里不再重复拼接，避免 system prompt 在 user turn 中出现两次。
    return [messages, input.context ? JSON.stringify(input.context) : undefined]
      .filter((part): part is string => Boolean(part))
      .join("\n\n");
  }
}

export class PiAgentDriver implements AgentDriver {
  constructor(
    private readonly agent: PiAgentLike,
    private readonly promptCompiler: PromptCompiler = new DefaultPromptCompiler(),
  ) {}

  async *streamChat(input: AgentDriverInput): AsyncIterable<AgentDriverChunk> {
    const queue = new AsyncQueue<AgentDriverChunk>();
    let finished = false;
    let lastText = "";
    let lastReasoning = "";
    const finish = (chunk: AgentDriverChunk = { type: "done" }) => {
      if (finished) return;
      finished = true;
      queue.push(chunk);
      queue.close();
    };
    const unsubscribe = this.agent.subscribe((event) => {
      const chunk = mapPiEventToDriverChunk(event as PiAgentEvent, { lastText, lastReasoning });
      if (!chunk) return;
      if (chunk.type === "text_delta") lastText += chunk.text;
      if (chunk.type === "reasoning_delta") lastReasoning += chunk.text;
      if (chunk.type === "done") finish(chunk);
      else queue.push(chunk);
    });

    this.agent.prompt(this.promptCompiler.compile(input))
      .then(() => finish())
      .catch((error: unknown) => finish({ type: "error", error: error instanceof Error ? error.message : String(error) }))
      .finally(() => {
        if (typeof unsubscribe === "function") unsubscribe();
      });

    yield* queue;
  }

  async send(message: AgentMessage): Promise<void> {
    await this.agent.prompt(formatMessagePayload(message.payload));
  }

  async *receive(): AsyncIterable<AgentMessage> {}

  async abort(): Promise<void> {
    this.agent.abort();
  }
}

function mapPiEventToDriverChunk(event: PiAgentEvent, state: { lastText: string; lastReasoning: string }): AgentDriverChunk | null {
  if (event.type === "agent_end") return { type: "done" };
  if (event.type === "tool_execution_start" || event.type === "tool_execution_update" || event.type === "tool_execution_end") {
    return { type: "tool_event", event };
  }
  if (event.type !== "message_update" && event.type !== "message_end") return null;
  const text = extractContent(event.message?.content, "text");
  if (text.length > state.lastText.length) {
    return { type: "text_delta", text: text.slice(state.lastText.length) };
  }
  const reasoning = extractContent(event.message?.content, "reasoning");
  if (reasoning.length > state.lastReasoning.length) {
    return { type: "reasoning_delta", text: reasoning.slice(state.lastReasoning.length) };
  }
  return null;
}

function extractContent(content: NonNullable<PiAgentEvent["message"]>["content"], kind: "text" | "reasoning"): string {
  if (typeof content === "string") return kind === "text" ? content : "";
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (kind === "text" && part.type === "text") return part.text ?? "";
      if (kind === "reasoning" && part.type === "thinking") return part.thinking ?? "";
      return "";
    })
    .join("");
}
