import { AgentWorkStatus } from "@owl-os/core";
import type { AgentMessage, AgentRuntime, AgentTask } from "@owl-os/core";
import { BaseAgentRunner } from "./base-agent-runner.js";
import type { SessionChannel } from "../session/session-channel.js";
import type { SentinelAgentRunner } from "./sentinel-agent-runner.js";
import { renderElderReviewPrompt, renderRevisionPrompt } from "./tools/prompt-builder.js";
import type { SessionRuntimeEvent } from "../session/port-types.js";

const MAX_REVIEW_ROUNDS = 5;

export interface ElderAgentRunnerDeps {
  createSentinel: (title: string) => SentinelAgentRunner;
  postEvent: (event: SessionRuntimeEvent) => void;
}

export interface ElderReviewResult {
  satisfied: boolean;
  finalText: string;
  feedback?: string;
}

/**
 * ElderAgentRunner：会话内业务最高决策者。
 * - 接收用户原始请求
 * - 若未指定 mode，则通过 LLM + recruit_sentinel 工具选择 Sentinel
 * - 招募 Sentinel 并委托任务
 * - 对 Sentinel 返回的结果做最终评审，输出给用户
 */
export class ElderAgentRunner extends BaseAgentRunner {
  private readonly sentinels = new Map<string, SentinelAgentRunner>();
  private readonly reviewHistories: string[] = [];

  constructor(
    agent: AgentRuntime,
    sessionChannel: SessionChannel,
    private readonly deps: ElderAgentRunnerDeps,
  ) {
    super(agent, sessionChannel);
  }

  protected createMessage(task: AgentTask): AgentMessage {
    return {
      id: `${task.id}:elder`,
      from: "system",
      to: this.id,
      sessionId: task.sessionId,
      kind: "request",
      payload: { task },
      createdAt: Date.now(),
    };
  }

