import { describe, expect, it } from "vitest";
import { PiAgentDriver, type PiAgentLike } from "../agent/drivers/PiAgentDriver.js";

type FakeEvent = Parameters<Parameters<PiAgentLike["subscribe"]>[0]>[0];

class FakePiAgent implements PiAgentLike {
  private readonly listeners = new Set<(event: FakeEvent) => void>();
  constructor(private readonly events: FakeEvent[] = [], private readonly error?: Error) {}

  subscribe(listener: (event: FakeEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async prompt(): Promise<void> {
    if (this.error) throw this.error;
    for (const event of this.events) {
      for (const listener of this.listeners) listener(event);
    }
  }

  abort(): void {}
}

async function collect(driver: PiAgentDriver) {
  const chunks = [];
  for await (const chunk of driver.streamChat({ sessionId: "s", agentId: "a", messages: [] })) {
    chunks.push(chunk);
  }
  return chunks;
}

describe("PiAgentDriver", () => {
  it("maps pi message updates to text deltas", async () => {
    const driver = new PiAgentDriver(new FakePiAgent([
      { type: "message_update", message: { content: "hel" } },
      { type: "message_update", message: { content: "hello" } },
      { type: "agent_end" },
    ]));

    await expect(collect(driver)).resolves.toEqual([
      { type: "text_delta", text: "hel" },
      { type: "text_delta", text: "lo" },
      { type: "done" },
    ]);
  });

  it("maps tool events", async () => {
    const event = { type: "tool_execution_start", toolName: "read_file" };
    const driver = new PiAgentDriver(new FakePiAgent([event, { type: "agent_end" }]));

    await expect(collect(driver)).resolves.toEqual([
      { type: "tool_event", event },
      { type: "done" },
    ]);
  });

  it("maps prompt errors", async () => {
    const driver = new PiAgentDriver(new FakePiAgent([], new Error("boom")));

    await expect(collect(driver)).resolves.toEqual([
      { type: "error", error: "boom" },
    ]);
  });
});
