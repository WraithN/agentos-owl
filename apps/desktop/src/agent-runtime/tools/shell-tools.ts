import { Type } from "@earendil-works/pi-ai";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolveWorkspacePath, getWorkspaceDir } from "../workspace-path.js";
import { textResult } from "./tool-result.js";

const execFileAsync = promisify(execFile);

export function buildShellTools(_sessionId: string): AgentTool[] {
  return [
    {
      name: "execute_command",
      label: "执行命令",
      description: "在 Agent 工作区内执行 shell 命令。生成的文件应写入工作区。",
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
          },
        );
        return textResult(stdout + (stderr ? `\n[stderr]\n${stderr}` : ""));
      },
    },
  ];
}
