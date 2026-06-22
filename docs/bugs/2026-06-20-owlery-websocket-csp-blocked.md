# Owlery WebSocket 被 CSP 阻止

## Phenomenon

使用 `scripts/start-desktop.sh` 启动桌面开发环境后，渲染进程加载成功，但浏览器控制台报错：`Refused to connect to 'ws://localhost:8765/session...' because it violates Content Security Policy`，导致前端无法连接 Owlery WebSocket 会话流与状态流。

## Root Cause

`apps/web/index.html` 的 `connect-src` 只允许 Vite dev server 的 `ws://localhost:5173` / `http://localhost:5173`，未加入 Owlery WebSocket server 默认端口 `8765`，也未覆盖脚本实际使用的 `127.0.0.1:5173`。

## Solution

已更新 `apps/web/index.html` 的 CSP `connect-src`，加入 `ws://localhost:8765`、`ws://127.0.0.1:8765`、`ws://127.0.0.1:5173` 与 `http://127.0.0.1:5173`。验证命令：`pnpm lint`、`pnpm test`、`pnpm build`。
