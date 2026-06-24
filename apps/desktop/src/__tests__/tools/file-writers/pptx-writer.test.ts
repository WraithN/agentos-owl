import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { getWorkspaceDir } from "../../../agent-runtime/workspace-path.js";
import { writeXFile } from "../../../agent-runtime/tools/file-writers/index.js";

describe("pptx writer", () => {
  const createdPaths: string[] = [];

  afterEach(async () => {
    for (const target of createdPaths) {
      await fs.rm(target, { recursive: true, force: true });
    }
    createdPaths.length = 0;
  });

  it("creates a pptx file from sections", async () => {
    const outputPath = "pptx-test.pptx";
    const resolved = await writeXFile({
      output_path: outputPath,
      title: "Test Deck",
      sections: [
        {
          heading: "Intro",
          level: 1,
          paragraphs: ["This is the introduction."],
          code_blocks: ["console.log('hello');"],
        },
      ],
    });
    createdPaths.push(resolved);

    expect(resolved).toBe(path.join(getWorkspaceDir(), outputPath));
    const stat = await fs.stat(resolved);
    expect(stat.isFile()).toBe(true);
    expect(stat.size).toBeGreaterThan(0);

    const buf = await fs.readFile(resolved);
    // PPTX 是 zip 文件，文件头以 PK 开头
    expect(buf.slice(0, 2).toString("hex")).toBe("504b");

    // 验证代码块以独立文本框展示，并使用等宽字体 Consolas
    const zip = await JSZip.loadAsync(buf);
    const slideXml = await zip.file("ppt/slides/slide2.xml")?.async("text");
    expect(slideXml).toBeDefined();

    const decodedSlide = slideXml!.replace(/&apos;/g, "'");
    expect(decodedSlide).toContain("This is the introduction.");
    expect(decodedSlide).toContain("console.log('hello');");
    expect(decodedSlide).toContain("Consolas");
    expect(decodedSlide).not.toContain("This is the introduction.console.log");
  });
});
