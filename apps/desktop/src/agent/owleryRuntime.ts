import { AgentFactory, Owlery, fixedNameGenerator } from "@owl-os/core";
import type { AgentDriverFactory, AgentToolFactory } from "@owl-os/core";
import { createPlainAgent, hasDefaultLlm, loadSystemPrompt, NoDefaultLlmError } from "./agent.js";
import { PiAgentDriver } from "./drivers/PiAgentDriver.js";

const driverFactory: AgentDriverFactory = (input) => {
  if (!hasDefaultLlm()) throw new NoDefaultLlmError();
  const systemPrompt = input.role === "elder"
    ? loadSystemPrompt("boss_agent")
    : `你是 ${input.title}，负责在 Agent 团队中完成 ${input.role} 职责。`;
  return new PiAgentDriver(
    createPlainAgent(input.sessionId, 0, {
      systemPrompt,
      tools: input.role === "elder" ? [] : undefined,
    }),
  );
};

const toolFactory: AgentToolFactory = (input) => {
  if (input.role !== "sentinel" || input.title !== "supervisor") return [];
  return [{ name: "recruit", description: "评估任务并招募当前 Teammate 的后续成员" }];
};

export const owlery = new Owlery({
  agentFactory: new AgentFactory({
    driverFactory,
    nameGenerator: fixedNameGenerator,
    toolFactory,
  }),
});
