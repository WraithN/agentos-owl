import path from "node:path";
import {
  ensureWorkspaceDir,
  resolveWorkspacePath,
} from "../workspacePath.js";
import type { FileWriter, WriteXFileParams } from "./types.js";
import { plainTextWriter } from "./plain-text-writer.js";

const writers: FileWriter[] = [plainTextWriter];

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
