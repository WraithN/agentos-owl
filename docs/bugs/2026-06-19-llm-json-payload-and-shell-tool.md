# LLM 输出 JSON 前缀、重复用户输入并执行无关 shell 命令

## Phenomenon

用户发送消息（如「使用 brainstorm 帮我写一份海外独立站建站方案的调研报告，要有优劣分析，300字」）后，AI 回复出现以下异常：

1. 助手消息开头出现 JSON 片段：`{"text":"使用brainstorm帮我写一份海外独立站建站方案的调研报告..."}`。
2. JSON 问题修复后，AI 第一行仍然重复用户输入原文，随后才进入正题：
   ```text
   使用brainstorm帮我写一份海外独立站建站方案的调研报告，要有优劣分析，300字海外独立站建站方案调研报告
   ```
3. 回复内容并非针对用户请求撰写报告，而是输出 `先查看一下当前可用的Agent团队配置`，随后执行多条 shell 命令，例如：
   - `find /Users/v -maxdepth 2 -type d -name "brainstorm" 2>/dev/null`
   - `which brainstorm 2>/dev/null`
   - `ls /Users/v/Code/ 2>/dev/null`
4. shell 命令的真实输出（目录列表）被直接展示在聊天界面中，与用户指令完全无关。

## Root Cause

### 1. JSON 前缀：PromptCompiler 把消息 payload 序列化为 JSON

`apps/desktop/src/agent/drivers/PiAgentDriver.ts` 中的 `DefaultPromptCompiler` 将每条 `AgentMessage.payload` 用 `JSON.stringify` 拼接进 LLM prompt：

```ts
const messages = input.messages.map((message) => JSON.stringify(message.payload)).join("\n");
```

而 `Owlery` 发送的用户消息 payload 是 `{ text: "用户输入" }`，因此 LLM 看到的用户 turn 是原始 JSON `{"text":"..."}`。模型从上下文中学会了以同样格式开头回复，导致 UI 出现 JSON blob。

### 2. 重复用户输入：system prompt 被重复拼接到 user turn

`DefaultPromptCompiler` 在构造最终 prompt 时，把 `input.systemPrompt` 也拼接了进去：

```ts
return [input.systemPrompt, messages, input.context ? JSON.stringify(input.context) : undefined]
  .filter((part): part is string => Boolean(part))
  .join("\n\n");
```

但 `createPlainAgent` 创建 `pi-agent-core` 的 `Agent` 时，已经把 `systemPrompt` 放到 `initialState.systemPrompt` 中。`Agent.prompt()` 接收的文本会被当作 user turn。结果 LLM 实际看到：

- system role：`boss_agent.md` 全文
- user role：`boss_agent.md` 全文 + 用户消息 + context

system prompt 在 user turn 里重复出现，导致模型 confused，开头先复述一遍用户输入，然后才尝试响应。

### 3. 执行 shell 命令：Elder/Boss Agent 被默认赋予了 coding 工具集

`apps/desktop/src/agent/agent.ts` 的 `createPlainAgent` 在 `options.tools` 未提供时，默认调用 `buildTools(sessionId)`，其中包含 `execute_command`、`read_file`、`write_file`、`list_directory` 等工具。

`apps/desktop/src/agent/owleryRuntime.ts` 创建 Elder（Boss）Agent 时未覆盖 `tools`，因此负责「只对话、只委派」的老板 Agent 反而拥有了直接执行 shell 命令的能力。当用户输入被识别为可能需要文件/工具知识时，LLM 调用 `execute_command` 查找 `brainstorm` 等关键词，而不是按 `boss_agent.md` 的规范委派给专业团队或直接回答。

## Solution

### 修复 1：从 payload 中提取自然语言文本

修改 `apps/desktop/src/agent/drivers/PiAgentDriver.ts`，新增 `formatMessagePayload` 辅助函数：

- 如果 payload 是 `{ text: string }`，返回 `text`。
- 如果 payload 是 `{ task: { instruction: string } }`，返回 `instruction`。
- 其他情况回退到字符串或 JSON。

同时把 `PiAgentDriver.send` 中的 `JSON.stringify(message.payload)` 也替换为 `formatMessagePayload(message.payload)`，避免 Agent 间通信出现同样问题。

### 修复 2：不再在 user turn 中重复拼接 systemPrompt

修改 `DefaultPromptCompiler.compile`，只保留 messages 和 context：

```ts
export class DefaultPromptCompiler implements PromptCompiler {
  compile(input: AgentDriverInput): string {
    const messages = input.messages.map((message) => formatMessagePayload(message.payload)).join("\n\n");
    return [messages, input.context ? JSON.stringify(input.context) : undefined]
      .filter((part): part is string => Boolean(part))
      .join("\n\n");
  }
}
```

system prompt 仍由 `createPlainAgent` 通过 `Agent.initialState.systemPrompt` 正确注入。

### 修复 3：Elder Agent 不携带工具

修改 `apps/desktop/src/agent/owleryRuntime.ts`，创建 Elder 角色时显式传入 `tools: []`：

```ts
return new PiAgentDriver(
  createPlainAgent(input.sessionId, 0, {
    systemPrompt,
    tools: input.role === "elder" ? [] : undefined,
  }),
);
```

这样 Boss Agent 只能对话和委派，不会直接调用 shell/file 工具。Worker / SubSentinel 仍可在后续通过各自工厂获得所需工具。

## Verification

- 运行 `pnpm lint` 通过（TypeScript / Biome / ast-grep / Tailwind / Vite build）。
- 实际验证需要在桌面端重新发起会话：用户输入应不再出现 JSON 前缀、不再重复用户原文，Elder Agent 不再执行 `find`/`which`/`ls` 等 shell 命令，而是按 `boss_agent.md` 规范直接回复或告知用户已委派团队。
