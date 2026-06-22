const OFFICE_PREVIEW_EXTENSION_SET = new Set(["docx", "xlsx", "pptx"]);

export function getFileExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export function canPreviewOfficeFile(fileName: string): boolean {
  return OFFICE_PREVIEW_EXTENSION_SET.has(getFileExtension(fileName));
}
