import { BrowserWindow, ipcMain } from "electron";

export function registerWindowHandlers(): void {
  ipcMain.handle("window_minimize", () => {
    BrowserWindow.getFocusedWindow()?.minimize();
  });

  ipcMain.handle("window_maximize", () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return;
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  });

  ipcMain.handle("window_close", () => {
    BrowserWindow.getFocusedWindow()?.close();
  });

  ipcMain.handle("window_is_maximized", () => {
    return BrowserWindow.getFocusedWindow()?.isMaximized() ?? false;
  });

  // 预加载脚本无法直接调用 BrowserWindow，主进程监听状态变化后主动推送
  const notifyResize = () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return;
    const isMaximized = win.isMaximized();
    win.webContents.send("window_resized", { isMaximized });
  };

  ipcMain.handle("window_start_resize_listener", () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return;
    win.on("resize", notifyResize);
    win.on("maximize", notifyResize);
    win.on("unmaximize", notifyResize);
  });
}
