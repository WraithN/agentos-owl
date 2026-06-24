# create_x_file 与 Agent 工具重分配实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 以插件化方式实现 `create_x_file` 多格式文件写入工具，建立全局 Agent 工作目录，并按新权限模型重分配 Elder/Sentinel/Worker 工具。

**Architecture:** 新增 `apps/desktop/src/agent/file-writers/` 插件目录，每个格式一个 writer；统一通过 `workspacePath.ts` 解析并沙箱到 `~/.config/owl-os/workspace`；`tools.ts` 删除旧 `write_file`/`create_docx`，暴露 `create_x_file`；`owleryAgentFactory.ts` 按新模型挂载工具；最后同步更新 prompt 文件。

**Tech Stack:** TypeScript, Node.js fs, Vitest, `docx`, `pptxgenjs`, `xlsx`, `pdf-lib`, `xmind-generator`。

---

## 文件结构总览

### 新建文件

- `apps/desktop/src/agent/workspacePath.ts`
- `apps/desktop/src/agent/file-writers/types.ts`
- `apps/desktop/src/agent/file-writers/index.ts`
- `apps/desktop/src/agent/file-writers/plain-text-writer.ts`
- `apps/desktop/src/agent/file-writers/docx-writer.ts`
- `apps/desktop/src/agent/file-writers/pptx-writer.ts`
- `apps/desktop/src/agent/file-writers/xlsx-writer.ts`
- `apps/desktop/src/agent/file-writers/pdf-writer.ts`
- `apps/desktop/src/agent/file-writers/xmind-writer.ts`
- `apps/desktop/src/__tests__/file-writers/workspacePath.test.ts`
- `apps/desktop/src/__tests__/file-writers/registry.test.ts`
- `apps/desktop/src/__tests__/file-writers/plain-text-writer.test.ts`
- `apps/desktop/src/__tests__/file-writers/docx-writer.test.ts`
- `apps/desktop/src/__tests__/file-writers/xlsx-writer.test.ts`

### 修改文件

- `apps/desktop/package.json`
- `apps/desktop/src/agent/tools.ts`
- `apps/desktop/src/agent/owleryAgentFactory.ts`
- `apps/desktop/prompt/sentinel_planner.md`
- `apps/desktop/prompt/worker.md`

---

## Task 1: 安装新增依赖

**Files:**
- Modify: `apps/desktop/package.json`

**Goal:** 添加 `create_x_file` 所需的 npm 库。

- [ ] **Step 1: 在 `apps/desktop/package.json` 的 `dependencies` 中追加依赖**

```json
{
  "dependencies": {
    "@earendil-works/pi-agent-core": "^0.79.4",
    "@earendil-works/pi-ai": "^0.79.4",
    "@owl-os/core": "workspace:*",
    "argon2": "^0.44.0",
    "better-sqlite3": "^12.10.1",
    "docx": "^9.7.1",
    "electron": "34.5.8",
    "jszip": "^3.10.1",
    "mammoth": "^1.12.0",
    "pdf-lib": "^1.17.1",
    "pptxgenjs": "^4.0.1",
    "ws": "^8.21.0",
    "xlsx": "^0.18.5",
    "xmind-generator": "^1.0.1"
  }
}
```

- [ ] **Step 2: 安装依赖**

Run:
```bash
cd /home/nan/agentos-owl/apps/desktop && pnpm install
```

Expected: `node_modules` 中出现 `docx`、`pptxgenjs`、`pdf-lib`、`xmind-generator`。

- [ ] **Step 3: Commit**

```bash
cd /home/nan/agentos-owl
git add apps/desktop/package.json pnpm-lock.yaml
git commit -m "chore(deps): add docx, pptxgenjs, pdf-lib, xmind-generator for create_x_file"
```

---

## Task 2: 实现全局工作目录路径解析（TDD）

**Files:**
- Create: `apps/desktop/src/agent/workspacePath.ts`
- Create: `apps/desktop/src/__tests__/file-writers/workspacePath.test.ts`

**Goal:** 提供统一的工作目录读取、创建、路径解析函数，并禁止路径遍历。

- [ ] **Step 1: 编写失败测试**

Create `apps/desktop/src/__tests__/file-writers/workspacePath.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import os from "node:os";
import path from "node:path";
import {
  getWorkspaceDir,
  resolveWorkspacePath,
} from "../../agent/workspacePath.js";

describe("workspacePath", () => {
  it("returns a path under ~/.config/owl-os/workspace by default", () => {
    const dir = getWorkspaceDir();
    expect(dir).toBe(path.join(os.homedir(), ".config", "owl-os", "workspace"));
  });

  it("resolves relative path under workspace", () => {
    const resolved = resolveWorkspacePath("report.docx");
    expect(resolved).toBe(path.join(getWorkspaceDir(), "report.docx"));
  });

  it("rejects path traversal", () => {
    expect(() => resolveWorkspacePath("../etc/passwd")).toThrow("路径越界");
  });

  it("rejects absolute path outside workspace", () => {
    expect(() => resolveWorkspacePath("/tmp/foo.docx")).toThrow("必须在 workspace");
  });

  it("allows absolute path inside workspace", () => {
    const inside = path.join(getWorkspaceDir(), "subdir", "file.txt");
    expect(resolveWorkspacePath(inside)).toBe(inside);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
cd /home/nan/agentos-owl/apps/desktop && pnpm test src/__tests__/file-writers/workspacePath.test.ts
```

