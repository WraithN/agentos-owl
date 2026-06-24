# 同一会话每次生成的老板名字不一致

## Phenomenon

在同一个会话（session）中，聊天界面顶部状态栏或 Agent 卡片里显示的「老板」名字每次请求都不一样，用户体验上感觉会话身份不稳定。

## Root Cause

`agentNames.ts` 使用模块级 `Map` 缓存每个 session 的老板名字：

- 生产环境的 Agent 实际运行在 Worker 线程中。
- IPC 回退路径在主线程中运行。
- 主线程与 Worker 线程拥有各自的模块实例，缓存不共享。
- 名字生成依赖 `crypto.getRandomValues`，不是 deterministic 的。

因此主线程和 Worker 线程可能为同一个 session 生成不同的老板名字，且每次进程重启后缓存也会丢失。

## Solution

1. **持久化名字缓存**：在 `conversations` 表新增 `agent_names_json` 字段，按会话保存已生成的 Agent 名字（键为 `role:title`，如 `elder:boss`）。
2. **统一预加载**：
   - 主线程在创建 `SessionSlot` 前，从数据库读取 `agentNames` 并写入 `agentNames.ts` 的会话级缓存。
   - 通过 Worker 初始化消息把 `agentNames` 传给 `SessionRuntime`，确保 Worker 使用同一套名字。
3. **运行时同步**：
   - `AgentNameGenerator` 在生成新名字时，先查会话缓存，命中则直接返回；未命中则生成并记录。
   - Worker 中生成新名字后，通过新增的 `persist_agent_names` 运行时事件异步回写主线程，主线程更新数据库。
4. **回退路径一致**：`ipc/owlery.ts` 的 IPC 回退处理在生成名字前也预加载数据库中的缓存。

## Verification

- `pnpm --filter @owl-os/desktop typecheck` 通过。
- `pnpm --filter @owl-os/desktop test` 通过（47 个测试）。
- `pnpm --filter @owl-os/core test` 通过（17 个测试）。
- `pnpm lint` 通过。
- `pnpm build` 通过。
