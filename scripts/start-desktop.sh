#!/usr/bin/env bash
# OwlOS Electron 桌面端启动脚本（支持 WSL2 / Linux / macOS）
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="${ROOT_DIR}/logs"
mkdir -p "${LOG_DIR}"

LOG_FILE="${LOG_DIR}/electron-dev-$(date +%Y%m%d-%H%M%S).log"

echo "=============================================="
echo "OwlOS Electron Dev Launcher"
echo "Root: ${ROOT_DIR}"
echo "Log:  ${LOG_FILE}"
echo "=============================================="

# 确保 Electron 不会以 Node.js 模式运行
if [[ -n "${ELECTRON_RUN_AS_NODE:-}" ]]; then
  echo "[WARN] ELECTRON_RUN_AS_NODE is set, unsetting it..."
  unset ELECTRON_RUN_AS_NODE
fi

# WSL2 检测与提示
if grep -qi microsoft /proc/version 2>/dev/null; then
  echo "[INFO] WSL2 detected. Ensure WSLg or an X Server is available."
  if [[ -z "${DISPLAY:-}" && -z "${WAYLAND_DISPLAY:-}" ]]; then
    echo "[WARN] DISPLAY and WAYLAND_DISPLAY are not set. GUI may not render."
  fi
fi

cd "${ROOT_DIR}"

cleanup_old_processes() {
  echo "[INFO] stopping existing OwlOS desktop dev processes..."
  local patterns=(
    "${ROOT_DIR}/apps/desktop/dist/main/main.cjs"
    "tsx.*scripts/dev.ts"
    "pnpm.*@owl-os/desktop.*dev"
  )
  for pattern in "${patterns[@]}"; do
    pkill -f "${pattern}" 2>/dev/null || true
  done
  if command -v ss >/dev/null 2>&1; then
    local port_pids
    port_pids="$(ss -ltnp 'sport = :8765' 2>/dev/null | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u || true)"
    if [[ -n "${port_pids}" ]]; then
      echo "[INFO] freeing Owlery WebSocket port 8765: ${port_pids}"
      kill ${port_pids} 2>/dev/null || true
    fi
  fi
  sleep 1
}

cleanup_old_processes

# 开启 Electron 详细日志，便于排查启动问题
export ELECTRON_ENABLE_LOGGING=1

# 如需自动打开 DevTools，取消下面这行注释
# export OWL_OPEN_DEVTOOLS=1

# 使用 tee 同时输出到终端与日志文件
pnpm --filter @owl-os/desktop dev 2>&1 | tee "${LOG_FILE}"
