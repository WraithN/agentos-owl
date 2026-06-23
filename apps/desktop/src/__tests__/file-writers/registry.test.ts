import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import { getWorkspaceDir } from "../../agent/workspacePath.js";
import { writeXFile } from "../../agent/file-writers/index.js";

const OUTPUT_FILE_NAME = "foo.unknown";

describe("writeXFile registry", () => {
  afterEach(async () => {
    await fs.rm(path.join(getWorkspaceDir(), OUTPUT_FILE_NAME), { force: true });
  });

  it("falls back to plain text for unknown extensions", async () => {
    const resolved = await writeXFile({
      output_path: OUTPUT_FILE_NAME,
      content: "hi",
    });

    expect(resolved).toBe(path.join(getWorkspaceDir(), OUTPUT_FILE_NAME));
    const text = await fs.readFile(resolved, "utf-8");
    expect(text).toBe("hi");
  });
});
