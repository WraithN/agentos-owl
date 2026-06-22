import { mkdirSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import { SessionSlot } from "./SessionSlot.js";

const WAIT_TIMEOUT_MS = 500;
const WAIT_INTERVAL_MS = 10;

async function waitFor(predicate: () => boolean): Promise<void> {
  const startedAt = Date.now();
  while (!predicate()) {
    if (Date.now() - startedAt > WAIT_TIMEOUT_MS) return;
    await new Promise((resolve) => setTimeout(resolve, WAIT_INTERVAL_MS));
  }
}

function createThreadEntry(): string {
  const dir = path.join(tmpdir(), "owl-os-session-slot-test");
  mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `thread-entry-${Date.now()}.mjs`);
  writeFileSync(filePath, `
    import { parentPort } from "worker_threads";
    parentPort.once("message", ({ port }) => {
      port.on("message", (command) => {
        if (command.type === "start_chat") {
          port.postMessage({ type: "chunk", chunk: { type: "text_delta", text: command.userMessage } });
          port.postMessage({ type: "done" });
        }
        if (command.type === "stop") port.postMessage({ type: "done" });
        if (command.type === "get_status") port.postMessage({ type: "status", status: { sessionId: "session-a", teammateName: "测试团队", members: [] } });
      });
      port.start();
    });
  `);
  return filePath;
}

describe("SessionSlot", () => {
  it("spawns a session thread and routes runtime events", async () => {
    const slot = new SessionSlot({
      sessionId: "session-a",
      threadEntryPath: createThreadEntry(),
      llmConfig: { models: [], apiKey: "" },
    });
    const chunks: unknown[] = [];
    let doneCount = 0;
    slot.on("chunk", (chunk) => chunks.push(chunk));
    slot.on("done", () => {
      doneCount += 1;
    });

    await slot.spawn();
    slot.start("hello", "brainstorm");
    await waitFor(() => chunks.length === 1 && doneCount === 1);
    await slot.terminate();

    expect(chunks).toEqual([{ type: "text_delta", text: "hello" }]);
    expect(slot.outputBuffer).toEqual([]);
    expect(doneCount).toBe(1);
    expect(slot.runStatus).toBe("idle");
  });
});
