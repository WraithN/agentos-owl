# Phase 4 重构后 @owl-os/core 会话类型缺失

## 现象

完成 Phase 4 目录重构并删除 `@owl-os/core` 中旧 Owlery 类（`Owlery`、`AgentPool`、`CrystalBall`、`TeammateManager` 等）后，运行质量门禁出现大量错误：

- `apps/desktop` 与 `packages/core` 的 `tsc --noEmit` 报 `TeammateStatus`、`SessionRunStatus`、`SessionVisibility`、`SessionSummary`、`AgentWorkSnapshot` 未从 `@owl-os/core` 导出。
- `packages/core/src/agent/AgentFactory.ts` 和 `AgentRuntime.ts` 仍引用已删除的 `../owlery/TeammateManager.js`。
- `packages/core/src/message-box.ts` 的相对导入路径错误（`../agent/types.js` 应为 `./agent/types.js`）。
- `packages/core/src/__tests__/owlery.test.ts` 测试的是已删除的旧 Owlery 类，导致测试套件无法运行。

## 根因

1. 旧 Owlery 包负责导出多 Agent 会话相关的状态类型（`TeammateStatus` 等）。删除旧类后，这些类型没有迁移到新的 `session-types.ts`，前端与桌面端无法再从 `@owl-os/core` 获取类型。
2. `@owl-os/core` 中的旧 `AgentFactory`/`AgentRuntime` 接口仍保留 `recruit` 方法，其返回类型依赖已删除的 `TeammateManager`。
3. 重构过程中部分 inline `import("@owl-os/core").Type` 未改为显式顶层导入，且 `AgentOrchestrator.createStatus()`、`api/ipc/owlery.ts` 的 `defaultTeammateStatus()` 返回对象字段与新的 `TeammateStatus` 不完全一致（缺少 `mode` / `visibility` / `runStatus`）。

## 解决方案

1. 在 `packages/core/src/session-types.ts` 中统一定义会话状态类型：
   - `SessionVisibility`、`SessionRunStatus`
   - `SessionSummary`、`TeammateAgentStatus`、`AgentWorkSnapshot`
   - `TeammateStatus`（含 `teammateName?` 以兼容前端 `ChatHeader` / `AgentChat` 的展示需求）
2. 在 `packages/core/src/index.ts` 导出上述类型，供 `apps/desktop` 与 `apps/web` 共享。
3. 修复 `packages/core/src/message-box.ts` 的导入路径为 `./agent/types.js`。
4. 移除 `AgentFactory.ts` 与 `AgentRuntime.ts` 中对 `TeammateManager` 的依赖，将 `recruit` 返回类型调整为 `Promise<unknown>`。
5. 删除已失效的 `packages/core/src/__tests__/owlery.test.ts`；因 core 暂无可运行测试，将 `packages/core/package.json` 的 `test` 脚本改为 `vitest run --passWithNoTests`。
6. 在桌面端清理所有 inline `import("@owl-os/core")` 类型，改为显式顶层导入。
7. 修复 `AgentOrchestrator.createStatus()`，补充 `mode` 字段；为 `AgentOrchestratorOptions` 增加 `mode?: TeammateMode` 并在构造函数中默认 `"supervisor"`。
8. 修复 `api/ipc/owlery.ts` 中的 `defaultTeammateStatus(sessionId)`，返回完整 `TeammateStatus`（含 `mode`/`visibility`/`runStatus`）。

## 验证结果

- `pnpm lint` ✅
- `pnpm typecheck` ✅
- `pnpm build` ✅
- `pnpm test` ✅（desktop 25 个测试文件 / 79 个测试通过；core 无测试文件但通过 `--passWithNoTests`）
