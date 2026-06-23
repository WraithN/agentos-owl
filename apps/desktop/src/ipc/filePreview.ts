import { BrowserWindow, app, dialog, ipcMain } from "electron";
import crypto from "node:crypto";
import fs from "node:fs";
import JSZip from "jszip";
import mammoth from "mammoth";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";
import { FILE_PREVIEW_CONFIG } from "../config/filePreview.js";

interface OpenLocalFilePreviewRequest {
  sessionId: string;
  filePath: string;
}

interface GetLocalFileInfoRequest {
  filePath: string;
}

interface DownloadLocalFileRequest {
  filePath: string;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAFE_SEGMENT_PATTERN = /[^a-zA-Z0-9._-]+/g;
const SUPPORTED_EXTENSIONS = new Set([".docx", ".xlsx", ".pptx"]);
const DEFAULT_FILE_NAME = "document";

interface FilePreviewRecord {
  previewId: string;
  sessionId: string;
  filePath: string;
  fileName: string;
  html: string;
  sizeBytes: number;
  createdAt: number;
  expiresAt: number;
  window?: BrowserWindow;
}

interface CreateFilePreviewRequest {
  sessionId: string;
  fileName: string;
  data: ArrayBuffer;
}

interface PreviewIdRequest {
  previewId: string;
}

const filePreviewRecords = new Map<string, FilePreviewRecord>();

function getAppDataRoot(): string {
  const dir = path.join(os.homedir(), ".config", "owl-os");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function sanitizePathSegment(value: string): string {
  const cleaned = value.replace(SAFE_SEGMENT_PATTERN, "_").replace(/^_+|_+$/g, "");
  return cleaned || "unknown";
}

function normalizeFileName(value: string): string {
  return sanitizePathSegment(value.trim() || DEFAULT_FILE_NAME);
}

function getSessionPreviewDir(sessionId: string): string {
  return path.join(
    getAppDataRoot(),
    FILE_PREVIEW_CONFIG.tempRootDirName,
    sanitizePathSegment(sessionId),
    FILE_PREVIEW_CONFIG.featureDirName
  );
}

function assertSupportedFile(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  if (SUPPORTED_EXTENSIONS.has(ext)) return ext;
  throw new Error("FILE_PREVIEW_UNSUPPORTED_TYPE");
}

function assertPreviewSize(data: Buffer): number {
  const sizeBytes = data.byteLength;
  if (sizeBytes <= FILE_PREVIEW_CONFIG.maxPreviewBytes) return sizeBytes;
  const error = new Error("FILE_PREVIEW_TOO_LARGE") as Error & { code?: string; maxPreviewBytes?: number };
  error.code = "FILE_PREVIEW_TOO_LARGE";
  error.maxPreviewBytes = FILE_PREVIEW_CONFIG.maxPreviewBytes;
  throw error;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function wrapOfficeHtml(title: string, body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:24px;font-family:Inter,system-ui,sans-serif;background:#fff;color:#0f172a}.sheet{margin-bottom:32px}.sheet-title{margin:0 0 12px;font-size:18px;font-weight:700}table{width:max-content;min-width:100%;border-collapse:collapse;font-size:13px}td,th{border:1px solid #cbd5e1;padding:6px 8px;vertical-align:top;white-space:pre-wrap}th{background:#f1f5f9;font-weight:600}.docx{max-width:960px;margin:0 auto;line-height:1.65}.docx img{max-width:100%}.slides{display:grid;gap:24px;max-width:1040px;margin:0 auto}.slide{min-height:360px;border:1px solid #cbd5e1;border-radius:18px;background:linear-gradient(135deg,#f8fafc,#eef2ff);box-shadow:0 12px 40px rgba(15,23,42,.08);padding:28px}.slide-title{margin:0 0 18px;color:#475569;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}.slide-content{display:grid;gap:10px;font-size:20px;line-height:1.5}.slide-content p{margin:0}</style><title>${escapeHtml(title)}</title></head><body>${body}</body></html>`;
}

async function convertDocxToHtml(filePath: string, fileName: string): Promise<string> {
  const result = await mammoth.convertToHtml({ path: filePath });
  return wrapOfficeHtml(fileName, `<article class="docx">${result.value}</article>`);
}

function convertXlsxToHtml(filePath: string, fileName: string): string {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const body = workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const table = XLSX.utils.sheet_to_html(sheet, { id: sanitizePathSegment(sheetName) });
    return `<section class="sheet"><h2 class="sheet-title">${escapeHtml(sheetName)}</h2>${table}</section>`;
  }).join("");
  return wrapOfficeHtml(fileName, body || "<p>空工作簿</p>");
}

function getSlideIndex(fileName: string): number {
  return Number(fileName.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
}

function extractXmlText(xml: string): string[] {
  const matches = Array.from(xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g));
  return matches.map((match) => match[1].trim()).filter(Boolean);
}

async function convertPptxToHtml(filePath: string, fileName: string): Promise<string> {
  const zip = await JSZip.loadAsync(fs.readFileSync(filePath));
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => getSlideIndex(a) - getSlideIndex(b));
  const slides = await Promise.all(slideFiles.map(async (name, index) => {
    const xml = await zip.files[name].async("string");
    const paragraphs = extractXmlText(xml).map((text) => `<p>${escapeHtml(text)}</p>`).join("");
    return `<section class="slide"><h2 class="slide-title">Slide ${index + 1}</h2><div class="slide-content">${paragraphs || "<p>空白幻灯片</p>"}</div></section>`;
  }));
  return wrapOfficeHtml(fileName, `<main class="slides">${slides.join("") || "<p>空演示文稿</p>"}</main>`);
}

