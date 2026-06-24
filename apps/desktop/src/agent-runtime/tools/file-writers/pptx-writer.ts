import fs from "node:fs/promises";
import path from "node:path";
import PptxGenJSImport from "pptxgenjs";
import type { FileWriter, Section, WriteXFileParams } from "./types.js";

// pptxgenjs 在不同运行时下默认导出形态不一致（直接 class 或 { default: class }），
// 这里做运行时解包，避免 tsx/esbuild 等场景下 `new PptxGenJS()` 报错。
const PptxGenJS =
  (PptxGenJSImport as unknown as { default?: typeof PptxGenJSImport }).default ??
  PptxGenJSImport;

// ============================================================
// 布局与样式常量（遵循 AGENTS.user.md Rule 2：魔法值提取为命名常量）
// ============================================================
const SLIDE_LAYOUT = "LAYOUT_16x9";
const ALIGN_CENTER = "center";

// 标题页
const TITLE_X = 1;
const TITLE_Y = 1;
const TITLE_W = "80%";
const TITLE_H = 1;
const TITLE_FONT_SIZE = 24;
const TITLE_BOLD = true;

// 章节标题
const HEADING_X = 0.5;
const HEADING_Y = 0.5;
const HEADING_W = "90%";
const HEADING_H = 0.8;
const HEADING_FONT_SIZE = 18;
const HEADING_BOLD = true;

// 正文段落
const BODY_X = 0.5;
const BODY_Y = 1.5;
const BODY_W = "90%";
const BODY_FONT_SIZE = 12;
const PARAGRAPHS_H_WITH_CODE = 1.5;
const PARAGRAPHS_H_FULL = "70%";

// 代码块（独立文本框，等宽字体，字号更小）
const CODE_FONT_FACE = "Consolas";
const CODE_FONT_SIZE = 10;
const CODE_X = 0.5;
const CODE_W = "90%";
const CODE_H = 1;
const CODE_GAP = 0.2;

function addTitleSlide(pptx: InstanceType<typeof PptxGenJS>, title: string): void {
  const slide = pptx.addSlide();
  slide.addText(title, {
    x: TITLE_X,
    y: TITLE_Y,
    w: TITLE_W,
    h: TITLE_H,
    fontSize: TITLE_FONT_SIZE,
    bold: TITLE_BOLD,
    align: ALIGN_CENTER,
  });
}

function addBodyText(
  slide: ReturnType<InstanceType<typeof PptxGenJS>["addSlide"]>,
  paragraphs: string[],
  hasCodeBlocks: boolean
): void {
  const body = paragraphs.join("\n");
  if (!body) return;

  slide.addText(body, {
    x: BODY_X,
    y: BODY_Y,
    w: BODY_W,
    h: hasCodeBlocks ? PARAGRAPHS_H_WITH_CODE : PARAGRAPHS_H_FULL,
    fontSize: BODY_FONT_SIZE,
  });
}

function addCodeBlocks(
  slide: ReturnType<InstanceType<typeof PptxGenJS>["addSlide"]>,
  codeBlocks: string[],
  startY: number
): void {
  for (const [index, code] of codeBlocks.entries()) {
    if (!code) continue;
    const y = startY + index * (CODE_H + CODE_GAP);
    slide.addText(code, {
      x: CODE_X,
      y,
      w: CODE_W,
      h: CODE_H,
      fontSize: CODE_FONT_SIZE,
      fontFace: CODE_FONT_FACE,
    });
  }
}

function addSectionSlide(pptx: InstanceType<typeof PptxGenJS>, section: Section): void {
  const slide = pptx.addSlide();
  slide.addText(section.heading, {
    x: HEADING_X,
    y: HEADING_Y,
    w: HEADING_W,
    h: HEADING_H,
    fontSize: HEADING_FONT_SIZE,
    bold: HEADING_BOLD,
  });

  const paragraphs = section.paragraphs ?? [];
  const codeBlocks = section.code_blocks ?? [];
  const hasParagraphs = paragraphs.length > 0;
  const hasCodeBlocks = codeBlocks.length > 0;

  if (hasParagraphs) {
    addBodyText(slide, paragraphs, hasCodeBlocks);
  }

  if (hasCodeBlocks) {
    const codeStartY = hasParagraphs ? BODY_Y + PARAGRAPHS_H_WITH_CODE + CODE_GAP : BODY_Y;
    addCodeBlocks(slide, codeBlocks, codeStartY);
  }
}

async function writePptx(
  params: WriteXFileParams,
  resolvedPath: string
): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.layout = SLIDE_LAYOUT;

  if (params.title) {
    addTitleSlide(pptx, params.title);
  }

  for (const section of params.sections ?? []) {
    addSectionSlide(pptx, section);
  }

  await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
  await pptx.writeFile({ fileName: resolvedPath });
}

export const pptxWriter: FileWriter = {
  extensions: [".pptx"],
  write: writePptx,
};
