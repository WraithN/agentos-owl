# Electron 主进程无法加载 pi-agent-core

## Phenomenon

启动 Electron 开发环境时，主进程加载 `@earendil-works/pi-agent-core` 失败，报错 `No "exports" main defined`，导致桌面应用崩溃退出。

## Root Cause

Electron 主进程产物构建为 CommonJS，Vite SSR 默认将依赖外置，导致 ESM-only 的 `@earendil-works/pi-agent-core` 与 `@earendil-works/pi-ai` 在产物中被转换为 `require()` 调用。该包的 `exports` 仅提供 `import` 条件，不提供 CommonJS 入口，因此 Node/Electron 在 CJS 加载时无法解析。

同时开发脚本固定等待 5173 端口，但 Vite 在端口占用时会自动切换到 5174，而主进程仍硬编码加载 5173，存在加载旧服务的隐患。

## Solution

在 Electron 主进程 Vite 配置中通过 `ssr.noExternal` 强制打包 `@earendil-works/pi-agent-core` 与 `@earendil-works/pi-ai`，避免运行时 `require()` ESM-only 包。

开发脚本增加 `--strictPort`，避免端口占用时悄悄切换；主进程改为读取 `VITE_DEV_SERVER_URL`，确保加载脚本传入的开发服务地址。

验证结果：

- `pnpm --filter @owl-os/desktop build:main` 通过
- `pnpm lint` 通过
- `pnpm --filter @owl-os/desktop dev` 中 Electron 主进程成功初始化数据库、注册 IPC，并触发 renderer `did-finish-load`
