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
      description: "Execute a shell command and return stdout/stderr. Generated files should be written to /tmp unless the user specifies another location.",
      parameters: Type.Object({
        command: Type.String(),
        cwd: Type.Optional(Type.String()),
      }),
      execute: async (_id, params) => {
        const { command, cwd } = params as { command: string; cwd?: string };
        // 使用 sh -c 执行完整命令，避免 split 破坏 heredoc、管道、引号等复杂 shell 语法
        // 默认工作目录设为 /tmp，使 LLM 生成的文件落到用户可预览的固定位置
        const { stdout, stderr } = await execFileAsync("sh", ["-c", command], {
          cwd: cwd ?? "/tmp",
          timeout: 30_000,
        });
        return textResult(stdout + (stderr ? `\n[stderr]\n${stderr}` : ""));
      },
    },
    {
      name: "create_docx",
      label: "创建 Word 文档",
      description:
        "Create a formatted .docx file from structured sections. Use this when the user asks for a document, report, or any deliverable that should be a Word file. Relative paths are resolved under /tmp.",
      parameters: Type.Object({
        output_path: Type.String(),
        title: Type.String(),
        sections: Type.Array(
          Type.Object({
            heading: Type.String(),
            level: Type.Number(),
            paragraphs: Type.Array(Type.String()),
            code_blocks: Type.Optional(Type.Array(Type.String())),
          })
        ),
      }),
      execute: async (_id, params) => {
        const { output_path, title, sections } = params as {
          output_path: string;
          title: string;
          sections: Array<{
            heading: string;
            level: number;
            paragraphs: string[];
            code_blocks?: string[];
          }>;
        };
        const resolvedPath = nodePath.isAbsolute(output_path)
          ? output_path
          : nodePath.join("/tmp", output_path);
        await fs.mkdir(nodePath.dirname(resolvedPath), { recursive: true });

        const script = `
import json
import sys
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

payload = json.loads(sys.argv[1])
output_path = payload["output_path"]
title = payload["title"]
sections = payload["sections"]

doc = Document()
style = doc.styles["Normal"]
style.font.name = "Calibri"
style.font.size = Pt(11)

doc_title = doc.add_heading(title, level=0)
doc_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
for run in doc_title.runs:
    run.font.size = Pt(22)
    run.font.color.rgb = RGBColor(0, 0, 0)

for section in sections:
    level = max(1, min(int(section.get("level", 1)), 3))
    h = doc.add_heading(section["heading"], level=level)
    for run in h.runs:
        run.font.color.rgb = RGBColor(0, 51, 102)
    for para in section.get("paragraphs", []):
        doc.add_paragraph(para, style="Normal")
    for code in section.get("code_blocks", []):
        p = doc.add_paragraph()
        run = p.add_run(code)
        run.font.name = "Consolas"
        run.font.size = Pt(10)
        run.font.color.rgb = RGBColor(64, 64, 64)
        p.paragraph_format.left_indent = Inches(0.3)

doc.save(output_path)
print(output_path)
`;
        const { stdout, stderr } = await execFileAsync(
          "python3",
          ["-c", script, JSON.stringify({ output_path: resolvedPath, title, sections })],
          { timeout: 30_000 }
        );
        return textResult(`DOCX created: ${resolvedPath}${stderr ? `\n[stderr]\n${stderr}` : ""}`);
      },
    },
  ];
}
