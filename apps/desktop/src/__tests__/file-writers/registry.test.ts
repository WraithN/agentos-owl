import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import { getWorkspaceDir } from "../../agent/workspacePath.js";
import { writeXFile } from "../../agent/file-writers/index.js";

describe("writeXFile registry", () => {
  it("falls back to plain text for unknown extensions", async () => {
    const outputPath = "foo.unknown";
    const resolved = await writeXFile({
      output_path: outputPath,
      content: "hi",
    });

    expect(resolved).toBe(path.join(getWorkspaceDir(), outputPath));
    const text = await fs.readFile(resolved, "utf-8");
    expect(text).toBe("hi");
  });
});
