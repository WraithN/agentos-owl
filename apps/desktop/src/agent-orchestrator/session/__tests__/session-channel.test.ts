import { describe, expect, it, vi } from "vitest";
import { SessionChannel } from "../session-channel.js";

describe("SessionChannel", () => {
  it("publishes and subscribes to topics", () => {
    const channel = new SessionChannel("session-a");
    const handler = vi.fn();
    channel.subscribe("test", handler);
    channel.publish("test", { data: 1 });
    expect(handler).toHaveBeenCalledWith({ data: 1 });
  });

  it("unsubscribes cleanly", () => {
    const channel = new SessionChannel("session-a");
    const handler = vi.fn();
    const unsubscribe = channel.subscribe("test", handler);
    unsubscribe();
    channel.publish("test", { data: 1 });
    expect(handler).not.toHaveBeenCalled();
  });

  it("emits output events", () => {
    const channel = new SessionChannel("session-a");
    const handler = vi.fn();
    channel.subscribe("output", handler);
    channel.emitOutput(
      { agentId: "a1", agentName: "Boss", role: "elder", title: "boss" },
      { type: "text_delta", text: "hello" },
    );
    expect(handler).toHaveBeenCalled();
    const payload = handler.mock.calls[0][0] as { agentInfo: { agentId: string }; content: { type: string } };
    expect(payload.agentInfo.agentId).toBe("a1");
    expect(payload.content.type).toBe("text_delta");
  });

  it("emits task events", () => {
    const channel = new SessionChannel("session-a");
    const handler = vi.fn();
    channel.subscribe("task_event", handler);
    channel.emitTaskEvent({ type: "created", taskId: "t1" });
    expect(handler).toHaveBeenCalledWith({ type: "created", taskId: "t1" });
  });
});
