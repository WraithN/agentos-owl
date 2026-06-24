import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { getWorkspaceDir } from "../../../agent-runtime/workspace-path.js";
import { writeXFile } from "../../../agent-runtime/tools/file-writers/index.js";

async function assertPdfHeader(targetPath: string): Promise<void> {
  const buf = await fs.readFile(targetPath);
  expect(buf.slice(0, 4).toString("utf-8")).toBe("%PDF");
}

async function loadPdfPageCount(targetPath: string): Promise<number> {
  const buf = await fs.readFile(targetPath);
  const pdfDoc = await PDFDocument.load(buf);
  return pdfDoc.getPageCount();
}

describe("pdf writer", () => {
  const createdPaths: string[] = [];

  afterEach(async () => {
    for (const target of createdPaths) {
      await fs.rm(target, { recursive: true, force: true });
    }
    createdPaths.length = 0;
  });

  it("creates a pdf file from sections", async () => {
    const outputPath = "pdf-test.pdf";
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

    await assertPdfHeader(resolved);
  });

  it("handles multiple sections", async () => {
    const resolved = await writeXFile({
      output_path: "pdf-multi-sections.pdf",
      title: "Multi Section Report",
      sections: [
        {
          heading: "Intro",
          level: 1,
          paragraphs: ["Introduction paragraph."],
        },
        {
          heading: "Details",
          level: 1,
          paragraphs: ["Details paragraph one.", "Details paragraph two."],
        },
        {
          heading: "Conclusion",
          level: 1,
          paragraphs: ["Conclusion paragraph."],
        },
      ],
    });
    createdPaths.push(resolved);

    await assertPdfHeader(resolved);
    expect(await loadPdfPageCount(resolved)).toBe(1);
  });

  it("renders code blocks", async () => {
    const resolved = await writeXFile({
      output_path: "pdf-code-blocks.pdf",
      title: "Code Example",
      sections: [
        {
          heading: "Implementation",
          level: 1,
          paragraphs: ["See the implementation below."],
          code_blocks: ["const x = 1;\nconsole.log(x);"],
        },
      ],
    });
    createdPaths.push(resolved);

    await assertPdfHeader(resolved);
    expect(await loadPdfPageCount(resolved)).toBe(1);
  });

  it("creates a second page for long content", async () => {
    // 构造足够多的段落，使其总高度超过单页可用空间，触发分页逻辑
    const longParagraphs: string[] = [];
    for (let i = 0; i < 80; i++) {
      longParagraphs.push(
        `This is a long paragraph line ${i + 1} used to fill the page height and force pagination when rendered by the PDF writer.`
      );
    }

    const resolved = await writeXFile({
      output_path: "pdf-long-content.pdf",
      title: "Long Content Report",
      sections: [
        {
          heading: "Very Long Section",
          level: 1,
          paragraphs: longParagraphs,
        },
      ],
    });
    createdPaths.push(resolved);

    await assertPdfHeader(resolved);
    expect(await loadPdfPageCount(resolved)).toBeGreaterThan(1);
  });

  it("supports title-only input", async () => {
    const resolved = await writeXFile({
      output_path: "pdf-title-only.pdf",
      title: "Only Title",
    });
    createdPaths.push(resolved);

    await assertPdfHeader(resolved);
    expect(await loadPdfPageCount(resolved)).toBe(1);
  });
});