function deleteFileIfExists(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (error) {
    console.warn("[file-preview] failed to delete temp file", filePath, error);
  }
}

function deletePreviewRecord(previewId: string): void {
  const record = filePreviewRecords.get(previewId);
  if (!record) return;
  filePreviewRecords.delete(previewId);
  deleteFileIfExists(record.filePath);
}

function isRecordExpired(record: FilePreviewRecord): boolean {
  return Date.now() > record.expiresAt;
}

function createPreviewUrl(previewId: string): string {
  const hashPath = `#/file-preview/${encodeURIComponent(previewId)}`;
  if (!app.isPackaged) {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL ?? "http://localhost:5173";
    return `${devServerUrl}${hashPath}`;
  }
  return `file://${path.join(__dirname, "../renderer/index.html")}${hashPath}`;
}

function createPreviewWindow(record: FilePreviewRecord): BrowserWindow {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    title: "文件安全预览",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.maximize();
  win.on("closed", () => deletePreviewRecord(record.previewId));
  void win.loadURL(createPreviewUrl(record.previewId));
  return win;
}

function cleanupExpiredFilePreviewFiles(): void {
  const root = path.join(getAppDataRoot(), FILE_PREVIEW_CONFIG.tempRootDirName);
  if (!fs.existsSync(root)) return;
  const now = Date.now();

  for (const sessionDir of fs.readdirSync(root, { withFileTypes: true })) {
    if (!sessionDir.isDirectory()) continue;
    const previewDir = path.join(root, sessionDir.name, FILE_PREVIEW_CONFIG.featureDirName);
    if (!fs.existsSync(previewDir)) continue;
    for (const entry of fs.readdirSync(previewDir, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const filePath = path.join(previewDir, entry.name);
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > FILE_PREVIEW_CONFIG.tempFileTtlMs) deleteFileIfExists(filePath);
    }
  }
}

async function createTempFile(req: CreateFilePreviewRequest) {
  const ext = assertSupportedFile(req.fileName);
  const data = Buffer.from(req.data);
  const sizeBytes = assertPreviewSize(data);
  const previewId = crypto.randomUUID();
  const createdAt = Date.now();
  const expiresAt = createdAt + FILE_PREVIEW_CONFIG.tempFileTtlMs;
  const previewDir = getSessionPreviewDir(req.sessionId);
  const fileName = normalizeFileName(req.fileName);
  const filePath = path.join(previewDir, `${createdAt}-${crypto.randomBytes(4).toString("hex")}-${fileName}`);
  fs.mkdirSync(previewDir, { recursive: true });
  fs.writeFileSync(filePath, data);

  const html = ext === ".docx"
    ? await convertDocxToHtml(filePath, fileName)
    : ext === ".pptx"
      ? await convertPptxToHtml(filePath, fileName)
      : convertXlsxToHtml(filePath, fileName);

  const record: FilePreviewRecord = {
    previewId,
    sessionId: sanitizePathSegment(req.sessionId),
    filePath,
    fileName,
    html,
    sizeBytes,
    createdAt,
    expiresAt,
  };
  filePreviewRecords.set(previewId, record);
  return { previewId, fileName, sizeBytes, expiresAt, maxPreviewBytes: FILE_PREVIEW_CONFIG.maxPreviewBytes };
}

