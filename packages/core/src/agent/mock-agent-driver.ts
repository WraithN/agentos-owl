import type { AgentDriver } from "./agent-driver.js";
import type { AgentDriverChunk, AgentDriverInput, AgentMessage } from "./types.js";

export class MockAgentDriver implements AgentDriver {
  private readonly inbox: AgentMessage[] = [];
  private readonly sent: AgentMessage[] = [];
  private readonly inputs: AgentDriverInput[] = [];

  constructor(private readonly chunks: AgentDriverChunk[] = []) {}

  async *streamChat(input: AgentDriverInput): AsyncIterable<AgentDriverChunk> {
    this.inputs.push(input);
    for (const chunk of this.chunks) {
      yield chunk;
    }
  }

  async send(message: AgentMessage): Promise<void> {
    this.sent.push(message);
    this.inbox.push(message);
  }

  async *receive(): AsyncIterable<AgentMessage> {
    while (this.inbox.length > 0) {
      const message = this.inbox.shift();
      if (message) yield message;
    }
  }

  getSentMessages(): AgentMessage[] {
    return [...this.sent];
  }

  getStreamInputs(): AgentDriverInput[] {
    return [...this.inputs];
  }
}
