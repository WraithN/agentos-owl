/* Pi Agent 工具集 —— 复刻 coding agent 基础能力 */
import { Type } from "@earendil-works/pi-ai";
import type { AgentTool, AgentToolResult } from "@earendil-works/pi-agent-core";
import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolveWorkspacePath, getWorkspaceDir } from "./workspacePath.js";
import { writeXFile } from "./file-writers/index.js";
import type { WriteXFileParams } from "./file-writers/types.js";

const execFileAsync = promisify(execFile);

function textResult(text: string): AgentToolResult<unknown> {
  return {
    content: [{ type: "text", text }],
    details: undefined,
  };
}

function buildPlannerToolResult(text: string): AgentToolResult<unknown> {
  return {
    content: [{ type: "text", text }],
    details: undefined,
  };
}

export function buildPlannerTools(_sessionId: string): AgentTool[] {
  return [
    {
      name: "dispatch_task",
      label: "派发任务",
      description:
        "把子任务派发给指定 Worker。只允许派发给你已经招募的 Worker。参数：workerTitle（如 researcher/writer）、stage（阶段编号 1/2/...）、instruction（任务说明）、expectedOutput（期望产出，可选）。",
      parameters: Type.Object({
        workerTitle: Type.String(),
        stage: Type.Number(),
        instruction: Type.String(),
        expectedOutput: Type.Optional(Type.String()),
      }),
      execute: async (_id, params) => {
        const { workerTitle, stage, instruction } = params as {
          workerTitle: string;
          stage: number;
          instruction: string;
        };
        return buildPlannerToolResult(`[系统将派发任务] 阶段 ${stage} → ${workerTitle}\n任务说明：${instruction}`);
      },
    },
    {
      name: "validate_output",
      label: "校验产出",
      description:
        "校验上一阶段 Worker 的产出是否满足验收标准。参数：stage（阶段名，如 researcher/writer）、output（待校验产出）、criteria（验收标准数组）。",
      parameters: Type.Object({
        stage: Type.String(),
        output: Type.String(),
        criteria: Type.Array(Type.String()),
      }),
      execute: async (_id, params) => {
        const { stage, output, criteria } = params as {
          stage: string;
          output: string;
          criteria: string[];
        };
        return buildPlannerToolResult(
          `[系统请求校验] 阶段：${stage}\n产出：${output}\n验收标准：\n${criteria.map((c, i) => `${i + 1}. ${c}`).join("\n")}`
        );
      },
    },
    {
      name: "submit_to_elder",
      label: "提交给老板",
      description:
        "当所有阶段都完成并通过校验后，调用此工具把最终成果提交给 Elder（老板）做最终评审。参数：finalOutput（最终成果文本）。",
      parameters: Type.Object({
        finalOutput: Type.String(),
      }),
      execute: async (_id, params) => {
        const { finalOutput } = params as { finalOutput: string };
        return buildPlannerToolResult(`[系统将提交给 Elder]\n${finalOutput}`);
      },
    },
  ];
}

export function buildTools(_sessionId: string): AgentTool[] {
  return [
    {
      name: "read_file",
      label: "读取文件",
      description: "Read the contents of a file under the agent workspace. Relative paths are resolved under ~/.config/owl-os/workspace.",
      parameters: Type.Object({
        path: Type.String(),
      }),
      execute: async (_id, params) => {
        const { path } = params as { path: string };
        const resolved = resolveWorkspacePath(path);
        const text = await fs.readFile(resolved, "utf-8");
        return textResult(text);
      },
    },
    {
      name: "list_directory",
      label: "列出目录",
      description: "List files and directories under the agent workspace. Relative paths are resolved under ~/.config/owl-os/workspace.",
      parameters: Type.Object({
        path: Type.String(),
      }),
      execute: async (_id, params) => {
        const { path } = params as { path: string };
        const resolved = resolveWorkspacePath(path);
        const entries = await fs.readdir(resolved, { withFileTypes: true });
        const text = entries
          .map((e) => `${e.isDirectory() ? "[dir]" : "[file]"} ${e.name}`)
          .join("\n");
        return textResult(text);
      },
    },
    {
      name: "execute_command",
      label: "执行命令",
      description: "Execute a shell command under the agent workspace. Generated files should be written to the workspace.",
      parameters: Type.Object({
        command: Type.String(),
        cwd: Type.Optional(Type.String()),
      }),
      execute: async (_id, params) => {
        const { command, cwd } = params as { command: string; cwd?: string };
        const resolvedCwd = cwd
          ? resolveWorkspacePath(cwd)
          : getWorkspaceDir();
        const { stdout, stderr } = await execFileAsync(
          "sh",
          ["-c", command],
          {
            cwd: resolvedCwd,
            timeout: 30_000,
          }
        );
        return textResult(stdout + (stderr ? `\n[stderr]\n${stderr}` : ""));
      },
    },
    {
      name: "create_x_file",
      label: "创建结构化文件",
      description: `在 Agent 工作目录 ~/.config/owl-os/workspace 下创建 docx/pptx/xlsx/csv/pdf/xmind/md/txt 等文件。
- docx/pptx/pdf：使用 sections（标题+段落+代码块）
- xlsx/csv：使用 sheets（工作表+行+列）
- xmind：使用 topics（树形主题）
- md/txt/不支持的扩展名：使用 content 纯文本写入`,
      parameters: Type.Object({
        output_path: Type.String(),
        title: Type.Optional(Type.String()),
        format: Type.Optional(Type.String()),
        content: Type.Optional(Type.String()),
        sections: Type.Optional(
          Type.Array(
            Type.Object({
              heading: Type.String(),
              level: Type.Number(),
              paragraphs: Type.Array(Type.String()),
              code_blocks: Type.Optional(Type.Array(Type.String())),
            })
          )
        ),
        sheets: Type.Optional(
          Type.Array(
            Type.Object({
              name: Type.String(),
              rows: Type.Array(Type.Array(Type.String())),
            })
          )
        ),
        topics: Type.Optional(
          Type.Array(
            Type.Object({
              title: Type.String(),
              children: Type.Optional(Type.Array(Type.Any())),
            })
          )
        ),
      }),
      execute: async (_id, params) => {
        try {
          const resolved = await writeXFile(params as WriteXFileParams);
          return textResult(`已生成文件：${resolved}`);
        } catch (err) {
          return textResult(
            `生成失败：${err instanceof Error ? err.message : String(err)}`
          );
        }
      },
    },
  ];
}
