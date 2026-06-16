/**
 * 全局 UI 样式常量
 * 统一所有页面的输入框、按钮样式，避免各页面各自维护独立 inputCls。
 */
import { cn } from "./utils.js";

/** 标准输入框（input / textarea / select 通用） */
export const inputCls =
  "w-full bg-black/5 dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 outline-none focus:border-cyan-500/50 transition-colors";

/** 输入框带错误状态 */
export const inputClsErr = (hasError?: boolean) =>
  cn(inputCls, hasError && "border-rose-500/60 focus:border-rose-500/60");

/** 标准主操作按钮（图标 + 文字） */
export const btnPrimary =
  "flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white btn-aurora rounded-xl disabled:opacity-40 disabled:cursor-not-allowed";

/** 标准主操作按钮（仅文字，无图标间距） */
export const btnPrimaryPlain =
  "px-4 py-2 text-xs font-semibold text-white btn-aurora rounded-xl disabled:opacity-40 disabled:cursor-not-allowed";
