/* 安全密钥 IPC（基于 electron.safeStorage） */
import { ipcMain } from "electron";
import { deleteSecret, getSecret, setSecret } from "../../utils/crypto/secrets.js";

export function registerSecretHandlers(): void {
  ipcMain.handle("get_secret", (_event, key: string) => getSecret(key));

  ipcMain.handle("set_secret", (_event, key: string, value: string) => {
    setSecret(key, value);
    return { ok: true };
  });

  ipcMain.handle("delete_secret", (_event, key: string) => {
    deleteSecret(key);
    return { ok: true };
  });
}