Expected: FAIL，模块不存在。

- [ ] **Step 3: 实现 workspacePath.ts**

Create `apps/desktop/src/agent/workspacePath.ts`:

```ts
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { app } from "electron";
import { getDatabase } from "../db/connection.js";
import * as queries from "../db/queries/index.js";

const AGENT_WORKSPACE_DIR_KEY = "agentWorkspaceDir";

export function getDefaultWorkspaceDir(): string {
  return path.join(os.homedir(), ".config", "owl-os", "workspace");
}

export function getWorkspaceDir(): string {
  let configured: string | undefined;
  try {
    configured = queries.getSetting(getDatabase(), AGENT_WORKSPACE_DIR_KEY);
  } catch {
    // 非主线程或数据库未初始化时回退到默认值
  }
  return configured ? path.resolve(configured) : getDefaultWorkspaceDir();
}

export async function ensureWorkspaceDir(): Promise<void> {
  await fs.mkdir(getWorkspaceDir(), { recursive: true });
}

export function resolveWorkspacePath(input: string): string {
  const workspace = getWorkspaceDir();
  const normalized = path.normalize(input);

  if (path.isAbsolute(normalized)) {
    const rel = path.relative(workspace, normalized);
    if (rel.startsWith("..") || rel === "") {
      throw new Error(`绝对路径必须在 workspace 内：${workspace}`);
    }
    return normalized;
  }

  const resolved = path.resolve(workspace, normalized);
  const rel = path.relative(workspace, resolved);
  if (rel.startsWith("..") || rel === "") {
    throw new Error("路径越界：禁止访问 workspace 之外的目录");
  }

  return resolved;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:
```bash
cd /home/nan/agentos-owl/apps/desktop && pnpm test src/__tests__/file-writers/workspacePath.test.ts
```

Expected: 5 tests PASS。

- [ ] **Step 5: Commit**

```bash
cd /home/nan/agentos-owl
git add apps/desktop/src/agent/workspacePath.ts apps/desktop/src/__tests__/file-writers/workspacePath.test.ts
git commit -m "feat(agent): add workspace path resolution and safety checks"
```

---

## Task 3: 定义 Writer 类型与注册表

**Files:**
- Create: `apps/desktop/src/agent/file-writers/types.ts`
- Create: `apps/desktop/src/agent/file-writers/index.ts`
- Create: `apps/desktop/src/__tests__/file-writers/registry.test.ts`

**Goal:** 建立插件接口与注册表，`writeXFile` 根据扩展名路由到对应 writer，未知格式 fallback 到纯文本。

- [ ] **Step 1: 创建 types.ts**

Create `apps/desktop/src/agent/file-writers/types.ts`:

```ts
export interface Section {
  heading: string;
  level: number;
  paragraphs: string[];
  code_blocks?: string[];
}

export interface Sheet {
  name: string;
  rows: string[][];
}

export interface Topic {
  title: string;
  children?: Topic[];
}

export interface WriteXFileParams {
  output_path: string;
  title?: string;
  format?: "docx" | "pptx" | "xlsx" | "csv" | "pdf" | "xmind" | "md" | "txt";
  content?: string;
  sections?: Section[];
  sheets?: Sheet[];
  topics?: Topic[];
}

export interface FileWriter {
  extensions: string[];
  write(params: WriteXFileParams, resolvedPath: string): Promise<void>;
}
```

- [ ] **Step 2: 创建 index.ts 骨架**

Create `apps/desktop/src/agent/file-writers/index.ts`:

```ts
import path from "node:path";
import {
  ensureWorkspaceDir,
  resolveWorkspacePath,
} from "../workspacePath.js";
import type { FileWriter, WriteXFileParams } from "./types.js";

const writers: FileWriter[] = [];

const registry = new Map<string, FileWriter>();

export async function writeXFile(params: WriteXFileParams): Promise<string> {
  const resolvedPath = resolveWorkspacePath(params.output_path);
  const ext = path.extname(resolvedPath).toLowerCase();
  const writer = registry.get(ext);
  if (!writer) {
    throw new Error(`不支持的文件类型：${ext}`);
  }
  await ensureWorkspaceDir();
  await writer.write(params, resolvedPath);
  return resolvedPath;
}
```

- [ ] **Step 3: 编写注册表测试**

Create `apps/desktop/src/__tests__/file-writers/registry.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { writeXFile } from "../../agent/file-writers/index.js";

