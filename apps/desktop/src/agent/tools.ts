/* Pi Agent 工具集 —— 复刻 coding agent 基础能力 */
import { Type } from "@earendil-works/pi-ai";
import type { AgentTool, AgentToolResult } from "@earendil-works/pi-agent-core";
import fs from "node:fs/promises";
import nodePath from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function textResult(text: string): AgentToolResult<unknown> {
  return {
    content: [{ type: "text", text }],
    details: undefined,
  };
}

export function buildTools(_sessionId: string): AgentTool[] {
  return [
    {
      name: "read_file",
      label: "读取文件",
      description: "Read the contents of a file at the given absolute or workspace-relative path.",
      parameters: Type.Object({
        path: Type.String(),
      }),
      execute: async (_id, params) => {
        const { path } = params as { path: string };
        const text = await fs.readFile(path, "utf-8");
        return textResult(text);
      },
    },
    {
      name: "write_file",
      label: "写入文件",
      description: "Write content to a file. Creates parent directories if needed.",
      parameters: Type.Object({
        path: Type.String(),
        content: Type.String(),
      }),
      execute: async (_id, params) => {
        const { path, content } = params as { path: string; content: string };
        await fs.mkdir(nodePath.dirname(path), { recursive: true });
        await fs.writeFile(path, content, "utf-8");
        return textResult(`File written: ${path}`);
      },
    },
    {
      name: "list_directory",
      label: "列出目录",
      description: "List files and directories at the given path.",
      parameters: Type.Object({
        path: Type.String(),
      }),
      execute: async (_id, params) => {
        const { path } = params as { path: string };
        const entries = await fs.readdir(path, { withFileTypes: true });
        const text = entries.map(e => `${e.isDirectory() ? "[dir]" : "[file]"} ${e.name}`).join("\n");
        return textResult(text);
      },
    },
    {
      name: "execute_command",
      label: "执行命令",
      description: "Execute a shell command and return stdout/stderr. Use with caution.",
      parameters: Type.Object({
        command: Type.String(),
        cwd: Type.Optional(Type.String()),
      }),
      execute: async (_id, params) => {
        const { command, cwd } = params as { command: string; cwd?: string };
        const [cmd, ...cmdArgs] = command.split(" ");
        const { stdout, stderr } = await execFileAsync(cmd, cmdArgs, {
          cwd: cwd ?? process.cwd(),
          timeout: 30_000,
          shell: true,
        });
        return textResult(stdout + (stderr ? `\n[stderr]\n${stderr}` : ""));
      },
    },
  ];
}
