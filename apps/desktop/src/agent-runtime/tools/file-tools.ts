import { Type } from "@earendil-works/pi-ai";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import fs from "node:fs/promises";
import { resolveWorkspacePath } from "../workspace-path.js";
import { writeXFile } from "./file-writers/index.js";
import type { WriteXFileParams } from "./file-writers/types.js";
import { textResult } from "./tool-result.js";

export function buildFileTools(_sessionId: string): AgentTool[] {
  return [
    {
      name: "read_file",
      label: "读取文件",
      description: "读取 Agent 工作区内的文件内容。相对路径会解析到 ~/.config/owl-os/workspace 下。",
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
      description: "列出 Agent 工作区内的文件和目录。相对路径会解析到 ~/.config/owl-os/workspace 下。",
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
            }),
          ),
        ),
        sheets: Type.Optional(
          Type.Array(
            Type.Object({
              name: Type.String(),
              rows: Type.Array(Type.Array(Type.String())),
            }),
          ),
        ),
        topics: Type.Optional(
          Type.Array(
            Type.Object({
              title: Type.String(),
              children: Type.Optional(Type.Array(Type.Any())),
            }),
          ),
        ),
      }),
      execute: async (_id, params) => {
        const resolved = await writeXFile(params as WriteXFileParams);
        return textResult(`已生成文件：${resolved}`);
      },
    },
  ];
}
