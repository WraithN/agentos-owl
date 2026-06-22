import { BrowserWindow, app, dialog, ipcMain } from "electron";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HTML_PREVIEW_CONFIG } from "../config/htmlPreview.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAFE_SEGMENT_PATTERN = /[^a-zA-Z0-9._-]+/g;
const HTML_EXTENSION = ".html";
const TEXT_HTML_FILTER = { name: "HTML", extensions: ["html", "htm"] };
const DEFAULT_FILE_NAME = "preview.html";

interface HtmlPreviewRecord {
  previewId: string;
  sessionId: string;
  filePath: string;
  fileName: string;
  sizeBytes: number;
  createdAt: number;
  expiresAt: number;
  window?: BrowserWindow;
}

interface CreateTempFileRequest {
  sessionId: string;
  html: string;
  title?: string;
}

interface PreviewIdRequest {
  previewId: string;
}

interface SaveAsRequest {
  html: string;
  defaultName?: string;
}

const previewRecords = new Map<string, HtmlPreviewRecord>();

function getAppDataRoot(): string {
  const dir = path.join(os.homedir(), ".config", "owl-os");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function sanitizePathSegment(value: string): string {
  const cleaned = value.replace(SAFE_SEGMENT_PATTERN, "_").replace(/^_+|_+$/g, "");
  return cleaned || "unknown";
}

function normalizeHtmlFileName(value?: string): string {
  const source = value?.trim() || DEFAULT_FILE_NAME;
  const cleaned = sanitizePathSegment(source);
  return cleaned.toLowerCase().endsWith(HTML_EXTENSION) ? cleaned : `${cleaned}${HTML_EXTENSION}`;
}

function getSessionPreviewDir(sessionId: string): string {
  return path.join(
    getAppDataRoot(),
    HTML_PREVIEW_CONFIG.tempRootDirName,
    sanitizePathSegment(sessionId),
    HTML_PREVIEW_CONFIG.featureDirName
  );
}

function assertPreviewSize(html: string): number {
  const sizeBytes = Buffer.byteLength(html, "utf8");
  if (sizeBytes <= HTML_PREVIEW_CONFIG.maxPreviewBytes) return sizeBytes;
  const error = new Error("HTML_PREVIEW_TOO_LARGE") as Error & { code?: string; maxPreviewBytes?: number };
  error.code = "HTML_PREVIEW_TOO_LARGE";
  error.maxPreviewBytes = HTML_PREVIEW_CONFIG.maxPreviewBytes;
  throw error;
}

function deleteFileIfExists(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (error) {
    console.warn("[html-preview] failed to delete temp file", filePath, error);
  }
}

function deletePreviewRecord(previewId: string): void {
  const record = previewRecords.get(previewId);
  if (!record) return;
  previewRecords.delete(previewId);
  deleteFileIfExists(record.filePath);
}

function isRecordExpired(record: HtmlPreviewRecord): boolean {
  return Date.now() > record.expiresAt;
}

function createPreviewUrl(previewId: string): string {
  const hashPath = `#/html-preview/${encodeURIComponent(previewId)}`;
  if (!app.isPackaged) {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL ?? "http://localhost:5173";
    return `${devServerUrl}${hashPath}`;
  }
  return `file://${path.join(__dirname, "../renderer/index.html")}${hashPath}`;
}

function createPreviewWindow(record: HtmlPreviewRecord): BrowserWindow {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    title: "HTML 安全预览",
    frame: false,
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

function cleanupExpiredHtmlPreviewFiles(): void {
  const root = path.join(getAppDataRoot(), HTML_PREVIEW_CONFIG.tempRootDirName);
  if (!fs.existsSync(root)) return;
  const now = Date.now();

  for (const sessionDir of fs.readdirSync(root, { withFileTypes: true })) {
    if (!sessionDir.isDirectory()) continue;
    const previewDir = path.join(root, sessionDir.name, HTML_PREVIEW_CONFIG.featureDirName);
    if (!fs.existsSync(previewDir)) continue;
    for (const entry of fs.readdirSync(previewDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(HTML_EXTENSION)) continue;
      const filePath = path.join(previewDir, entry.name);
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > HTML_PREVIEW_CONFIG.tempFileTtlMs) deleteFileIfExists(filePath);
    }
  }
}

function createTempFile(req: CreateTempFileRequest) {
  const sizeBytes = assertPreviewSize(req.html);
  const previewId = crypto.randomUUID();
  const createdAt = Date.now();
  const expiresAt = createdAt + HTML_PREVIEW_CONFIG.tempFileTtlMs;
  const previewDir = getSessionPreviewDir(req.sessionId);
  const fileName = normalizeHtmlFileName(req.title ?? `preview-${createdAt}-${crypto.randomBytes(4).toString("hex")}`);
  const filePath = path.join(previewDir, fileName);
  fs.mkdirSync(previewDir, { recursive: true });
  fs.writeFileSync(filePath, req.html, "utf8");

  const record: HtmlPreviewRecord = {
    previewId,
    sessionId: sanitizePathSegment(req.sessionId),
    filePath,
    fileName,
    sizeBytes,
    createdAt,
    expiresAt,
  };
  previewRecords.set(previewId, record);
  return { previewId, fileName, sizeBytes, expiresAt, maxPreviewBytes: HTML_PREVIEW_CONFIG.maxPreviewBytes };
}

function readPreview(req: PreviewIdRequest) {
  const record = previewRecords.get(req.previewId);
  if (!record || isRecordExpired(record) || !fs.existsSync(record.filePath)) {
    deletePreviewRecord(req.previewId);
    return null;
  }
  return {
    previewId: record.previewId,
    fileName: record.fileName,
    html: fs.readFileSync(record.filePath, "utf8"),
    sizeBytes: record.sizeBytes,
    expiresAt: record.expiresAt,
  };
}

async function saveAs(req: SaveAsRequest) {
  const result = await dialog.showSaveDialog({
    title: "保存 HTML 文件",
    defaultPath: path.join(os.homedir(), "Downloads", normalizeHtmlFileName(req.defaultName)),
    filters: [TEXT_HTML_FILTER, { name: "All Files", extensions: ["*"] }],
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  fs.writeFileSync(result.filePath, req.html, "utf8");
  return { canceled: false, filePath: result.filePath };
}

export function registerHtmlPreviewHandlers(): void {
  cleanupExpiredHtmlPreviewFiles();

  ipcMain.handle("html_preview_create_temp_file", (_event, req: CreateTempFileRequest) => createTempFile(req));
  ipcMain.handle("html_preview_read", (_event, req: PreviewIdRequest) => readPreview(req));
  ipcMain.handle("html_preview_save_as", (_event, req: SaveAsRequest) => saveAs(req));
  ipcMain.handle("html_preview_open_window", (_event, req: PreviewIdRequest) => {
    const record = previewRecords.get(req.previewId);
    if (!record) return { ok: false };
    if (record.window && !record.window.isDestroyed()) {
      record.window.focus();
      return { ok: true };
    }
    record.window = createPreviewWindow(record);
    return { ok: true };
  });
  ipcMain.handle("html_preview_close_window", (_event, req: PreviewIdRequest) => {
    const record = previewRecords.get(req.previewId);
    if (record?.window && !record.window.isDestroyed()) record.window.close();
    deletePreviewRecord(req.previewId);
    return { ok: true };
  });

  app.on("before-quit", () => {
    for (const previewId of previewRecords.keys()) deletePreviewRecord(previewId);
  });
}
