import { Owlery } from "@owl-os/core";
import { createOwleryAgentFactory } from "./owleryAgentFactory.js";

// 兼容 IPC 回退路径：在主线程内运行，可直接访问数据库读取 LLM 配置
export const owlery = new Owlery({
  agentFactory: createOwleryAgentFactory(),
});

// WebSocket Owlery 由 main.ts 创建后注册到这里；ipc/settings.ts 通过 notifyLlmConfigUpdate()
// 触发配置同步，而无需直接依赖 WebSocket Owlery 的类型。
let webSocketOwleryRef: { updateLlmConfig(): void } | undefined;

export function setWebSocketOwleryRef(ref: { updateLlmConfig(): void }): void {
  webSocketOwleryRef = ref;
}

export function notifyLlmConfigUpdate(): void {
  webSocketOwleryRef?.updateLlmConfig();
}
