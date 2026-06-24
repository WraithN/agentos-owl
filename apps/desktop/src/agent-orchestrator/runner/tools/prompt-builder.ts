import type { AgentTool } from "@earendil-works/pi-agent-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolvePromptPathFrom } from "../../../agent-runtime/prompt-path.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PLANNER_TEMPLATE_FILE = "sentinel_planner.md";

interface TemplateValues {
  [key: string]: string;
}

/**
 * 读取 sentinel_planner.md 模板文件。
 * 使用基于当前文件位置的 prompt 路径解析，确保开发和打包环境都能定位到文件。
 */
export function loadPlannerTemplate(): string {
  const templatePath = resolvePromptPathFrom(__dirname, PLANNER_TEMPLATE_FILE);
  if (!templatePath) {
    throw new Error("未找到 sentinel_planner.md 模板文件");
  }
  return fs.readFileSync(templatePath, "utf-8").trim();
}

/**
 * 渲染 Planner Sentinel 的系统提示词。
 * 将可用工具列表格式化为 Markdown 后注入 {{PLANNER_TOOLS}} 占位符。
 */
export function renderPlannerSystemPrompt(tools: AgentTool[]): string {
  const template = loadPlannerTemplate();
  return replacePlaceholders(template, {
    PLANNER_TOOLS: formatToolsDescription(tools),
  });
}

/**
 * 渲染 Planner 的初始用户消息。
 * 包含用户需求、可用 Worker、当前轮次、前序历史等上下文。
 */
export function renderPlannerInitialUserMessage(
  userRequest: string,
  workerTitles: string[],
  round: number,
  previousRounds: string[] = [],
): string {
  const history = previousRounds.length > 0
    ? `\n\n## 前序轮次历史\n${previousRounds.join("\n\n---\n\n")}`
    : "";

  return `你是规划师（Planner），负责把用户需求拆解为可执行的流水线，并按顺序派发给 Worker 完成。

## 当前任务
用户需求：${userRequest}
当前轮次：${round}
可用 Worker：${workerTitles.join("、")}

## 工作流程
1. 先输出完整流水线规划表（阶段编号、阶段名称、输入依赖、阶段产出物、验收标准）。
2. 调用 recruit_workers 招募 researcher 和 writer。
3. 使用 dispatch_task 按顺序派发任务：
   - 阶段 1：派发给 researcher，要求其进行资料收集/研究，输出结构化研究成果。
   - 阶段 2：researcher 产出满足要求后，派发给 writer，要求其基于研究成果生成最终交付物（文档类任务必须调用 create_x_file 生成对应格式文件，如 .docx/.pdf/.pptx 等）。
4. 每个阶段结束后，使用 validate_output 校验产出。
5. 全部完成后，使用 submit_to_elder 把最终成果提交给 Elder（老板）评审。

## 约束
- 禁止自己调用 read_file / list_directory / execute_command / create_x_file。
- 必须等前一阶段 Worker 完成并校验通过后，再派发下一阶段。
- 默认把生成文件写到 ~/.config/owl-os/workspace/。${history}

请开始制定计划并执行。`;
}

/**
 * 把 Worker 执行结果格式化为发给 Planner 的 observation，驱动下一轮决策。
 */
export function renderWorkerObservationPrompt(stage: number, workerTitle: string, output: string): string {
  return `阶段 ${stage} 的 Worker \`${workerTitle}\` 已完成执行，产出如下：

---

${output}

---

请根据上述产出决定下一步：
- 如果产出满足要求，调用 validate_output 进行正式校验。
- 如果产出不满足要求，重新调用 dispatch_task 让该 Worker 修正。`;
}

/**
 * 把 validate_output 的校验结论格式化为 observation 发回 Planner。
 */
export function renderValidationObservationPrompt(
  stage: string,
  passed: boolean,
  feedback: string,
): string {
  const verdict = passed ? "通过" : "未通过";
  const nextAction = passed
    ? "校验已通过，请继续下一阶段：如果还有下一阶段则 dispatch_task，如果全部完成则 submit_to_elder。"
    : "校验未通过，请重新调用 dispatch_task 让对应 Worker 修正。";

  return `阶段 \`${stage}\` 的校验结果：${verdict}

评审意见：
${feedback}

${nextAction}`;
}

/**
 * Elder 反馈后的 revision prompt，用于开启新一轮 Planner 自驱。
 */
export function renderRevisionPrompt(
  originalUserRequest: string,
  feedback: string,
  round: number,
  previousRounds: string[],
): string {
  const history = previousRounds.length > 0
    ? `## 前序轮次历史\n${previousRounds.join("\n\n---\n\n")}\n\n`
    : "";

  return `根据上一轮 Elder（老板）的反馈进行第 ${round} 轮修订。

原始用户需求：${originalUserRequest}
本轮修改意见：${feedback}

${history}请重新调用 dispatch_task 让对应 Worker 修正产出，必要时先让 researcher 补充研究，再让 writer 重新生成交付物。`;
}

/**
 * Elder 评审 prompt，要求 Elder 输出带 [[评审：满足/不满足，修改意见：...]] 标记的结论。
 */
export function renderElderReviewPrompt(
  userRequest: string,
  draft: string,
  round: number,
  previousRounds: string[],
): string {
  const history = previousRounds.length > 0
    ? `\n\n## 前序轮次反馈\n${previousRounds.join("\n\n---\n\n")}`
    : "";

  return `你是 Elder（老板），负责对团队交付成果做最终评审。

原始用户需求：${userRequest}
当前评审轮次：${round}${history}

以下是 Planner 团队提交的草案：

---

${draft}

---

请判断该草案是否满足用户需求，并严格按照以下格式输出结论：
[[评审：满足，修改意见：（可选的表扬或补充说明）]]
或
[[评审：不满足，修改意见：（具体修改要求）]]

除上述标记外，你还需要输出一段面向用户的最终说明；如果评审为“满足”，这段说明将直接展示给用户。`;
}

function replacePlaceholders(template: string, values: TemplateValues): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, value),
    template,
  );
}

function formatToolsDescription(tools: AgentTool[]): string {
  if (tools.length === 0) return "（当前无可用工具）";

  return tools
    .map((tool, index) => {
      const params = tool.parameters
        ? `\n参数 schema：\n\`\`\`json\n${JSON.stringify(tool.parameters, null, 2)}\n\`\`\``
        : "";
      return `### ${index + 1}. \`${tool.name}\`（${tool.label ?? tool.name}）\n\n${tool.description}${params}`;
    })
    .join("\n\n");
}
