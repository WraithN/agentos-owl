import type { MessagePort } from "worker_threads";
import { parentPort } from "worker_threads";
import type { LlmConfig } from "../agent/llmConfig.js";
import { SessionRuntime } from "./SessionRuntime.js";
import { createRuntimePortFromMessagePort } from "./types.js";

interface WorkerInitMessage {
  sessionId: string;
  port: MessagePort;
  llmConfig: LlmConfig;
}

function reportError(context: string, error: unknown): void {
  const message = error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : String(error);
  console.error(`[worker] ${context}: ${message}`);
  // 通过 parentPort 把错误抛给主线程，便于主线程日志收集
  parentPort?.postMessage({ type: "worker_fatal", error: message });
}

process.on("uncaughtException", (error) => reportError("uncaughtException", error));
process.on("unhandledRejection", (reason) => reportError("unhandledRejection", reason));

// 数据库读写只在主线程进行；Worker 通过初始化消息和 update_config 命令接收 LLM 配置。
parentPort?.once("message", (init: WorkerInitMessage) => {
  try {
    const runtime = new SessionRuntime({
      sessionId: init.sessionId,
      llmConfig: init.llmConfig,
      port: createRuntimePortFromMessagePort(init.port),
    });
    runtime.run();
  } catch (error) {
    reportError("failed to start SessionRuntime", error);
    throw error;
  }
});