  protected async handleMessage(message: AgentMessage): Promise<void> {
    const task = (message.payload as { task?: AgentTask }).task;
    if (!task) return;

    this.emitStatus(AgentWorkStatus.IN_PROGRESS, task.instruction);

    try {
      const mode = (task.context as Record<string, unknown> | undefined)?.teammateMode as string | undefined;
      const routing = await this.routeTask(task.instruction, mode);

      // Elder 路由判断阶段的回复先透出：简单任务直接回答，复杂任务告知用户已转交团队
      if (routing.text) {
        this.output({ type: "text_delta", text: routing.text });
      }

      // 未调用 recruit_sentinel 说明是简单任务，自治完成
      if (!routing.sentinelTitle) {
        this.sessionChannel.publish("session_done", { taskId: task.id, satisfied: true });
        this.emitStatus(AgentWorkStatus.COMPLETED);
        return;
      }

      const sentinel = this.deps.createSentinel(routing.sentinelTitle);
      this.sentinels.set(routing.sentinelTitle, sentinel);

      const finalReview = await this.runReviewLoop(task, sentinel);
      const finalText = finalReview.satisfied
        ? finalReview.finalText
        : `已尝试 ${MAX_REVIEW_ROUNDS} 轮仍无法完全满足需求。当前最佳结果：\n\n${finalReview.finalText}`;

      this.output({ type: "text_delta", text: finalText });
      this.sessionChannel.publish("session_done", { taskId: task.id, satisfied: finalReview.satisfied });
      this.emitStatus(AgentWorkStatus.COMPLETED);
    } catch (error) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.output({ type: "error", error: errorText });
      this.sessionChannel.publish("session_done", { taskId: task.id, error: errorText });
      this.emitStatus(AgentWorkStatus.FAILED, errorText);
    }
  }

  /**
   * Elder 多轮评审循环。
   * 每轮让 Sentinel 产出版本，Elder 评审；未通过则把反馈拼入 instruction 进入下一轮。
   */
  private async runReviewLoop(task: AgentTask, sentinel: SentinelAgentRunner): Promise<ElderReviewResult> {
    let currentInstruction = task.instruction;
    let finalReview: ElderReviewResult = { satisfied: false, finalText: "" };

    for (let round = 1; round <= MAX_REVIEW_ROUNDS; round++) {
      this.emitStatus(AgentWorkStatus.WAITING, "等待团队返回");
      const result = await sentinel.runStrategy({ ...task, instruction: currentInstruction });

      this.emitStatus(AgentWorkStatus.IN_PROGRESS, `正在对工作进行评审（轮次 ${round}）`);
      const review = await this.reviewWithElder(task.instruction, String(result ?? ""), round);
      finalReview = review;

      if (review.satisfied || round === MAX_REVIEW_ROUNDS) {
        break;
      }

      currentInstruction = renderRevisionPrompt(
        task.instruction,
        review.feedback ?? "",
        round + 1,
        this.reviewHistories,
      );
    }

    return finalReview;
  }

  /**
   * Elder 任务路由：判断简单自治还是复杂委派。
   * - 若用户已指定 mode，直接返回对应 Sentinel title。
   * - 否则让 Elder 自己判断：需要团队则调用 recruit_sentinel；简单任务直接回复。
   */
  private async routeTask(
    userMessage: string,
    mode?: string,
  ): Promise<{ text: string; sentinelTitle?: string }> {
    if (mode) {
      return {
        text: "这个任务涉及多步骤专业处理，我已经交给专业Agent团队完成，很快给你完整成果。",
        sentinelTitle: this.resolveSentinelTitleFromMode(mode),
      };
    }

    const prompt = [
      "你是业务最高决策者（Elder/老板）。请判断以下用户需求是否需要调用专业Agent团队。",
      "如果需要团队，请调用 recruit_sentinel 工具，参数为 { title: 'planner' | 'supervisor' | 'coordinator' | 'cto', reason: '选择原因' }。",
      "如果不需要团队（简单问答、闲聊、问候等），请直接回复用户，不要调用任何工具。",
      "",
      "用户需求：",
      userMessage,
    ].join("\n");

    const { text, toolEvents } = await this.runAgentTurn(
      {
        sessionId: this.getSessionId(),
        messages: [this.buildUserMessage(prompt)],
        context: undefined,
      },
      ["recruit_sentinel"],
    );

    for (const raw of toolEvents) {
      const event = raw as Record<string, unknown>;
      const toolName = String(event?.toolName ?? event?.name ?? "");
      if (toolName !== "recruit_sentinel") continue;
      const args = (event?.args ?? event?.result ?? {}) as Record<string, unknown>;
      const title = String(args?.title ?? "");
      if (title) return { text, sentinelTitle: this.resolveSentinelTitleFromMode(title) };
    }

    return { text };
  }

  private async reviewWithElder(userRequest: string, draft: string, round: number): Promise<ElderReviewResult> {
    const prompt = renderElderReviewPrompt(userRequest, draft, round, this.reviewHistories);
    const { text } = await this.runAgentTurn(
      {
        sessionId: this.getSessionId(),
        messages: [this.buildUserMessage(prompt)],
        context: undefined,
      },
      undefined,
    );

    const match = text.match(/\[\[评审：(满足|不满足)(?:，修改意见：([^\]]+))?\]\]/);
    const satisfied = match ? match[1] === "满足" : true;
    const feedback = match?.[2];
    const displayText = text.replace(/\[\[评审：[^\]]+\]\]/g, "").trim();

    if (feedback) {
      this.reviewHistories.push(`轮次 ${round} 反馈：${feedback}`);
    }

    return { satisfied, finalText: displayText || draft, feedback };
  }

  private getSessionId(): string {
    return this.agent.id.split(":")[0] ?? this.agent.id;
  }

  private buildUserMessage(text: string): AgentMessage {
    return {
      id: `${this.id}:${Date.now()}:user`,
      from: "user",
      to: this.id,
      sessionId: this.getSessionId(),
      kind: "request",
      payload: { text },
      createdAt: Date.now(),
    };
  }

  private resolveSentinelTitleFromMode(mode: string): string {
    const map: Record<string, string> = {
      pipeline: "planner",
      brainstorm: "coordinator",
      supervisor: "supervisor",
      hierarchy: "cto",
    };
    return map[mode] ?? "planner";
  }
}
