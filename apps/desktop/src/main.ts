import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow } from "electron";
import { initDatabase } from "./db/connection.js";
import { registerIpcHandlers } from "./ipc/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;

// WSL2 / 容器环境通常缺少可用的 GPU 加速，强制使用软件渲染避免 X11/WSLg 图像传输错误
app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-gpu-compositing");
app.commandLine.appendSwitch("use-gl", "swiftshader");

function createWindow() {
  console.log("[main] creating BrowserWindow...");
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    title: "OwlOS",
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.webContents.on("did-finish-load", () => {
    console.log("[main] renderer did-finish-load");
  });

  win.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    console.error("[main] renderer did-fail-load:", errorCode, errorDescription);
  });

  win.webContents.on("render-process-gone", (_event, details) => {
    console.error("[main] render-process-gone:", details);
  });

  win.on("closed", () => {
    console.log("[main] BrowserWindow closed");
  });

  if (isDev) {
    console.log("[main] loading http://localhost:5173");
    win.loadURL("http://localhost:5173");
    if (process.env.OWL_OPEN_DEVTOOLS === "1") {
      win.webContents.openDevTools();
    }
  } else {
    console.log("[main] loading renderer/index.html");
    win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(async () => {
  console.log("[main] app ready, initializing database...");
  try {
    await initDatabase();
    console.log("[main] database initialized");
  } catch (err) {
    console.error("[main] database initialization failed:", err);
    throw err;
  }

  console.log("[main] registering IPC handlers...");
  registerIpcHandlers();
  console.log("[main] IPC handlers registered");

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  console.log("[main] window-all-closed");
  if (process.platform !== "darwin") app.quit();
});

process.on("uncaughtException", (err) => {
  console.error("[main] uncaughtException:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("[main] unhandledRejection:", reason);
});
