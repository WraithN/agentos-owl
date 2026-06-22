# Owlery WebSocket host 不一致导致连接不稳定

## Phenomenon

使用 `scripts/start-desktop.sh` 启动开发桌面端后，主进程日志显示 Owlery WebSocket server 已监听 `8765`，渲染进程也完成加载，但前端业务仍可能无法稳定连接 Owlery WebSocket。

## Root Cause

开发服务器实际加载地址为 `http://127.0.0.1:5173`，但前端 WebSocket client 固定连接 `ws://localhost:8765`。在不同系统/网络栈下，`localhost` 与 `127.0.0.1` 解析和 CSP/source origin 行为可能不一致，造成用户侧表现为应用已加载但 Owlery 通道不可用。

## Solution

已将 `apps/web/src/services/websocket.ts` 的 WebSocket URL 构造改为使用 `window.location.hostname`，确保 dev 环境下从 `127.0.0.1` 加载页面时也连接 `ws://127.0.0.1:8765`。已用短启动探测确认 `ws://127.0.0.1:8765/session?...` 可连接。
