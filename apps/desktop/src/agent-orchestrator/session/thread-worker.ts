import type { MessagePort } from "worker_threads";
import { parentPort } from "worker_threads";
import type { LlmConfig } from "../../agent-runtime/llm-config.js";
import { AgentOrchestrator } from "./orchestrator.js";
import { createRuntimePortFromMessagePort } from "./port-types.js";

interface WorkerInitMessage {
  sessionId: string;
  port: MessagePort;
  llmConfig: LlmConfig;
  agentNames?: Record<string, string>;
}

function reportError(context: string, error: unknown): void {
  const message = error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : String(error);
  console.error(`[worker] ${context}: ${message}`);
  parentPort?.postMessage({ type: "worker_fatal", error: message });
}

process.on("uncaughtException", (error) => reportError("uncaughtException", error));
process.on("unhandledRejection", (reason) => reportError("unhandledRejection", reason));

parentPort?.once("message", (init: WorkerInitMessage) => {
  try {
    const port = createRuntimePortFromMessagePort(init.port);
    const runtime = new AgentOrchestrator({
      sessionId: init.sessionId,
      llmConfig: init.llmConfig,
      agentNames: init.agentNames,
      port,
    });
    runtime.run();
  } catch (error) {
    reportError("failed to start runtime", error);
    throw error;
  }
});
