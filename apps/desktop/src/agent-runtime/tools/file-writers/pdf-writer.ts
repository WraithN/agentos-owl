import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { FileWriter, WriteXFileParams } from "./types.js";

// 页面布局常量
const PAGE_MARGIN = 50; // 页面四边边距
const TITLE_FONT_SIZE = 20; // 标题字号
const SECTION_HEADING_FONT_SIZE = 14; // 小节标题字号
const PARAGRAPH_FONT_SIZE = 10; // 正文字号
const CODE_BLOCK_FONT_SIZE = 9; // 代码块字号

const TITLE_INDENT = PAGE_MARGIN; // 标题左侧缩进
const SECTION_HEADING_INDENT = PAGE_MARGIN; // 小节标题左侧缩进
const PARAGRAPH_INDENT = 60; // 段落左侧缩进
const CODE_BLOCK_INDENT = 70; // 代码块左侧缩进

const LINE_GAP = 8; // 行间距
const SECTION_GAP = 10; // 小节之间的额外间距
const TITLE_BOTTOM_GAP = 10; // 标题下方额外间距

const TEXT_COLOR = rgb(0, 0, 0); // 文本颜色：黑色

async function writePdf(
  params: WriteXFileParams,
  resolvedPath: string
): Promise<void> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  let page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  // 初始纵坐标：从页面顶部边距处开始
  let y = height - PAGE_MARGIN;

  /**
   * 在当前页面绘制文本，若当前页面剩余空间不足以容纳当前文本，
   * 则自动新增一页并重置纵坐标。
   * 注意：判断时要把字体高度 size 也考虑进去，避免文字被截断。
   */
  const drawText = (text: string, size: number, x: number) => {
    if (y - size < PAGE_MARGIN) {
      page = pdfDoc.addPage();
      y = height - PAGE_MARGIN;
    }
    page.drawText(text, { x, y, size, font, color: TEXT_COLOR });
    y -= size + LINE_GAP;
  };

  // 绘制标题
  if (params.title) {
    drawText(params.title, TITLE_FONT_SIZE, TITLE_INDENT);
    y -= TITLE_BOTTOM_GAP;
  }

  // 逐个小节绘制：标题、段落、代码块
  for (const section of params.sections ?? []) {
    drawText(section.heading, SECTION_HEADING_FONT_SIZE, SECTION_HEADING_INDENT);
    for (const para of section.paragraphs ?? []) {
      drawText(para, PARAGRAPH_FONT_SIZE, PARAGRAPH_INDENT);
    }
    for (const code of section.code_blocks ?? []) {
      drawText(code, CODE_BLOCK_FONT_SIZE, CODE_BLOCK_INDENT);
    }
    y -= SECTION_GAP;
  }

  const pdfBytes = await pdfDoc.save();
  await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
  await fs.writeFile(resolvedPath, pdfBytes);
}

export const pdfWriter: FileWriter = {
  extensions: [".pdf"],
  write: writePdf,
};
