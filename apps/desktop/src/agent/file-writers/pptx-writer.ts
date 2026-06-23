import fs from "node:fs/promises";
import path from "node:path";
import PptxGenJSImport from "pptxgenjs";
import type { FileWriter, WriteXFileParams } from "./types.js";

// pptxgenjs 在不同运行时下默认导出形态不一致（直接 class 或 { default: class }），
// 这里做运行时解包，避免 tsx/esbuild 等场景下 `new PptxGenJS()` 报错。
const PptxGenJS =
  (PptxGenJSImport as unknown as { default?: typeof PptxGenJSImport }).default ??
  PptxGenJSImport;

async function writePptx(
  params: WriteXFileParams,
  resolvedPath: string
): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";

  if (params.title) {
    const slide = pptx.addSlide();
    slide.addText(params.title, {
      x: 1,
      y: 1,
      w: "80%",
      h: 1,
      fontSize: 24,
      bold: true,
      align: "center",
    });
  }

  for (const section of params.sections ?? []) {
    const slide = pptx.addSlide();
    slide.addText(section.heading, {
      x: 0.5,
      y: 0.5,
      w: "90%",
      h: 0.8,
      fontSize: 18,
      bold: true,
    });

    const body = [
      ...(section.paragraphs ?? []),
      ...(section.code_blocks ?? []).map((c) => `\n${c}\n`),
    ].join("\n");

    if (body) {
      slide.addText(body, {
        x: 0.5,
        y: 1.5,
        w: "90%",
        h: "70%",
        fontSize: 12,
      });
    }
  }

  await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
  await pptx.writeFile({ fileName: resolvedPath });
}

export const pptxWriter: FileWriter = {
  extensions: [".pptx"],
  write: writePptx,
};
