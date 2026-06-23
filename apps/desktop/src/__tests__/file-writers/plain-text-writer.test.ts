import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import { getWorkspaceDir } from "../../agent/workspacePath.js";
import { writeXFile } from "../../agent/file-writers/index.js";

describe("plain-text writer", () => {
  const createdPaths: string[] = [];

  afterEach(async () => {
    for (const target of createdPaths) {
      await fs.rm(target, { recursive: true, force: true });
    }
    createdPaths.length = 0;
  });

  it("writes markdown content to workspace", async () => {
    const outputPath = "plain-text-test.md";
    const resolved = await writeXFile({
      output_path: outputPath,
      content: "# Hello\n\nWorld",
    });
    createdPaths.push(resolved);

    expect(resolved).toBe(path.join(getWorkspaceDir(), outputPath));
    const text = await fs.readFile(resolved, "utf-8");
    expect(text).toBe("# Hello\n\nWorld");
  });

  it("writes txt content", async () => {
    const outputPath = "plain-text-test.txt";
    const resolved = await writeXFile({
      output_path: outputPath,
      content: "line1\nline2",
    });
    createdPaths.push(resolved);

    const text = await fs.readFile(resolved, "utf-8");
    expect(text).toBe("line1\nline2");
  });

  it("fallbacks unknown extension to plain text", async () => {
    const outputPath = "plain-text-test.unknown";
    const resolved = await writeXFile({
      output_path: outputPath,
      content: "fallback",
    });
    createdPaths.push(resolved);

    const text = await fs.readFile(resolved, "utf-8");
    expect(text).toBe("fallback");
  });

  it("writes an empty file when content is undefined", async () => {
    const outputPath = "empty-test.txt";
    const resolved = await writeXFile({ output_path: outputPath });
    createdPaths.push(resolved);

    const text = await fs.readFile(resolved, "utf-8");
    expect(text).toBe("");
  });

  it("creates nested directories", async () => {
    const outputPath = "subdir/nested.txt";
    const resolved = await writeXFile({
      output_path: outputPath,
      content: "nested",
    });
    createdPaths.push(resolved);
    createdPaths.push(path.join(getWorkspaceDir(), "subdir"));

    expect(resolved).toBe(path.join(getWorkspaceDir(), outputPath));
    const text = await fs.readFile(resolved, "utf-8");
    expect(text).toBe("nested");
  });
});
