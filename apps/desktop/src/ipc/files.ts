import { ipcMain, app } from "electron";
import fs from "node:fs";
import path from "node:path";

export function registerFileHandlers(): void {
  ipcMain.handle(
    "save_upload_file",
    (_event, bucketName: string, filePath: string, fileName: string, data: ArrayBuffer) => {
      const userData = app.getPath("userData");
      const uploadDir = filePath
        ? path.join(userData, "uploads", bucketName, filePath)
        : path.join(userData, "uploads", bucketName);
      fs.mkdirSync(uploadDir, { recursive: true });
      const fullPath = path.join(uploadDir, fileName);
      fs.writeFileSync(fullPath, Buffer.from(data));
      return fullPath;
    }
  );

  ipcMain.handle("get_app_data_dir", () => {
    return app.getPath("userData");
  });
}
