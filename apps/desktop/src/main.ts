import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, screen } from "electron";
import { initDatabase } from "./db/connection.js";
import { registerIpcHandlers } from "./ipc/index.js";
import { setWebSocketOwleryRef } from "./agent/owleryRuntime.js";
import { Owlery as WebSocketOwlery } from "./owlery/Owlery.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;
let webSocketOwlery: WebSocketOwlery | undefined;

// WSL2 / 容器环境通常缺少可用的 GPU 加速，强制使用软件渲染避免 X11/WSLg 图像传输错误
app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-gpu-compositing");
app.commandLine.appendSwitch("use-gl", "swiftshader");

function createWindow() {
  console.log("[main] creating BrowserWindow...");
  const primaryDisplay = screen.getPrimaryDisplay();
  const scaleFactor = primaryDisplay.scaleFactor;
  // 在高 DPI / 小字号显示器上整体放大界面，保证可读性
  const zoomFactor = scaleFactor >= 1.5 ? scaleFactor : Math.max(1.0, scaleFactor * 1.1);
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
  win.webContents.setZoomFactor(zoomFactor);
  console.log(`[main] display scaleFactor=${scaleFactor}, applied zoomFactor=${zoomFactor}`);

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
    const devServerUrl = process.env.VITE_DEV_SERVER_URL ?? "http://localhost:5173";
    console.log(`[main] loading ${devServerUrl}`);
    win.loadURL(devServerUrl);
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

  const webSocketPort = Number(process.env.OWLERY_WS_PORT ?? 8765);
  webSocketOwlery = new WebSocketOwlery({ webSocketPort });
  setWebSocketOwleryRef(webSocketOwlery);
  console.log(`[main] Owlery WebSocket server listening on ${webSocketPort}`);

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  console.log("[main] window-all-closed");
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  void webSocketOwlery?.close();
});

process.on("uncaughtException", (err) => {
  console.error("[main] uncaughtException:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("[main] unhandledRejection:", reason);
});
