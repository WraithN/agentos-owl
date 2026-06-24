import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

/**
 * 根据调用方所在目录解析 prompt 文件路径。
 * 调用方应传入自身的 __dirname，函数会尝试上溯到 apps/desktop/prompt/ 或 dist/prompt/。
 */
export function resolvePromptPathFrom(baseDir: string, fileName: string): string | null {
  const candidates: string[] = [];
  // 测试 / 直接从 apps/desktop 启动：基于 process.cwd() 查找 prompt/
  candidates.push(path.resolve(process.cwd(), "prompt", fileName));
  // 开发态 / 源码运行：上溯两级到 apps/desktop/prompt/
  candidates.push(path.resolve(baseDir, "../../prompt", fileName));
  // 打包后：prompt 被复制到与主进程产物同级的 dist/prompt/
  candidates.push(path.resolve(baseDir, "../prompt", fileName));
  // resources 目录兜底（electron-builder extraResources 配置时使用）
  try {
    if (app?.isPackaged) {
      candidates.push(path.join(process.resourcesPath, "prompt", fileName));
    }
  } catch {
    // ignore，非主进程上下文
  }
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}
