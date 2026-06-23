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
