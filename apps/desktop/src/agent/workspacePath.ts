import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getDatabase } from "../db/connection.js";
import * as queries from "../db/queries/index.js";

/** 默认 workspace 目录路径组成部分 */
const WORKSPACE_DIR_COMPONENTS = [".config", "owl-os", "workspace"] as const;

/** settings 表中存储自定义 workspace 目录的键 */
const SETTING_KEY_AGENT_WORKSPACE_DIR = "agentWorkspaceDir";

/** 路径越界错误文案 */
const ERROR_PATH_TRAVERSAL = "路径越界：禁止访问 workspace 之外的目录";

/** 绝对路径必须在 workspace 内的错误文案 */
const ERROR_ABSOLUTE_OUTSIDE_WORKSPACE = (target: string) =>
  `绝对路径必须在 workspace 内：${target}`;

/** 返回默认全局 Agent workspace 目录：~/.config/owl-os/workspace */
export function getDefaultWorkspaceDir(): string {
  return path.join(os.homedir(), ...WORKSPACE_DIR_COMPONENTS);
}

/**
 * 读取 settings 表获取用户配置的 workspace 目录。
 * 若未配置或数据库未初始化，则返回默认目录。
 */
export function getWorkspaceDir(): string {
  try {
    const configured = queries.getSetting(
      getDatabase(),
      SETTING_KEY_AGENT_WORKSPACE_DIR
    );
    if (configured) {
      return path.resolve(configured);
    }
  } catch {
    // 数据库不可用或读取异常时回退到默认目录
  }
  return getDefaultWorkspaceDir();
}

/** 确保 workspace 目录存在（递归创建） */
export async function ensureWorkspaceDir(): Promise<void> {
  await fs.mkdir(getWorkspaceDir(), { recursive: true });
}

/** 判断 target 是否位于 base 目录内部（或等于 base） */
function isInsideWorkspace(base: string, target: string): boolean {
  const relativePath = path.relative(base, target);
  if (relativePath === "") {
    return true;
  }
  // path.relative 以 ".." 开头时表示 target 在 base 之外；返回绝对路径时也视为越界
  return !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
}

/**
 * 将输入路径解析为 workspace 内的绝对路径。
 * - 相对路径：基于 getWorkspaceDir() 解析；
 * - 绝对路径：仅允许位于 workspace 内部；
 * - 禁止任何尝试越界访问的输入。
 *
 * 注意：本函数仅做词法层面（lexical）的路径 containment 检查，未通过
 * fs.realpath 解析真实文件系统路径；若 workspace 内部存在指向外部目录的
 * 符号链接，当前层无法阻止通过该链接访问 workspace 之外的数据。
 */
export function resolveWorkspacePath(input: string): string {
  const base = getWorkspaceDir();

  if (path.isAbsolute(input)) {
    const resolved = path.resolve(input);
    if (!isInsideWorkspace(base, resolved)) {
      throw new Error(ERROR_ABSOLUTE_OUTSIDE_WORKSPACE(input));
    }
    return resolved;
  }

  const resolved = path.resolve(base, input);
  if (!isInsideWorkspace(base, resolved)) {
    throw new Error(ERROR_PATH_TRAVERSAL);
  }
  return resolved;
}
