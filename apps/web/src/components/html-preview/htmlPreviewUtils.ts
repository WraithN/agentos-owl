const HTML_LANGUAGE_SET = new Set(["html", "htm"]);
const HTML_STRUCTURE_PATTERN = /<!doctype\s+html|<html[\s>]|<head[\s>]|<body[\s>]|<script[\s>]|<style[\s>]/i;
const TITLE_PATTERN = /<title[^>]*>([^<]*)<\/title>/i;
const UNSAFE_FILENAME_PATTERN = /[^a-zA-Z0-9._-]+/g;
const DEFAULT_HTML_FILE_NAME = "preview.html";

export function isHtmlCode(language: string, code: string): boolean {
  if (HTML_LANGUAGE_SET.has(language.toLowerCase())) return true;
  return HTML_STRUCTURE_PATTERN.test(code);
}

export function getHtmlTitle(code: string): string | undefined {
  const title = code.match(TITLE_PATTERN)?.[1]?.trim();
  return title || undefined;
}

export function getHtmlDefaultFileName(code: string, fallback?: string): string {
  const source = fallback ?? getHtmlTitle(code) ?? DEFAULT_HTML_FILE_NAME;
  const normalized = source.replace(UNSAFE_FILENAME_PATTERN, "_").replace(/^_+|_+$/g, "");
  if (!normalized) return DEFAULT_HTML_FILE_NAME;
  return normalized.toLowerCase().endsWith(".html") ? normalized : `${normalized}.html`;
}
