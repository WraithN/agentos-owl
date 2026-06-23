# create_x_file 插件化文件写入与 Agent 工具重分配设计

> 设计日期：2026-06-23
> 关联模块：`apps/desktop/src/agent/`、`apps/desktop/package.json`、`prompt/`
> 状态：待实现

## 1. 背景与目标

当前 OwlOS Agent 运行时的文件工具存在以下问题：

1. `create_docx` 只能生成 Word 文档，无法满足用户生成 PPT、Excel、PDF、思维导图等多格式交付物的需求。
2. `write_file` 对所有 Agent 暴露，且无统一工作目录约束，存在路径越界风险。
3. Agent 工具权限边界不清晰：Sentinel 拥有写/执行能力，与其“调度者”定位不符；Worker 工具集缺少统一的多格式文件写入入口。

本设计目标：

- 引入统一的 `create_x_file` 文件写入工具，以插件化方式支持 `.docx`、`.pptx`、`.xlsx`、`.csv`、`.pdf`、`.xmind`、`.md`、`.txt` 等格式。
- 建立全局 Agent 工作目录配置（默认 `~/.config/owl-os/workspace`），所有文件读写工具基于该目录做路径解析与安全校验。
- 重新分配 Agent 工具权限：Elder 只保留调度；Sentinel 只保留读与协调；Worker 负责读/写/执行。

## 2. 工具权限分配

| Agent | 可用工具 | 说明 |
|-------|----------|------|
| Elder | `recruit_sentinel` | 仅负责识别任务复杂度并招募 Sentinel，不直接操作文件或执行命令 |
| Sentinel | `read_file`、`list_directory`、`dispatch_task`、`validate_output`、`submit_to_elder`、`recruit_workers` | 负责读目录、制定方案、招募/派发/校验 Worker、提交结果 |
| Worker | `read_file`、`list_directory`、`create_x_file`、`execute_command` | 负责读取上下文、生成多格式文件、执行命令 |

- `write_file` 不再暴露给任何 Agent，其能力退化为 `create_x_file` 内部 fallback。
- `create_docx` 不再暴露，能力并入 `create_x_file`。

## 3. 全局工作目录配置

### 3.1 配置项

新增 settings 键：

```ts
const AGENT_WORKSPACE_DIR_KEY = "agentWorkspaceDir";
const DEFAULT_AGENT_WORKSPACE_DIR = path.join(
  os.homedir(),
  ".config",
  "owl-os",
  "workspace"
);
```

### 3.2 核心工具函数

新建 `apps/desktop/src/agent/workspacePath.ts`：

```ts
export function getWorkspaceDir(): string;
export function ensureWorkspaceDir(): Promise<void>;
export function resolveWorkspacePath(input: string): string;
```

行为：

- `getWorkspaceDir` 从 SQLite `settings` 表读取；未设置则返回默认值。
- `ensureWorkspaceDir` 在启动时调用 `fs.mkdir(dir, { recursive: true })`。
- `resolveWorkspacePath`：
  - 相对路径：解析到 `agentWorkspaceDir` 下；
  - 绝对路径：仅当位于 `agentWorkspaceDir` 内才允许；
  - 禁止 `../`、符号链接跳出等路径遍历；
  - 越界时抛出标准化错误。

### 3.3 现有文件工具改造

- `read_file`：路径参数经 `resolveWorkspacePath` 解析。
- `list_directory`：路径参数经 `resolveWorkspacePath` 解析。
- `execute_command`：默认 `cwd` 从 `/tmp` 改为 `agentWorkspaceDir`；显式传入 `cwd` 时也需校验位于 workspace 内。

## 4. create_x_file 插件化架构

### 4.1 目录结构

