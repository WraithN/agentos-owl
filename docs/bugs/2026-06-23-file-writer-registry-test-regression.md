# 文件 writer registry 测试回归与清理问题

## Phenomenon（现象与影响范围）

在实现纯文本 fallback writer 后，`apps/desktop/src/__tests__/file-writers/registry.test.ts` 出现测试回归：

- 原测试断言未知扩展名（如 `foo.unknown`）调用 `writeXFile` 会抛出 `"不支持的文件类型"`。
- 新行为改为 fallback 到纯文本 writer，导致该断言失败。

同时，`plain-text-writer.test.ts` 在每次测试运行后会在 `~/.config/owl-os/workspace/` 留下测试文件（`.md`、`.txt`、`.unknown` 等），污染本地 workspace，且缺少对空内容和嵌套目录等边界场景的覆盖。

## Root Cause（根本原因）

1. `registry.test.ts` 未随行为变更同步更新，仍然测试旧的抛错契约。
2. `plain-text-writer.test.ts` 没有 `afterEach` 清理逻辑，测试用例创建的文件未被删除。
3. 边界场景（`content` 为 `undefined`、嵌套目录）在设计用例时被遗漏。

## Solution（解决方案与验证结果）

1. 更新 `registry.test.ts`：将未知扩展名的断言改为验证 fallback 写入纯文本文件，确认路径与内容正确。
2. 更新 `plain-text-writer.test.ts`：
   - 增加 `afterEach`，使用 `fs.rm(..., { recursive: true, force: true })` 删除测试中创建的文件与目录。
   - 新增空内容测试：省略 `content` 时写入空文件。
   - 新增嵌套目录测试：`subdir/nested.txt` 能递归创建目录并写入内容。
3. 在 `apps/desktop/src/agent/file-writers/index.ts` 中增加注释，提示 `.json/.yaml/.yml` 当前被 plainTextWriter 当作纯文本处理，后续若增加专用 writer 需注意注册顺序与优先级。

验证：

```bash
cd /home/nan/agentos-owl/.worktrees/feat-create-x-file/apps/desktop
pnpm test src/__tests__/file-writers/
pnpm typecheck
pnpm lint
```

全部通过。
