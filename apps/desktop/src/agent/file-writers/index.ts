import path from "node:path";
import {
  ensureWorkspaceDir,
  resolveWorkspacePath,
} from "../workspacePath.js";
import type { FileWriter, WriteXFileParams } from "./types.js";
import { plainTextWriter } from "./plain-text-writer.js";
import { docxWriter } from "./docx-writer.js";
import { xlsxWriter } from "./xlsx-writer.js";

// 注意：.json/.yaml/.yml 目前被 plainTextWriter 当作纯文本处理；
// 如果后续加入针对这些格式的专用 writer，需要调整注册顺序或优先级，
// 避免 plainTextWriter 继续优先匹配这些扩展名。
const writers: FileWriter[] = [plainTextWriter, docxWriter, xlsxWriter];

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
