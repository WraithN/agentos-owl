# XLSX/CSV Writer 质量修复

## Phenomenon

代码审查发现 `apps/desktop/src/agent/file-writers/xlsx-writer.ts` 存在以下问题：

1. 当 `params.sheets` 为空或未定义时，`.xlsx` 分支调用 `XLSX.writeFile` 会抛出 "Workbook is empty" 错误，导致文件创建失败。
2. `WriteXFileParams.title` 参数被完全忽略，无法作为工作簿元数据或默认工作表名称使用。
3. `.xlsx` 写文件使用同步 I/O（`XLSX.writeFile`），与 writer 接口的 `Promise<void>` 签名不一致。

## Root Cause

- `.xlsx` 分支在没有任何工作表时仍直接调用 `XLSX.writeFile`；`xlsx` 库不接受空工作簿。
- 实现未读取 `params.title`，也未将其写入工作簿 `Props` 或作为默认表名。
- 原有代码为了简单直接使用了同步写文件 API。

## Solution

1. 当 `.xlsx` 没有提供任何工作表时，自动创建一个空默认工作表，名称为 `title`（若提供）或 `Sheet1`。
2. 若工作表没有名称且提供了 `title`，则使用 `title` 作为该工作表名称；多个无名称工作表时避免名称冲突。
3. 将 `title` 写入工作簿 `Props.Title` 元数据。
4. 将 `XLSX.writeFile` 替换为 `XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })` + `fs.writeFile`，实现异步 I/O。
5. 补充测试覆盖：空 `.xlsx`、空 `.csv`、多 sheet `.xlsx`、`.csv` 仅使用第一张表、`title` 作为默认表名等场景。

验证结果：

- `pnpm test src/__tests__/file-writers/xlsx-writer.test.ts`：8 个测试全部通过。
- `pnpm typecheck`：无类型错误。
- `pnpm lint`：无 lint 错误。
