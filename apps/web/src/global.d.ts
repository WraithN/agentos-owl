// global types

// 百度地图GL版本全局类型声明
/// <reference types="bmapgl" />

interface ElectronApi {
  invoke: <T>(channel: string, ...args: unknown[]) => Promise<T>;
  on: (channel: string, callback: (...args: unknown[]) => void) => () => void;
}

declare global {
  interface Window {
    electron: ElectronApi;
  }
}

export {};
