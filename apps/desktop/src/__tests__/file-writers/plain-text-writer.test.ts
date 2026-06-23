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
