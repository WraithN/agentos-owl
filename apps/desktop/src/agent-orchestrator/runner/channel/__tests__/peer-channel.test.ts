import { describe, expect, it, vi } from "vitest";
import { MessageBox } from "@owl-os/core";
import { PeerChannel } from "../peer-channel.js";

function createChannel(messageBox: MessageBox) {
  return messageBox.createChannel({
    sessionId: "session-a",
    endpointA: "parent",
    endpointB: "child",
  });
}

describe("PeerChannel", () => {
  it("sends typed messages to peer", async () => {
    const messageBox = new MessageBox();
    createChannel(messageBox);
    const parent = new PeerChannel(messageBox, "session-a:parent:child", "session-a", "parent", "child");
    const child = new PeerChannel(messageBox, "session-a:parent:child", "session-a", "child", "parent");

    const handler = vi.fn();
    child.on("dispatch", handler);

    await parent.send("dispatch", { taskId: "t1" });
    expect(handler).toHaveBeenCalledWith({ taskId: "t1" });
  });

  it("filters messages by type", async () => {
    const messageBox = new MessageBox();
    createChannel(messageBox);
    const parent = new PeerChannel(messageBox, "session-a:parent:child", "session-a", "parent", "child");
    const child = new PeerChannel(messageBox, "session-a:parent:child", "session-a", "child", "parent");

    const dispatchHandler = vi.fn();
    const otherHandler = vi.fn();
    child.on("dispatch", dispatchHandler);
    child.on("other", otherHandler);

    await parent.send("dispatch", { taskId: "t1" });
    expect(dispatchHandler).toHaveBeenCalledTimes(1);
    expect(otherHandler).not.toHaveBeenCalled();
  });

  it("cleans up subscriptions on destroy", async () => {
    const messageBox = new MessageBox();
    createChannel(messageBox);
    const parent = new PeerChannel(messageBox, "session-a:parent:child", "session-a", "parent", "child");
    const child = new PeerChannel(messageBox, "session-a:parent:child", "session-a", "child", "parent");

    const handler = vi.fn();
    child.on("dispatch", handler);
    child.destroy();

    await parent.send("dispatch", { taskId: "t1" });
    expect(handler).not.toHaveBeenCalled();
  });
});
