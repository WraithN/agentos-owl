# start-desktop 重复启动导致端口占用

## Phenomenon

多次运行 `scripts/start-desktop.sh` 后，旧 Electron 实例仍占用 Owlery WebSocket 端口 `8765`。新实例启动时主进程报 `listen EADDRINUSE: address already in use :::8765`，导致新窗口加载但 Owlery WebSocket 不可用。

## Root Cause

启动脚本直接执行 `pnpm --filter @owl-os/desktop dev`，没有在启动前清理旧的 OwlOS Electron/dev 进程，也没有释放旧实例占用的 `8765` 端口。

## Solution

已在 `scripts/start-desktop.sh` 中增加 `cleanup_old_processes`：启动前按当前仓库路径清理旧 desktop dev/main 进程，并在 Linux 上通过 `ss` 检查和释放 `8765` 端口。已通过 `bash -n scripts/start-desktop.sh`、`pnpm lint`、`pnpm test`、`pnpm build` 验证。
