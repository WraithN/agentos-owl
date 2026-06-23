/* Planner 自驱顺序流水线 */
import type { AgentDriverChunk, AgentId, AgentRuntime } from "@owl-os/core";
import {
  buildElderReviewPrompt,
  buildPlannerInitialPrompt,
  buildRevisionPrompt,
  buildValidationPrompt,
  buildWorkerResultPrompt,
} from "./plannerPrompts.js";

const MAX_PLANNER_TURNS = 20;
const MAX_REVIEW_ROUNDS = 5;

export interface PlannerPipelineDeps {
  sessionId: string;
  streamAgent(agent: AgentRuntime, text: string, options?: { forwardText?: boolean }): Promise<string>;
  runAgentTurn(
    agent: AgentRuntime,
    promptText: string,
    options: { collectTools?: string[]; forwardText?: boolean },
  ): Promise<{ text: string; reasoning: string; toolEvents: unknown[] }>;
  emitAgentStatusCard(agent: AgentRuntime, text: string): void;
  emitTaskCard(taskId: string, round: number, stage: number, instruction: string, requestedBy: string, assigneeAgentId: AgentId): void;
  emitRoundCard(round: number, summary: string): void;
}

export interface PlannerResult {
  finalOutput: string;
  researcherOutput?: string;
  writerOutput?: string;
}

export interface ElderReviewResult {
  satisfied: boolean;
  finalText: string;
  feedback?: string;
}

export class PlannerPipeline {
  constructor(private readonly deps: PlannerPipelineDeps) {}

  async run(sentinel: AgentRuntime, workers: AgentRuntime[], userMessage: string, round: number): Promise<PlannerResult> {
    const workerByTitle = new Map(workers.map((w) => [w.title, w]));
    this.deps.emitRoundCard(round, `轮次 ${round} 开始`);

    let prompt = buildPlannerInitialPrompt(userMessage, workers.map((w) => w.title), round);
    let researcherOutput: string | undefined;
    let writerOutput: string | undefined;

    for (let turn = 1; turn <= MAX_PLANNER_TURNS; turn++) {
      const { text, toolEvents } = await this.deps.runAgentTurn(sentinel, prompt, {
        collectTools: ["dispatch_task", "validate_output", "submit_to_elder"],
      });

      if (toolEvents.length === 0) {
        return { finalOutput: text, researcherOutput, writerOutput };
      }

      for (const raw of toolEvents) {
        const event = raw as Record<string, unknown>;
        const toolName = String(event.toolName ?? event.name ?? "");
        const args = (event.args ?? event.result ?? {}) as Record<string, unknown>;

        if (toolName === "dispatch_task") {
          const workerTitle = String(args.workerTitle ?? "");
          const stage = Number(args.stage ?? 0);
          const instruction = String(args.instruction ?? "");
          const worker = workerByTitle.get(workerTitle);
          if (!worker) {
            prompt = `错误：不存在名为 ${workerTitle} 的 Worker。可用 Worker 为：${[...workerByTitle.keys()].join("、")}。请重新 dispatch_task。`;
            continue;
          }
          this.deps.emitTaskCard(`${round}-${stage}`, round, stage, instruction, "Planner", worker.id);
          this.deps.emitAgentStatusCard(worker, "工作中");
          const output = await this.deps.streamAgent(worker, instruction, { forwardText: false });
          this.deps.emitAgentStatusCard(worker, "已完成");
          if (workerTitle === "researcher") researcherOutput = output;
          if (workerTitle === "writer") writerOutput = output;
          prompt = buildWorkerResultPrompt(workerTitle, output);
        } else if (toolName === "validate_output") {
          const stage = String(args.stage ?? "");
          const output = String(args.output ?? "");
          const criteria = Array.isArray(args.criteria) ? args.criteria.map(String) : [];
          const validationPrompt = buildValidationPrompt(stage, output, criteria);
          const { text: validationText } = await this.deps.runAgentTurn(sentinel, validationPrompt, {});
          prompt = `校验结果：\n${validationText}\n\n请决定下一步。如果校验通过，继续下一阶段；如果不通过，请重新 dispatch_task 让对应 Worker 修正。`;
        } else if (toolName === "submit_to_elder") {
          const finalOutput = String(args.finalOutput ?? text);
          return { finalOutput, researcherOutput, writerOutput };
        }
      }
    }

    throw new Error("Planner 自驱轮次超过最大限制");
  }

  async reviewWithElder(
    elder: AgentRuntime,
    userMessage: string,
    draft: string,
    round: number,
    previousRounds: string[],
  ): Promise<ElderReviewResult> {
    const prompt = buildElderReviewPrompt(userMessage, draft, round, previousRounds);
    const { text } = await this.deps.runAgentTurn(elder, prompt, {});
    const match = text.match(/\[\[评审：(满足|不满足)(?:，修改意见：([^\]]+))?\]\]/);
    const satisfied = match ? match[1] === "满足" : true;
    const feedback = match?.[2];
    const displayText = text.replace(/\[\[评审：[^\]]+\]\]/g, "").trim();
    return { satisfied, finalText: displayText || draft, feedback };
  }

  buildRevisionPrompt(originalUserMessage: string, feedback: string, round: number, previousRounds: string[]): string {
    return buildRevisionPrompt(originalUserMessage, feedback, round, previousRounds);
  }
}

export { MAX_REVIEW_ROUNDS };
