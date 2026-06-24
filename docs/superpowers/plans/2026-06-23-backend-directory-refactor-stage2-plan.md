# 后端目录重构 Stage 2 实施计划

## 目标

在已完成的 Phase 1~3 基础上，继续细化 `agent-runtime`、`agent-orchestrator` 以及 IPC/WebSocket 目录，并响应用户 5 项新要求。整体仍遵循「只搬文件、不改接口签名」原则。

## 变更范围

1. **Agent 名字 JSON 化**
   - 在 `apps/desktop/src/agent-runtime/data/agent-names.json` 存放中/英/日/韩名字词表。
   - `agentNames.ts` 通过 JSON import 读取词表，`generateNameForLocale` / `randomAgentName` 行为不变。

2. **tools 拆分与目录化**
   - 删除 `agent-runtime/tools.ts`。
   - 新建 `agent-runtime/tools/`：
     - `utils.ts`：共享 `textResult`。
     - `file.ts`：read_file / list_directory / create_x_file。
     - `shell.ts`：execute_command。
     - `planner.ts`：dispatch_task / validate_output / submit_to_elder。
     - `recruitment.ts`：recruit_sentinel / recruit_workers（从 `owleryAgentFactory.ts` 迁出）。
     - `index.ts`：对外暴露 `buildTools`（file + shell）、`buildPlannerTools`、招募工具。
   - `owleryAgentFactory.ts` 改为从 `tools/` 导入；移除本地招募工具实现。

3. **api 包建立**
   - 新建 `apps/desktop/src/api/`。
   - 将 `ipc/` 与 `websocket/` 整体移入 `api/`。
   - 更新 `main.ts`、`Owlery.ts` 等引用路径。

4. **session 子包建立（Message Channel 暂不动）**
   - 在 `agent-orchestrator/` 下新建 `session/`。
   - `SessionRuntime.ts` → `session/runtime.ts`。
   - `SessionSlot.ts` → `session/slot.ts`。
   - `SessionThreadEntry.ts` → `session/thread-entry.ts`。
   - 类名保留 `SessionRuntime`、`SessionSlot`、`SessionThreadEntry`。
   - 更新 `vite.main.config.ts` worker entry 路径、`Owlery.ts` 默认线程入口路径及所有 import。

## 验证步骤

每次目录/文件改动后必须执行：

```bash
pnpm lint
pnpm test
pnpm build
```

## 风险与回退

- `SessionThreadEntry.cjs` 输出路径改变，需同步 `vite.main.config.ts` 与 `Owlery.ts` 默认值，否则 Worker 线程找不到入口。
- JSON import 在不同环境（Vite 构建 / Vitest / Electron 主进程）需验证兼容性；如 import attribute 导致问题，改回 `fs.readFileSync` 读取。
- 所有改动保持函数/类签名不变；若测试失败，优先修正 import 路径而非逻辑。
