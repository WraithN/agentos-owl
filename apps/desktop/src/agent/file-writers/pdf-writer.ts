import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { FileWriter, WriteXFileParams } from "./types.js";

async function writePdf(
  params: WriteXFileParams,
  resolvedPath: string
): Promise<void> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  let page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  let y = height - 50;

  const drawText = (text: string, size: number, x: number) => {
    if (y < 50) {
      page = pdfDoc.addPage();
      y = height - 50;
    }
    page.drawText(text, { x, y, size, font, color: rgb(0, 0, 0) });
    y -= size + 8;
  };

  if (params.title) {
    drawText(params.title, 20, 50);
    y -= 10;
  }

  for (const section of params.sections ?? []) {
    drawText(section.heading, 14, 50);
    for (const para of section.paragraphs ?? []) {
      drawText(para, 10, 60);
    }
    for (const code of section.code_blocks ?? []) {
      drawText(code, 9, 70);
    }
    y -= 10;
  }

  const pdfBytes = await pdfDoc.save();
  await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
  await fs.writeFile(resolvedPath, pdfBytes);
}

export const pdfWriter: FileWriter = {
  extensions: [".pdf"],
  write: writePdf,
};
