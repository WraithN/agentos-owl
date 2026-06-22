# Teammate 状态面板未展示 Sentinel 与 Worker

## Phenomenon

运行动态团队招募后，右上角 "Teammate 状态" 弹窗只显示 `组长：boss`，未出现招募出的 Sentinel 与动态 Worker。用户无法感知团队已经形成。

## Root Cause

1. `SessionRuntime.recruitSentinel()` / `recruitWorkers()` 在 CrystalBall 注册新 Agent 后，没有主动触发 `emitStatus()`，导致状态变更不会立刻发送到主线程。
2. 主线程 `Owlery` 收到 Worker 线程的 `status` 事件后，仅通过 WebSocket `status` 流广播；当前端 WebSocket 状态流连接失败或走 IPC 回退路径时，`ChatHeader` 无法收到后续状态更新。

## Solution

1. 在 `apps/desktop/src/runtime/SessionRuntime.ts` 的 `recruitSentinel` 与 `recruitWorkers` 方法末尾调用 `this.emitStatus()`，使招募动作立即反映在 Teammate 状态。
2. 在 `apps/desktop/src/owlery/Owlery.ts` 的 `slot.on("status")` 回调中，除 WebSocket 广播外，同步调用 `publishAgentStatus(slot.sessionId, status)`，通过 IPC `agent:status` 推送状态，保证前端无论走 WebSocket 还是 IPC 都能收到更新。
3. 在 `apps/desktop/src/ipc/teammateStatus.ts` 的 `sendStatus` 中增加 `BrowserWindow` 非空保护，避免 Vitest 测试环境（无 Electron）抛出 `Cannot read properties of undefined`。

## Files Changed

- `apps/desktop/src/runtime/SessionRuntime.ts`
- `apps/desktop/src/owlery/Owlery.ts`
- `apps/desktop/src/ipc/teammateStatus.ts`

## Verification

- `pnpm typecheck` ✅
- `pnpm lint` ✅
- `pnpm test` ✅（core 17 / desktop 12）
- `pnpm build` ✅
