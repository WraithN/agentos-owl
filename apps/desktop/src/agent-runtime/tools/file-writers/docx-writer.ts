import fs from "node:fs/promises";
import path from "node:path";
import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
} from "docx";
import type { FileWriter, WriteXFileParams } from "./types.js";

/** DOCX 标题层级映射，将输入 level 限制在 0-3 范围内 */
const LEVEL_MAP: Record<
  number,
  (typeof HeadingLevel)[keyof typeof HeadingLevel]
> = {
  0: HeadingLevel.TITLE,
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
};

/** 代码块字体 */
const CODE_FONT = "Consolas";
/** 代码块字号（half-points，20 对应 10pt） */
const CODE_SIZE = 20;

async function writeDocx(
  params: WriteXFileParams,
  resolvedPath: string
): Promise<void> {
  const children: Paragraph[] = [];

  if (params.title) {
    children.push(
      new Paragraph({
        text: params.title,
        heading: HeadingLevel.TITLE,
        alignment: "center",
      })
    );
  }

  for (const section of params.sections ?? []) {
    const level = Math.max(0, Math.min(section.level, 3));

    children.push(
      new Paragraph({
        text: section.heading,
        heading: LEVEL_MAP[level],
      })
    );

    for (const para of section.paragraphs ?? []) {
      children.push(new Paragraph(para));
    }

    for (const code of section.code_blocks ?? []) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: code,
              font: CODE_FONT,
              size: CODE_SIZE,
            }),
          ],
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const buf = await Packer.toBuffer(doc);
  await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
  await fs.writeFile(resolvedPath, buf);
}

export const docxWriter: FileWriter = {
  extensions: [".docx"],
  write: writeDocx,
};
