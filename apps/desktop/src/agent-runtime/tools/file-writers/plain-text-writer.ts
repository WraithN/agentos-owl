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