describe("writeXFile registry", () => {
  it("throws for unsupported extension when no fallback", async () => {
    await expect(
      writeXFile({ output_path: "foo.unknown", content: "hi" })
    ).rejects.toThrow("不支持的文件类型");
  });
});
```

- [ ] **Step 4: 运行测试确认失败**

Run:
```bash
cd /home/nan/agentos-owl/apps/desktop && pnpm test src/__tests__/file-writers/registry.test.ts
```

Expected: 1 test PASS（当前 registry 会抛错，测试期望抛错，所以会通过）。

- [ ] **Step 5: Commit**

```bash
cd /home/nan/agentos-owl
git add apps/desktop/src/agent/file-writers/types.ts apps/desktop/src/agent/file-writers/index.ts apps/desktop/src/__tests__/file-writers/registry.test.ts
git commit -m "feat(agent): define file writer types and registry skeleton"
```

---

## Task 4: 实现纯文本 Fallback Writer（TDD）

**Files:**
- Create: `apps/desktop/src/agent/file-writers/plain-text-writer.ts`
- Modify: `apps/desktop/src/agent/file-writers/index.ts`
- Create: `apps/desktop/src/__tests__/file-writers/plain-text-writer.test.ts`

**Goal:** 为 `.md`、`.txt` 及未知扩展名提供 fallback 写入能力。

- [ ] **Step 1: 编写失败测试**

Create `apps/desktop/src/__tests__/file-writers/plain-text-writer.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import { getWorkspaceDir } from "../../agent/workspacePath.js";
import { writeXFile } from "../../agent/file-writers/index.js";

