import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import { getWorkspaceDir } from "../../agent/workspacePath.js";
import { writeXFile } from "../../agent/file-writers/index.js";

describe("docx writer", () => {
  const createdPaths: string[] = [];

  afterEach(async () => {
    for (const target of createdPaths) {
      await fs.rm(target, { recursive: true, force: true });
    }
    createdPaths.length = 0;
  });

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
    createdPaths.push(resolved);

    expect(resolved).toBe(path.join(getWorkspaceDir(), outputPath));
    const stat = await fs.stat(resolved);
    expect(stat.isFile()).toBe(true);
    expect(stat.size).toBeGreaterThan(0);

    const buf = await fs.readFile(resolved);
    // DOCX 是 zip 文件，文件头以 PK 开头
    expect(buf.slice(0, 2).toString("hex")).toBe("504b");
  });
});