```
apps/desktop/src/agent/
├── file-writers/
│   ├── index.ts              # 注册表 + writeXFile 入口
│   ├── types.ts              # 共享类型
│   ├── plain-text-writer.ts  # fallback：md/txt/未知格式
│   ├── docx-writer.ts        # .docx
│   ├── pptx-writer.ts        # .pptx
│   ├── xlsx-writer.ts        # .xlsx / .csv
│   ├── pdf-writer.ts         # .pdf
│   └── xmind-writer.ts       # .xmind
├── workspacePath.ts
└── tools.ts
```

### 4.2 类型定义

```ts
// file-writers/types.ts
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
  output_path: string; // 相对 workspace
  title?: string;
  format?: "docx" | "pptx" | "xlsx" | "csv" | "pdf" | "xmind" | "md" | "txt";
  content?: string;    // md/txt fallback
  sections?: Section[];
  sheets?: Sheet[];
  topics?: Topic[];
}

export interface FileWriter {
  extensions: string[];
  write(params: WriteXFileParams, resolvedPath: string): Promise<void>;
}
```

### 4.3 注册表与路由

`file-writers/index.ts`：

```ts
const writers: FileWriter[] = [
  plainTextWriter,
  docxWriter,
  pptxWriter,
  xlsxWriter,
  pdfWriter,
  xmindWriter,
];

const registry = new Map<string, FileWriter>();
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

- 未知扩展名 fallback 到 `plainTextWriter`。
- 若显式 `format` 与扩展名不一致，以扩展名为准，结果文本附带警告。

### 4.4 各格式数据映射

| 扩展名 | Writer | 使用字段 | 实现库 |
|--------|--------|----------|--------|
| `.docx` | `docx-writer.ts` | `title` + `sections` | `docx` |
| `.pptx` | `pptx-writer.ts` | `title` + `sections` | `pptxgenjs` |
| `.xlsx` | `xlsx-writer.ts` | `title` + `sheets` | `xlsx` |
| `.csv` | `xlsx-writer.ts` | `title` + `sheets[0]` | `xlsx` 序列化 |
| `.pdf` | `pdf-writer.ts` | `title` + `sections` | `pdf-lib` |
| `.xmind` | `xmind-writer.ts` | `title` + `topics` | `xmind-generator` |
| `.md/.txt/其他` | `plain-text-writer.ts` | `content` | `node:fs` |

### 4.5 新增依赖

在 `apps/desktop/package.json` 添加：

```json
{
  "docx": "^9.7.1",
  "pptxgenjs": "^4.0.1",
  "pdf-lib": "^1.17.1",
  "xmind-generator": "^1.0.1"
}
```

`xlsx` 已存在，继续沿用。

## 5. create_x_file 工具定义

在 `apps/desktop/src/agent/tools.ts` 中：

```ts
{
  name: "create_x_file",
  label: "创建结构化文件",
  description: `在 Agent 工作目录下创建 docx/pptx/xlsx/csv/pdf/xmind/md/txt 等文件。
- docx/pptx/pdf：使用 sections（标题+段落+代码块）
- xlsx/csv：使用 sheets（工作表+行+列）
- xmind：使用 topics（树形主题）
- md/txt/不支持的扩展名：使用 content 纯文本写入`,
  parameters: Type.Object({
    output_path: Type.String(),
    title: Type.Optional(Type.String()),
    format: Type.Optional(Type.String()),
    content: Type.Optional(Type.String()),
    sections: Type.Optional(Type.Array(
      Type.Object({
        heading: Type.String(),
        level: Type.Number(),
        paragraphs: Type.Array(Type.String()),
        code_blocks: Type.Optional(Type.Array(Type.String())),
      })
    )),
    sheets: Type.Optional(Type.Array(
      Type.Object({
        name: Type.String(),
        rows: Type.Array(Type.Array(Type.String())),
      })
    )),
    topics: Type.Optional(Type.Array(
      Type.Object({
        title: Type.String(),
        children: Type.Optional(Type.Array(Type.Any())),
      })
    )),
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

## 6. 错误处理

| 场景 | 行为 |
|------|------|
| 路径越界 | `resolveWorkspacePath` 抛出错误，`create_x_file` 返回 `生成失败：路径越界` |
| 不支持的扩展名 | fallback 到 `plainTextWriter`，使用 `content` 字段写纯文本 |
| `content` 为空但走 fallback | 写入空文件，结果文本提示“内容为空” |
| 生成库异常 | 捕获并返回工具结果，不崩溃主进程 |
| 文件已存在 | 默认覆盖，保证幂等性 |

## 7. 测试计划

新增测试目录 `apps/desktop/src/__tests__/file-writers/`：

- `workspacePath.test.ts`
  - 相对路径解析正确
  - `../` 越界抛错
  - workspace 外绝对路径抛错
  - workspace 内绝对路径允许
- `registry.test.ts`
  - 已知扩展名正确路由到对应 writer
  - 未知扩展名 fallback 到 plain-text
- `docx-writer.test.ts`
  - 调用后文件存在
  - 文件头为 ZIP/PK（docx 本质是 zip）
- `xlsx-writer.test.ts`
  - 调用后文件存在
  - 可解析出预期 sheet 名与单元格内容
- `plain-text-writer.test.ts`
  - fallback 内容正确写入 UTF-8

## 8. 提示词更新

### 8.1 `prompt/sentinel_planner.md`

- 禁止列表：`read_file`、`list_directory`、`execute_command`、`create_docx` → `read_file`、`list_directory`、`create_x_file`、`execute_command`。
- 输出约束：`create_docx` → `create_x_file`；路径说明改为 `~/.config/owl-os/workspace/文件名`。

### 8.2 `prompt/worker.md`

- 第 6 条：`create_docx` → `create_x_file`。
- 路径说明：`默认路径 /tmp/文件名.docx` → `~/.config/owl-os/workspace/文件名`。

## 9. 改动文件清单

### 新增文件

- `apps/desktop/src/agent/workspacePath.ts`
- `apps/desktop/src/agent/file-writers/index.ts`
- `apps/desktop/src/agent/file-writers/types.ts`
- `apps/desktop/src/agent/file-writers/plain-text-writer.ts`
- `apps/desktop/src/agent/file-writers/docx-writer.ts`
- `apps/desktop/src/agent/file-writers/pptx-writer.ts`
- `apps/desktop/src/agent/file-writers/xlsx-writer.ts`
- `apps/desktop/src/agent/file-writers/pdf-writer.ts`
- `apps/desktop/src/agent/file-writers/xmind-writer.ts`
- `apps/desktop/src/__tests__/file-writers/workspacePath.test.ts`
- `apps/desktop/src/__tests__/file-writers/registry.test.ts`
- `apps/desktop/src/__tests__/file-writers/docx-writer.test.ts`
- `apps/desktop/src/__tests__/file-writers/xlsx-writer.test.ts`
- `apps/desktop/src/__tests__/file-writers/plain-text-writer.test.ts`

### 修改文件

- `apps/desktop/package.json`（新增依赖）
- `apps/desktop/src/agent/tools.ts`（删除 `write_file`/`create_docx`，新增 `create_x_file`，改造 `read_file`/`list_directory`/`execute_command`）
- `apps/desktop/src/agent/owleryAgentFactory.ts`（按新分配挂载工具）
- `prompt/sentinel_planner.md`
- `prompt/worker.md`

## 10. 风险与后续扩展

- **依赖体积**：`pdf-lib`、`pptxgenjs` 会增加主进程包体积，评估后可接受。
- **xmind-generator 成熟度**：目前仅实现基础 topic 树；复杂样式、关系线等后续按需扩展。
- **向后兼容**：旧的 `write_file`/`create_docx` 不再暴露，当前处于迁移期，旧对话可能失效，需接受。
- **后续扩展**：`agentWorkspaceDir` 后续可通过「设置中心」UI 配置，本次仅预留 settings 键与读取接口。