function readPreview(req: PreviewIdRequest) {
  const record = filePreviewRecords.get(req.previewId);
  if (!record || isRecordExpired(record) || !fs.existsSync(record.filePath)) {
    deletePreviewRecord(req.previewId);
    return null;
  }
  return {
    previewId: record.previewId,
    fileName: record.fileName,
    html: record.html,
    sizeBytes: record.sizeBytes,
    expiresAt: record.expiresAt,
  };
}

function resolveLocalFilePath(filePath: string): string {
  return filePath.startsWith("~")
    ? path.join(os.homedir(), filePath.slice(1))
    : filePath;
}

function getLocalFileInfo(req: GetLocalFileInfoRequest) {
  const resolvedPath = resolveLocalFilePath(req.filePath);
  if (!fs.existsSync(resolvedPath)) {
    return { exists: false, filePath: req.filePath, fileName: path.basename(resolvedPath) };
  }
  const stat = fs.statSync(resolvedPath);
  return {
    exists: true,
    filePath: req.filePath,
    fileName: path.basename(resolvedPath),
    sizeBytes: stat.size,
    createdAt: stat.birthtimeMs,
    modifiedAt: stat.mtimeMs,
  };
}

async function downloadLocalFile(req: DownloadLocalFileRequest) {
  const resolvedPath = resolveLocalFilePath(req.filePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error("FILE_PREVIEW_FILE_NOT_FOUND");
  }
  const fileName = path.basename(resolvedPath);
  const result = await dialog.showSaveDialog({
    title: "保存原始文件",
    defaultPath: fileName,
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  fs.copyFileSync(resolvedPath, result.filePath);
  return { canceled: false, filePath: result.filePath };
}

async function openLocalFilePreview(req: OpenLocalFilePreviewRequest) {
  const resolvedPath = resolveLocalFilePath(req.filePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error("FILE_PREVIEW_FILE_NOT_FOUND");
  }
  const fileName = path.basename(resolvedPath);
  const buffer = fs.readFileSync(resolvedPath);
  const data = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const result = await createTempFile({ sessionId: req.sessionId, fileName, data });
  const record = filePreviewRecords.get(result.previewId);
  if (!record) {
    throw new Error("FILE_PREVIEW_CREATE_FAILED");
  }
  if (record.window && !record.window.isDestroyed()) {
    record.window.focus();
  } else {
    record.window = createPreviewWindow(record);
  }
  return { previewId: result.previewId, fileName: result.fileName };
}

async function saveAs(req: PreviewIdRequest) {
  const record = filePreviewRecords.get(req.previewId);
  if (!record || !fs.existsSync(record.filePath)) return { canceled: true };
  const result = await dialog.showSaveDialog({
    title: "保存原始文件",
    defaultPath: record.fileName,
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  fs.copyFileSync(record.filePath, result.filePath);
  return { canceled: false, filePath: result.filePath };
}

export function registerFilePreviewHandlers(): void {
  cleanupExpiredFilePreviewFiles();

  ipcMain.handle("file_preview_create_temp_file", (_event, req: CreateFilePreviewRequest) => createTempFile(req));
  ipcMain.handle("file_preview_read", (_event, req: PreviewIdRequest) => readPreview(req));
  ipcMain.handle("file_preview_save_as", (_event, req: PreviewIdRequest) => saveAs(req));
  ipcMain.handle("file_preview_open_local_file", (_event, req: OpenLocalFilePreviewRequest) => openLocalFilePreview(req));
  ipcMain.handle("file_preview_get_local_file_info", (_event, req: GetLocalFileInfoRequest) => getLocalFileInfo(req));
  ipcMain.handle("file_preview_download_local_file", (_event, req: DownloadLocalFileRequest) => downloadLocalFile(req));
  ipcMain.handle("file_preview_open_window", (_event, req: PreviewIdRequest) => {
    const record = filePreviewRecords.get(req.previewId);
    if (!record) return { ok: false };
    if (record.window && !record.window.isDestroyed()) {
      record.window.focus();
      return { ok: true };
    }
    record.window = createPreviewWindow(record);
    return { ok: true };
  });
  ipcMain.handle("file_preview_close_window", (_event, req: PreviewIdRequest) => {
    const record = filePreviewRecords.get(req.previewId);
    if (record?.window && !record.window.isDestroyed()) record.window.close();
    deletePreviewRecord(req.previewId);
    return { ok: true };
  });

  app.on("before-quit", () => {
    for (const previewId of filePreviewRecords.keys()) deletePreviewRecord(previewId);
  });
}
