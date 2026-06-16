import { contextBridge, ipcRenderer } from "electron";

console.log("[preload] preload script executing");

contextBridge.exposeInMainWorld("electron", {
  invoke: <T>(channel: string, ...args: unknown[]): Promise<T> => {
    console.log("[preload] invoke:", channel, args.length, "args");
    return ipcRenderer.invoke(channel, ...args);
  },
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    console.log("[preload] subscribe:", channel);
    const subscription = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args);
    ipcRenderer.on(channel, subscription);
    return () => {
      console.log("[preload] unsubscribe:", channel);
      ipcRenderer.removeListener(channel, subscription);
    };
  },
});

console.log("[preload] electron API exposed");
