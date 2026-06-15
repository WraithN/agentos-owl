import { contextBridge, ipcRenderer } from "electron";

export interface ElectronAPI {
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
  platform: string;
}

const api: ElectronAPI = {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  platform: process.platform,
};

contextBridge.exposeInMainWorld("electron", api);
