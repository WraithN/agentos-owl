import { describe, expect, it } from "vitest";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import {
  renderElderReviewPrompt,
  renderPlannerInitialUserMessage,
  renderPlannerSystemPrompt,
  renderRevisionPrompt,
  renderValidationObservationPrompt,
  renderWorkerObservationPrompt,
} from "../prompt-builder.js";

const mockTools: AgentTool[] = [
  {
    name: "dispatch_task",
    label: "派发任务",
    description: "派发任务给 Worker。",
    parameters: { type: "object", properties: {} },
    execute: async () => ({ content: [{ type: "text", text: "" }], details: undefined }),
  },
];

describe("prompt-builder", () => {
  it("renderPlannerSystemPrompt injects tool descriptions into the template", () => {
    const prompt = renderPlannerSystemPrompt(mockTools);
    expect(prompt).toContain("# Sentinel: planner");
    expect(prompt).toContain("dispatch_task");
    expect(prompt).toContain("派发任务");
    expect(prompt).not.toContain("{{PLANNER_TOOLS}}");
  });

  it("renderPlannerInitialUserMessage includes user request, workers and round", () => {
    const prompt = renderPlannerInitialUserMessage("写一份年报", ["researcher", "writer"], 1);
    expect(prompt).toContain("用户需求：写一份年报");
    expect(prompt).toContain("可用 Worker：researcher、writer");
    expect(prompt).toContain("当前轮次：1");
    expect(prompt).toContain("recruit_workers");
    expect(prompt).toContain("dispatch_task");
  });

  it("renderPlannerInitialUserMessage appends previous round history", () => {
    const prompt = renderPlannerInitialUserMessage("写一份年报", ["writer"], 2, ["轮次 1 反馈：补充财务数据"]);
    expect(prompt).toContain("## 前序轮次历史");
    expect(prompt).toContain("轮次 1 反馈：补充财务数据");
  });

  it("renderWorkerObservationPrompt includes stage, title and output", () => {
    const prompt = renderWorkerObservationPrompt(1, "researcher", "研究结果");
    expect(prompt).toContain("阶段 1");
    expect(prompt).toContain("researcher");
    expect(prompt).toContain("研究结果");
    expect(prompt).toContain("validate_output");
  });

  it("renderValidationObservationPrompt instructs next step when passed", () => {
    const prompt = renderValidationObservationPrompt("researcher", true, "符合要求");
    expect(prompt).toContain("通过");
    expect(prompt).toContain("继续下一阶段");
  });

  it("renderValidationObservationPrompt asks for revision when failed", () => {
    const prompt = renderValidationObservationPrompt("writer", false, "缺少数据来源");
    expect(prompt).toContain("未通过");
    expect(prompt).toContain("重新调用 dispatch_task");
  });

  it("renderRevisionPrompt includes feedback and history", () => {
    const prompt = renderRevisionPrompt("写一份年报", "补充财务数据", 2, ["轮次 1 反馈：补充财务数据"]);
    expect(prompt).toContain("原始用户需求：写一份年报");
    expect(prompt).toContain("本轮修改意见：补充财务数据");
    expect(prompt).toContain("第 2 轮修订");
    expect(prompt).toContain("前序轮次历史");
  });

  it("renderElderReviewPrompt contains the review marker format", () => {
    const prompt = renderElderReviewPrompt("写一份年报", "年报草案", 1, []);
    expect(prompt).toContain("原始用户需求：写一份年报");
    expect(prompt).toContain("年报草案");
    expect(prompt).toContain("[[评审：满足");
    expect(prompt).toContain("[[评审：不满足");
  });
});
