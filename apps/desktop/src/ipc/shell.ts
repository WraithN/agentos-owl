import { ipcMain, dialog } from "electron";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { shell } from "electron";

const execFileAsync = promisify(execFile);

export function registerShellHandlers(): void {
  ipcMain.handle("shell_open", async (_event, target: string) => {
    await shell.openPath(target);
  });

  ipcMain.handle("shell_open_external", async (_event, url: string) => {
    await shell.openExternal(url);
  });

  ipcMain.handle("shell_exec", async (_event, command: string, args: string[]) => {
    const { stdout, stderr } = await execFileAsync(command, args ?? [], { encoding: "utf-8" });
    return { stdout, stderr };
  });

  ipcMain.handle("shell_spawn", (_event, command: string, args: string[]) => {
    return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve) => {
      const child = spawn(command, args ?? [], { stdio: "pipe" });
      let stdout = "";
      let stderr = "";
      child.stdout?.on("data", (data) => { stdout += data.toString(); });
      child.stderr?.on("data", (data) => { stderr += data.toString(); });
      child.on("close", (code) => { resolve({ code, stdout, stderr }); });
    });
  });

  ipcMain.handle("run_shell", (_event, command: string, args: string[]) => {
    return new Promise<{ stdout: string; stderr: string; exitCode?: number }>((resolve) => {
      const child = spawn(command, args ?? [], { stdio: "pipe" });
      let stdout = "";
      let stderr = "";
      child.stdout?.on("data", (data) => { stdout += data.toString(); });
      child.stderr?.on("data", (data) => { stderr += data.toString(); });
      child.on("close", (code) => { resolve({ stdout, stderr, exitCode: code ?? undefined }); });
    });
  });

  ipcMain.handle("show_open_dialog", async (_event, options: Electron.OpenDialogOptions) => {
    return dialog.showOpenDialog(options);
  });

  ipcMain.handle("show_save_dialog", async (_event, options: Electron.SaveDialogOptions) => {
    return dialog.showSaveDialog(options);
  });
}
