import { mkdirSync, writeFileSync } from "fs";
import { createServer } from "http";
import { tmpdir } from "os";
import path from "path";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Owlery } from "../Owlery.js";

const WAIT_TIMEOUT_MS = 1_000;
const WAIT_INTERVAL_MS = 10;
const TEST_SESSION_ID = "test-session-1";
const TEST_MESSAGE = "hello";

async function waitFor(predicate: () => boolean): Promise<void> {
  const startedAt = Date.now();
  while (!predicate()) {
    if (Date.now() - startedAt > WAIT_TIMEOUT_MS) return;
    await new Promise((resolve) => setTimeout(resolve, WAIT_INTERVAL_MS));
  }
}

async function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("无法获取测试端口")));
        return;
      }
      server.close(() => resolve(address.port));
    });
  });
}

function createThreadEntry(): string {
  const dir = path.join(tmpdir(), "owl-os-owlery-integration-test");
  mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `thread-entry-${Date.now()}.mjs`);
  writeFileSync(
    filePath,
    `
      import { parentPort } from "worker_threads";
      parentPort.once("message", ({ sessionId, port }) => {
        port.on("message", (command) => {
          if (command.type === "start_chat") {
            port.postMessage({ type: "status", status: { sessionId, teammateName: "测试团队", members: [] } });
            port.postMessage({ type: "chunk", chunk: { type: "text_delta", text: command.userMessage } });
            port.postMessage({ type: "done" });
          }
        });
        port.start();
      });
    `,
  );
  return filePath;
}

function openWebSocket(url: string): Promise<WebSocket> {
  const socket = new WebSocket(url);
  return new Promise((resolve, reject) => {
    socket.once("open", () => resolve(socket));
    socket.once("error", reject);
  });
}

describe("Owlery WebSocket integration", () => {
  let owlery: Owlery;
  let port: number;

  beforeAll(async () => {
    port = await getAvailablePort();
    owlery = new Owlery({ webSocketPort: port, threadEntryPath: createThreadEntry(), llmConfig: { models: [], apiKey: "" } });
  });

  afterAll(async () => {
    await owlery.close();
  });

  it("accepts WebSocket start_chat and broadcasts chunk/status", async () => {
    const sessionWs = await openWebSocket(`ws://127.0.0.1:${port}/session?sessionId=${TEST_SESSION_ID}`);
    const statusWs = await openWebSocket(`ws://127.0.0.1:${port}/status?sessionId=${TEST_SESSION_ID}`);
    const chunks: unknown[] = [];
    const statuses: unknown[] = [];
    sessionWs.on("message", (data) => chunks.push(JSON.parse(data.toString())));
    statusWs.on("message", (data) => statuses.push(JSON.parse(data.toString())));

    sessionWs.send(JSON.stringify({ type: "start_chat", payload: { userMessage: TEST_MESSAGE, teammateMode: "brainstorm" } }));
    await waitFor(() => chunks.length > 0 && statuses.length > 0);
    sessionWs.close();
    statusWs.close();

    expect(chunks).toContainEqual({ type: "chunk", sessionId: TEST_SESSION_ID, payload: { type: "text_delta", text: TEST_MESSAGE } });
    expect(statuses).toContainEqual({
      type: "status",
      sessionId: TEST_SESSION_ID,
      payload: { sessionId: TEST_SESSION_ID, teammateName: "测试团队", members: [] },
    });
  });
});
