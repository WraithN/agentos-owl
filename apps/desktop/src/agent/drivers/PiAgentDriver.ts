import type { AgentDriver, AgentDriverChunk, AgentDriverInput, AgentMessage } from "@owl-os/core";
import { AsyncQueue } from "./AsyncQueue.js";

type PiAgentEvent = {
  type?: string;
  message?: {
    role?: string;
    content?: string | Array<{ type?: string; text?: string; thinking?: string }>;
  };
  assistantMessageEvent?: unknown;
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
    const userMessage = input.messages.map((message) => formatMessagePayload(message.payload)).join("\n\n");
    // systemPrompt 已由 createPlainAgent 设置到 Agent 的 initialState，
    // 这里不再重复拼接，避免 system prompt 在 user turn 中出现两次。
    // 不添加显式 User/Assistant 角色标记，交给 pi-agent-core 的 Agent 自行处理角色；
    // 显式标记容易让某些模型在回复里复述用户输入，造成“AI 重复展示用户内容”。
    return [userMessage, input.context ? JSON.stringify(input.context) : undefined]
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
  // 只处理助手（assistant）消息的内容更新；用户/系统消息的事件（如 prompt 的 message_end）
  // 会被 Agent 库作为对话历史重新抛出，若误当成助手输出会导致 AI 复述用户输入。
  if (event.type === "message_update" && event.assistantMessageEvent === undefined) return null;
  if (event.type === "message_end" && event.message?.role !== "assistant") return null;
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
