/* Planner 自驱流水线各阶段 prompt 构建 */

const MAX_REVIEW_ROUNDS = 5;

export function buildPlannerInitialPrompt(
  userMessage: string,
  workerTitles: string[],
  round: number,
  previousRounds?: string[],
): string {
  const history = previousRounds?.length
    ? `\n\n## 前序轮次历史\n${previousRounds.join("\n\n---\n\n")}`
    : "";
  return `你是规划师（Planner），负责把用户需求拆解为可执行的流水线，并按顺序派发给 Worker 完成。

## 当前任务
用户需求：${userMessage}
当前轮次：${round}
可用 Worker：${workerTitles.join("、")}

## 工作流程
1. 先输出完整流水线规划表（阶段编号、阶段名称、输入依赖、阶段产出物、验收标准）。
2. 调用 recruit_workers 招募 researcher 和 writer。
3. 使用 dispatch_task 按顺序派发任务：
   - 阶段 1：派发给 researcher，要求其进行资料收集/研究，输出结构化研究成果。
   - 阶段 2：researcher 产出满足要求后，派发给 writer，要求其基于研究成果生成最终交付物（文档类任务必须生成 .docx）。
4. 每个阶段结束后，使用 validate_output 校验产出。
5. 全部完成后，使用 submit_to_elder 把最终成果提交给 Elder（老板）评审。

## 工具说明
- dispatch_task：{ workerTitle, stage, instruction, expectedOutput }
- validate_output：{ stage, output, criteria }
- submit_to_elder：{ finalOutput }

## 约束
- 禁止自己调用 read_file / list_directory / execute_command / create_docx。
- 必须等前一阶段 Worker 完成并校验通过后，再派发下一阶段。
- 默认把生成文件写到 /tmp。${history}

请开始制定计划并执行。`;
}

export function buildRevisionPrompt(
  originalUserMessage: string,
  feedback: string,
  round: number,
  previousRounds: string[],
): string {
  return `根据上一轮 Elder（老板）的反馈进行第 ${round} 轮修订。

原始用户需求：${originalUserMessage}
本轮修改意见：${feedback}

${previousRounds.length > 0 ? `## 前序轮次历史\n${previousRounds.join("\n\n---\n\n")}\n\n` : ""}请重新调用 dispatch_task 让对应 Worker 修正产出，必要时先让 researcher 补充研究，再让 writer 重新生成交付物。`;
}

export function buildValidationPrompt(stage: string, output: string, criteria: string[]): string {
  return `请校验以下 ${stage} 产出是否满足验收标准：

产出内容：
${output}

验收标准：
${criteria.map((c, i) => `${i + 1}. ${c}`).join("\n")}

如果满足，请回复「校验通过」并继续下一步；如果不满足，请回复「校验不通过：具体原因」并说明需要如何修正。`;
}

export function buildWorkerResultPrompt(workerTitle: string, output: string): string {
  return `你刚才派发了任务给 ${workerTitle}，执行结果如下：

${output}

请决定下一步：
- 如果结果满足要求，继续派发下一阶段任务（调用 dispatch_task）。
- 如果需要校验，调用 validate_output。
- 如果所有阶段完成，调用 submit_to_elder 提交最终成果。`;
}

export function buildElderReviewPrompt(
  userMessage: string,
  draft: string,
  round: number,
  previousRounds?: string[],
): string {
  const history = previousRounds?.length
    ? `\n\n## 前序轮次修改历史\n${previousRounds.join("\n\n---\n\n")}`
    : "";
  return `你是老板（Elder），负责最终面向用户。请基于以下工作成果判断用户目标是否满足。

用户需求：${userMessage}
当前轮次：${round} / ${MAX_REVIEW_ROUNDS}
工作成果：
${draft}${history}

请先给出内部评审结论，再给出面向用户的最终回复。

评审结论格式（必须包含）：[[评审：满足]] 或 [[评审：不满足，修改意见：请补充/修改 xxx]]
- 满足：直接面向用户输出最终结果，可以附带「是否还需要调整」的友好询问。
- 不满足：面向用户的回复中说明当前结果还有哪些不足，并给出修改意见；同时必须在回复中包含 [[评审：不满足，修改意见：...]] 标记。

注意：最多进行 ${MAX_REVIEW_ROUNDS} 轮修改。`;
}