describe("plain-text writer", () => {
  it("writes markdown content to workspace", async () => {
    const outputPath = "plain-text-test.md";
    const resolved = await writeXFile({
      output_path: outputPath,
      content: "# Hello\n\nWorld",
    });
    expect(resolved).toBe(path.join(getWorkspaceDir(), outputPath));
    const text = await fs.readFile(resolved, "utf-8");
    expect(text).toBe("# Hello\n\nWorld");
  });

  it("writes txt content", async () => {
    const resolved = await writeXFile({
      output_path: "plain-text-test.txt",
      content: "line1\nline2",
    });
    const text = await fs.readFile(resolved, "utf-8");
    expect(text).toBe("line1\nline2");
  });

  it("fallbacks unknown extension to plain text", async () => {
    const resolved = await writeXFile({
      output_path: "plain-text-test.unknown",
      content: "fallback",
    });
    const text = await fs.readFile(resolved, "utf-8");
    expect(text).toBe("fallback");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
cd /home/nan/agentos-owl/apps/desktop && pnpm test src/__tests__/file-writers/plain-text-writer.test.ts
```

Expected: FAIL，writer 未注册。

- [ ] **Step 3: 实现 plain-text-writer.ts 并注册**

Create `apps/desktop/src/agent/file-writers/plain-text-writer.ts`:

```ts
import fs from "node:fs/promises";
import path from "node:path";
import type { FileWriter, WriteXFileParams } from "./types.js";

async function writePlainText(
  params: WriteXFileParams,
  resolvedPath: string
): Promise<void> {
  await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
  await fs.writeFile(resolvedPath, params.content ?? "", "utf-8");
}

export const plainTextWriter: FileWriter = {
  extensions: [".md", ".txt", ".json", ".yaml", ".yml"],
  write: writePlainText,
};
```

Modify `apps/desktop/src/agent/file-writers/index.ts` 顶部和 writers 数组：

```ts
import { plainTextWriter } from "./plain-text-writer.js";

const writers: FileWriter[] = [plainTextWriter];

for (const writer of writers) {
  for (const ext of writer.extensions) {
    registry.set(ext, writer);
  }
}

export async function writeXFile(params: WriteXFileParams): Promise<string> {
  const resolvedPath = resolveWorkspacePath(params.output_path);
  const ext = path.extname(resolvedPath).toLowerCase();
  const writer = registry.get(ext) ?? plainTextWriter;
  await ensureWorkspaceDir();
  await writer.write(params, resolvedPath);
  return resolvedPath;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:
```bash
cd /home/nan/agentos-owl/apps/desktop && pnpm test src/__tests__/file-writers/plain-text-writer.test.ts
```

Expected: 3 tests PASS。

- [ ] **Step 5: Commit**

```bash
cd /home/nan/agentos-owl
git add apps/desktop/src/agent/file-writers/plain-text-writer.ts apps/desktop/src/agent/file-writers/index.ts apps/desktop/src/__tests__/file-writers/plain-text-writer.test.ts
git commit -m "feat(agent): add plain-text fallback writer for create_x_file"
```

---

## Task 5: 实现 DOCX Writer（TDD）

**Files:**
- Create: `apps/desktop/src/agent/file-writers/docx-writer.ts`
- Modify: `apps/desktop/src/agent/file-writers/index.ts`
- Create: `apps/desktop/src/__tests__/file-writers/docx-writer.test.ts`

**Goal:** 用 `docx` npm 包生成 Word 文档，替换原 Python 实现。

- [ ] **Step 1: 编写失败测试**

Create `apps/desktop/src/__tests__/file-writers/docx-writer.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import { getWorkspaceDir } from "../../agent/workspacePath.js";
import { writeXFile } from "../../agent/file-writers/index.js";

describe("docx writer", () => {
  it("creates a docx file from sections", async () => {
    const outputPath = "docx-test.docx";
    const resolved = await writeXFile({
      output_path: outputPath,
      title: "Test Report",
      sections: [
        {
          heading: "Intro",
          level: 1,
          paragraphs: ["This is the introduction."],
        },
      ],
    });

    const stat = await fs.stat(resolved);
    expect(stat.isFile()).toBe(true);
    expect(stat.size).toBeGreaterThan(0);

    const buf = await fs.readFile(resolved);
    // DOCX is a zip file starting with PK
    expect(buf.slice(0, 2).toString("hex")).toBe("504b");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
cd /home/nan/agentos-owl/apps/desktop && pnpm test src/__tests__/file-writers/docx-writer.test.ts
```

Expected: FAIL，docx writer 未注册/未实现。

- [ ] **Step 3: 实现 docx-writer.ts 并注册**

Create `apps/desktop/src/agent/file-writers/docx-writer.ts`:

```ts
import fs from "node:fs/promises";
import path from "node:path";
import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
} from "docx";
import type { FileWriter, WriteXFileParams } from "./types.js";

async function writeDocx(
  params: WriteXFileParams,
  resolvedPath: string
): Promise<void> {
  const children: Paragraph[] = [];

  if (params.title) {
    children.push(
      new Paragraph({
        text: params.title,
        heading: HeadingLevel.TITLE,
        alignment: "center",
      })
    );
  }

  for (const section of params.sections ?? []) {
    const levelMap: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
      0: HeadingLevel.TITLE,
      1: HeadingLevel.HEADING_1,
      2: HeadingLevel.HEADING_2,
      3: HeadingLevel.HEADING_3,
    };
    const headingLevel = levelMap[Math.max(0, Math.min(section.level, 3))] ?? HeadingLevel.HEADING_1;

    children.push(
      new Paragraph({
        text: section.heading,
        heading: headingLevel,
      })
    );

    for (const para of section.paragraphs ?? []) {
      children.push(new Paragraph(para));
    }

    for (const code of section.code_blocks ?? []) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: code,
              font: "Consolas",
              size: 20,
            }),
          ],
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const buf = await Packer.toBuffer(doc);
  await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
  await fs.writeFile(resolvedPath, buf);
}

export const docxWriter: FileWriter = {
  extensions: [".docx"],
  write: writeDocx,
};
```

Modify `apps/desktop/src/agent/file-writers/index.ts` 注册 docx：

```ts
import { docxWriter } from "./docx-writer.js";

const writers: FileWriter[] = [plainTextWriter, docxWriter];
```

- [ ] **Step 4: 运行测试确认通过**

Run:
```bash
cd /home/nan/agentos-owl/apps/desktop && pnpm test src/__tests__/file-writers/docx-writer.test.ts
```

Expected: 1 test PASS。

- [ ] **Step 5: Commit**

```bash
cd /home/nan/agentos-owl
git add apps/desktop/src/agent/file-writers/docx-writer.ts apps/desktop/src/agent/file-writers/index.ts apps/desktop/src/__tests__/file-writers/docx-writer.test.ts
git commit -m "feat(agent): add docx writer using npm docx package"
```

---

## Task 6: 实现 XLSX/CSV Writer（TDD）

**Files:**
- Create: `apps/desktop/src/agent/file-writers/xlsx-writer.ts`
- Modify: `apps/desktop/src/agent/file-writers/index.ts`
- Create: `apps/desktop/src/__tests__/file-writers/xlsx-writer.test.ts`

**Goal:** 用已存在的 `xlsx` 包生成 Excel 和 CSV。

- [ ] **Step 1: 编写失败测试**

Create `apps/desktop/src/__tests__/file-writers/xlsx-writer.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";
import { getWorkspaceDir } from "../../agent/workspacePath.js";
import { writeXFile } from "../../agent/file-writers/index.js";

describe("xlsx writer", () => {
  it("creates xlsx with sheets", async () => {
    const outputPath = "xlsx-test.xlsx";
    const resolved = await writeXFile({
      output_path: outputPath,
      title: "Sales",
      sheets: [
        {
          name: "Q1",
          rows: [
            ["Product", "Revenue"],
            ["A", "100"],
          ],
        },
      ],
    });

    const buf = await fs.readFile(resolved);
    const workbook = XLSX.read(buf, { type: "buffer" });
    expect(workbook.SheetNames).toContain("Q1");
    const sheet = workbook.Sheets["Q1"];
    expect(sheet["A1"].v).toBe("Product");
    expect(sheet["B2"].v).toBe("100");
  });

  it("creates csv from first sheet", async () => {
    const outputPath = "csv-test.csv";
    const resolved = await writeXFile({
      output_path: outputPath,
      sheets: [
        {
          name: "Sheet1",
          rows: [
            ["a", "b"],
            ["1", "2"],
          ],
        },
      ],
    });

    const text = await fs.readFile(resolved, "utf-8");
    expect(text).toContain("a,b");
    expect(text).toContain("1,2");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
cd /home/nan/agentos-owl/apps/desktop && pnpm test src/__tests__/file-writers/xlsx-writer.test.ts
```

Expected: FAIL。

- [ ] **Step 3: 实现 xlsx-writer.ts 并注册**

Create `apps/desktop/src/agent/file-writers/xlsx-writer.ts`:

```ts
import fs from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";
import type { FileWriter, WriteXFileParams } from "./types.js";

async function writeXlsx(
  params: WriteXFileParams,
  resolvedPath: string
): Promise<void> {
  await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
  const ext = path.extname(resolvedPath).toLowerCase();

  if (ext === ".csv") {
    const sheet = params.sheets?.[0];
    if (!sheet) {
      await fs.writeFile(resolvedPath, "", "utf-8");
      return;
    }
    const worksheet = XLSX.utils.aoa_to_sheet(sheet.rows);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    await fs.writeFile(resolvedPath, csv, "utf-8");
    return;
  }

  const workbook = XLSX.utils.book_new();
  for (const sheet of params.sheets ?? []) {
    const worksheet = XLSX.utils.aoa_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
  }
  XLSX.writeFile(workbook, resolvedPath);
}

export const xlsxWriter: FileWriter = {
  extensions: [".xlsx", ".csv"],
  write: writeXlsx,
};
```

Modify `apps/desktop/src/agent/file-writers/index.ts`:

```ts
import { xlsxWriter } from "./xlsx-writer.js";

const writers: FileWriter[] = [plainTextWriter, docxWriter, xlsxWriter];
```

- [ ] **Step 4: 运行测试确认通过**

Run:
```bash
cd /home/nan/agentos-owl/apps/desktop && pnpm test src/__tests__/file-writers/xlsx-writer.test.ts
```

Expected: 2 tests PASS。

- [ ] **Step 5: Commit**

```bash
cd /home/nan/agentos-owl
git add apps/desktop/src/agent/file-writers/xlsx-writer.ts apps/desktop/src/agent/file-writers/index.ts apps/desktop/src/__tests__/file-writers/xlsx-writer.test.ts
git commit -m "feat(agent): add xlsx and csv writer"
```

---

## Task 7: 实现 PPTX Writer

**Files:**
- Create: `apps/desktop/src/agent/file-writers/pptx-writer.ts`
- Modify: `apps/desktop/src/agent/file-writers/index.ts`

**Goal:** 用 `pptxgenjs` 生成 PPT。

- [ ] **Step 1: 实现 pptx-writer.ts 并注册**

Create `apps/desktop/src/agent/file-writers/pptx-writer.ts`:

```ts
import path from "node:path";
import PptxGenJS from "pptxgenjs";
import type { FileWriter, WriteXFileParams } from "./types.js";

async function writePptx(
  params: WriteXFileParams,
  resolvedPath: string
): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";

  if (params.title) {
    const slide = pptx.addSlide();
    slide.addText(params.title, {
      x: 1,
      y: 1,
      w: "80%",
      h: 1,
      fontSize: 24,
      bold: true,
      align: "center",
    });
  }

  for (const section of params.sections ?? []) {
    const slide = pptx.addSlide();
    slide.addText(section.heading, {
      x: 0.5,
      y: 0.5,
      w: "90%",
      h: 0.8,
      fontSize: 18,
      bold: true,
    });

    const body = [
      ...(section.paragraphs ?? []),
      ...(section.code_blocks ?? []).map((c) => `\n${c}\n`),
    ].join("\n");

    if (body) {
      slide.addText(body, {
        x: 0.5,
        y: 1.5,
        w: "90%",
        h: "70%",
        fontSize: 12,
      });
    }
  }

  await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
  await pptx.writeFile({ fileName: resolvedPath });
}

export const pptxWriter: FileWriter = {
  extensions: [".pptx"],
  write: writePptx,
};
```

注意：需要在文件顶部添加 `import fs from "node:fs/promises";`。

Modify `apps/desktop/src/agent/file-writers/index.ts`:

```ts
import { pptxWriter } from "./pptx-writer.js";

const writers: FileWriter[] = [
  plainTextWriter,
  docxWriter,
  xlsxWriter,
  pptxWriter,
];
```

- [ ] **Step 2: 手动验证 PPTX 可生成**

Run a quick Node snippet:
```bash
cd /home/nan/agentos-owl/apps/desktop && node --input-type=module -e '
import { writeXFile } from "./dist/main/file-writers/index.js";
await writeXFile({
  output_path: "verify.pptx",
  title: "Verify",
  sections: [{ heading: "Slide 1", level: 1, paragraphs: ["Hello"] }],
});
console.log("ok");
'
```

Expected: 文件生成于 `~/.config/owl-os/workspace/verify.pptx`。

- [ ] **Step 3: Commit**

```bash
cd /home/nan/agentos-owl
git add apps/desktop/src/agent/file-writers/pptx-writer.ts apps/desktop/src/agent/file-writers/index.ts
git commit -m "feat(agent): add pptx writer using pptxgenjs"
```

---

## Task 8: 实现 PDF Writer

**Files:**
- Create: `apps/desktop/src/agent/file-writers/pdf-writer.ts`
- Modify: `apps/desktop/src/agent/file-writers/index.ts`

**Goal:** 用 `pdf-lib` 生成 PDF。

- [ ] **Step 1: 实现 pdf-writer.ts 并注册**

Create `apps/desktop/src/agent/file-writers/pdf-writer.ts`:

```ts
import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { FileWriter, WriteXFileParams } from "./types.js";

async function writePdf(
  params: WriteXFileParams,
  resolvedPath: string
): Promise<void> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  let page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  let y = height - 50;

  const drawText = (text: string, size: number, x: number) => {
    if (y < 50) {
      page = pdfDoc.addPage();
      y = height - 50;
    }
    page.drawText(text, { x, y, size, font, color: rgb(0, 0, 0) });
    y -= size + 8;
  };

  if (params.title) {
    drawText(params.title, 20, 50);
    y -= 10;
  }

  for (const section of params.sections ?? []) {
    drawText(section.heading, 14, 50);
    for (const para of section.paragraphs ?? []) {
      drawText(para, 10, 60);
    }
    for (const code of section.code_blocks ?? []) {
      drawText(code, 9, 70);
    }
    y -= 10;
  }

  const pdfBytes = await pdfDoc.save();
  await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
  await fs.writeFile(resolvedPath, pdfBytes);
}

export const pdfWriter: FileWriter = {
  extensions: [".pdf"],
  write: writePdf,
};
```

Modify `apps/desktop/src/agent/file-writers/index.ts`:

```ts
import { pdfWriter } from "./pdf-writer.js";

const writers: FileWriter[] = [
  plainTextWriter,
  docxWriter,
  xlsxWriter,
  pptxWriter,
  pdfWriter,
];
```

- [ ] **Step 2: 手动验证 PDF 可生成**

```bash
cd /home/nan/agentos-owl/apps/desktop && node --input-type=module -e '
import { writeXFile } from "./dist/main/file-writers/index.js";
await writeXFile({
  output_path: "verify.pdf",
  title: "Verify",
  sections: [{ heading: "Chapter", level: 1, paragraphs: ["Hello PDF"] }],
});
console.log("ok");
'
```

Expected: 文件生成于 `~/.config/owl-os/workspace/verify.pdf`，且文件头为 `%PDF`。

- [ ] **Step 3: Commit**

```bash
cd /home/nan/agentos-owl
git add apps/desktop/src/agent/file-writers/pdf-writer.ts apps/desktop/src/agent/file-writers/index.ts
git commit -m "feat(agent): add pdf writer using pdf-lib"
```

---

## Task 9: 实现 XMind Writer

**Files:**
- Create: `apps/desktop/src/agent/file-writers/xmind-writer.ts`
- Modify: `apps/desktop/src/agent/file-writers/index.ts`

**Goal:** 用 `xmind-generator` 生成思维导图。

- [ ] **Step 1: 实现 xmind-writer.ts 并注册**

Create `apps/desktop/src/agent/file-writers/xmind-writer.ts`:

```ts
import fs from "node:fs/promises";
import path from "node:path";
import { Workbook, Topic, Sheet } from "xmind-generator";
import type { FileWriter, WriteXFileParams, Topic as InputTopic } from "./types.js";

function buildTopics(topics: InputTopic[]): Topic[] {
  return topics.map((t) => {
    const topic = new Topic({ title: t.title });
    if (t.children && t.children.length > 0) {
      for (const child of buildTopics(t.children)) {
        topic.add(child);
      }
    }
    return topic;
  });
}

async function writeXmind(
  params: WriteXFileParams,
  resolvedPath: string
): Promise<void> {
  const workbook = new Workbook();
  const rootTitle = params.title ?? "Mind Map";
  const rootTopic = new Topic({ title: rootTitle });

  for (const child of buildTopics(params.topics ?? [])) {
    rootTopic.add(child);
  }

  const sheet = new Sheet({ rootTopic });
  workbook.addSheet(sheet);

  const buffer = await workbook.toBuffer();
  await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
  await fs.writeFile(resolvedPath, buffer);
}

export const xmindWriter: FileWriter = {
  extensions: [".xmind"],
  write: writeXmind,
};
```

注意：如果 `xmind-generator` 的 API 与上述代码不一致，需根据实际 npm 包 README 调整 `Workbook`/`Topic`/`Sheet` 的构造方式。

Modify `apps/desktop/src/agent/file-writers/index.ts`:

```ts
import { xmindWriter } from "./xmind-writer.js";

const writers: FileWriter[] = [
  plainTextWriter,
  docxWriter,
  xlsxWriter,
  pptxWriter,
  pdfWriter,
  xmindWriter,
];
```

- [ ] **Step 2: 手动验证 XMind 可生成**

```bash
cd /home/nan/agentos-owl/apps/desktop && node --input-type=module -e '
import { writeXFile } from "./dist/main/file-writers/index.js";
await writeXFile({
  output_path: "verify.xmind",
  title: "Root",
  topics: [
    { title: "Branch 1", children: [{ title: "Leaf 1" }] },
    { title: "Branch 2" },
  ],
});
console.log("ok");
'
```

Expected: 文件生成于 `~/.config/owl-os/workspace/verify.xmind`，且可被 XMind 打开。

- [ ] **Step 3: Commit**

```bash
cd /home/nan/agentos-owl
git add apps/desktop/src/agent/file-writers/xmind-writer.ts apps/desktop/src/agent/file-writers/index.ts
git commit -m "feat(agent): add xmind writer using xmind-generator"
```

---

## Task 10: 改造 tools.ts

**Files:**
- Modify: `apps/desktop/src/agent/tools.ts`

**Goal:** 删除 `write_file` 和 `create_docx`，新增 `create_x_file`；改造 `read_file`、`list_directory`、`execute_command` 以使用 workspace。

- [ ] **Step 1: 修改 imports**

在 `tools.ts` 顶部添加：

```ts
import { resolveWorkspacePath, getWorkspaceDir } from "./workspacePath.js";
import { writeXFile } from "./file-writers/index.js";
import type { WriteXFileParams } from "./file-writers/types.js";
```

- [ ] **Step 2: 改造 read_file**

```ts
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
}
```

- [ ] **Step 3: 改造 list_directory**

```ts
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
}
```

- [ ] **Step 4: 改造 execute_command**

```ts
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
}
```

- [ ] **Step 5: 删除 write_file 工具**

从 `buildTools` 中移除整个 `write_file` 对象。

- [ ] **Step 6: 删除 create_docx 工具并替换为 create_x_file**

删除原 `create_docx` 对象，替换为：

```ts
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
}
```

- [ ] **Step 7: 运行 desktop typecheck**

Run:
```bash
cd /home/nan/agentos-owl/apps/desktop && pnpm typecheck
```

Expected: PASS。

- [ ] **Step 8: Commit**

```bash
cd /home/nan/agentos-owl
git add apps/desktop/src/agent/tools.ts
git commit -m "feat(agent): replace write_file/create_docx with create_x_file and sandbox file tools to workspace"
```

---

## Task 11: 重分配 Agent 工具

**Files:**
- Modify: `apps/desktop/src/agent/owleryAgentFactory.ts`

**Goal:** 按新权限模型给 Elder/Sentinel/Worker 挂载工具。

- [ ] **Step 1: 修改 createOwleryAgentFactory 中的 tools 分配**

原代码：

```ts
const tools: AgentTool[] =
  input.role === "elder"
    ? [buildRecruitSentinelTool()]
    : input.role === "sentinel"
      ? [...buildTools(input.sessionId), buildRecruitWorkersTool(), ...buildPlannerTools(input.sessionId)]
      : buildTools(input.sessionId);
```

替换为：

```ts
const elderTools: AgentTool[] = [buildRecruitSentinelTool()];

const sentinelTools: AgentTool[] = [
  buildReadFileTool(input.sessionId),
  buildListDirectoryTool(input.sessionId),
  buildRecruitWorkersTool(),
  ...buildPlannerTools(input.sessionId),
];

const workerTools: AgentTool[] = [
  buildReadFileTool(input.sessionId),
  buildListDirectoryTool(input.sessionId),
  buildCreateXFileTool(input.sessionId),
  buildExecuteCommandTool(input.sessionId),
];

const tools: AgentTool[] =
  input.role === "elder"
    ? elderTools
    : input.role === "sentinel"
      ? sentinelTools
      : workerTools;
```

注意：上述 `buildReadFileTool`、`buildListDirectoryTool`、`buildCreateXFileTool`、`buildExecuteCommandTool` 是示意命名。由于当前 `buildTools()` 返回所有工具数组，更简单的方式是直接过滤：

```ts
function pickTool(tools: AgentTool[], name: string): AgentTool {
  const tool = tools.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool not found: ${name}`);
  return tool;
}

const allTools = buildTools(input.sessionId);
const readFileTool = pickTool(allTools, "read_file");
const listDirectoryTool = pickTool(allTools, "list_directory");
const createXFileTool = pickTool(allTools, "create_x_file");
const executeCommandTool = pickTool(allTools, "execute_command");

const tools: AgentTool[] =
  input.role === "elder"
    ? [buildRecruitSentinelTool()]
    : input.role === "sentinel"
      ? [readFileTool, listDirectoryTool, buildRecruitWorkersTool(), ...buildPlannerTools(input.sessionId)]
      : [readFileTool, listDirectoryTool, createXFileTool, executeCommandTool];
```

`createOwleryAgentFactoryWithConfig` 做同样修改。

- [ ] **Step 2: 运行 desktop typecheck**

```bash
cd /home/nan/agentos-owl/apps/desktop && pnpm typecheck
```

Expected: PASS。

- [ ] **Step 3: Commit**

```bash
cd /home/nan/agentos-owl
git add apps/desktop/src/agent/owleryAgentFactory.ts
git commit -m "feat(agent): redistribute tools across elder, sentinel and worker"
```

---

## Task 12: 更新 Prompt 文件

**Files:**
- Modify: `apps/desktop/prompt/sentinel_planner.md`
- Modify: `apps/desktop/prompt/worker.md`

**Goal:** 让 Agent 提示词与新工具名和路径保持一致。

- [ ] **Step 1: 修改 apps/desktop/prompt/sentinel_planner.md**

将：

```markdown
- ❌ 禁止自己调用 `read_file`、`list_directory`、`execute_command`、`create_docx`。
```

改为：

```markdown
- ❌ 禁止自己调用 `read_file`、`list_directory`、`create_x_file`、`execute_command`。
```

将：

```markdown
- 文档、报告类任务必须让 `writer` 调用 `create_docx` 工具生成 `.docx` 文件（默认写到 `/tmp`），并在 `submit_to_elder` 的最终说明中给出文件名；禁止只用纯文本冒充文档交付物。
```

改为：

```markdown
- 文档、报告类任务必须让 `writer` 调用 `create_x_file` 工具生成对应格式文件（默认写到 `~/.config/owl-os/workspace/`），并在 `submit_to_elder` 的最终说明中给出文件名；禁止只用纯文本冒充文档交付物。
```

- [ ] **Step 2: 修改 apps/desktop/prompt/worker.md**

将：

```markdown
6. 若子任务是撰写文档、报告或需要可下载交付物，必须使用 `create_docx` 工具生成 `.docx` 文件（默认路径 `/tmp/文件名.docx`），并在产出开头标注生成的文件路径。
```

改为：

```markdown
6. 若子任务是撰写文档、报告或需要可下载交付物，必须使用 `create_x_file` 工具生成文件（默认路径 `~/.config/owl-os/workspace/文件名`），并在产出开头标注生成的文件路径。
```

将：

```markdown
8. 如果你是 `writer`，必须基于 researcher 提供的研究成果生成最终交付物（文档类必须生成 `.docx`）。
```

改为：

```markdown
8. 如果你是 `writer`，必须基于 researcher 提供的研究成果生成最终交付物（文档类必须调用 `create_x_file` 生成 `.docx` 或其他用户要求格式）。
```

- [ ] **Step 3: Commit**

```bash
cd /home/nan/agentos-owl
git add apps/desktop/prompt/sentinel_planner.md apps/desktop/prompt/worker.md
git commit -m "docs(prompt): update create_docx references to create_x_file and workspace path"
```

---

## Task 13: 最终验证

**Files:**
- All of the above

**Goal:** 确保类型检查、lint、测试全部通过。

- [ ] **Step 1: 运行 desktop 测试**

```bash
cd /home/nan/agentos-owl/apps/desktop && pnpm test
```

Expected: 所有新增与既有测试 PASS。

- [ ] **Step 2: 运行 desktop typecheck**

```bash
cd /home/nan/agentos-owl/apps/desktop && pnpm typecheck
```

Expected: PASS。

- [ ] **Step 3: 运行 desktop lint**

```bash
cd /home/nan/agentos-owl/apps/desktop && pnpm lint
```

Expected: PASS。

- [ ] **Step 4: 运行根 lint（如时间允许）**

```bash
cd /home/nan/agentos-owl && pnpm lint
```

Expected: PASS（注意 ast-grep 需要 `pnpm install` 已正确安装）。

- [ ] **Step 5: Commit 最终修复**

如有任何 lint/type 修复，单独提交：

```bash
cd /home/nan/agentos-owl
git add -A
git commit -m "fix(agent): resolve typecheck and lint issues for create_x_file redesign"
```

---

## 自检清单（计划作者执行）

| Spec 要求 | 对应 Task |
|-----------|-----------|
| 全局工作目录配置 | Task 2 |
| read_file/list_directory/execute_command 基于 workspace | Task 2, Task 10 |
| Elder 只保留 recruit_sentinel | Task 11 |
| Sentinel 保留 read/list + 流水线三件套 + recruit_workers | Task 11 |
| Worker 保留 read/list/create_x_file/execute_command | Task 11 |
| create_x_file 插件化支持多格式 | Task 3-9, Task 10 |
| 不支持的格式 fallback 到纯文本 | Task 4 |
| 路径安全校验 | Task 2 |
| 提示词更新 | Task 12 |
| 测试覆盖 | Task 2, Task 4, Task 5, Task 6, Task 13 |
