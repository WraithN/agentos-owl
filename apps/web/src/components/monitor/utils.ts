/* ── 格式化 ──────────────────────────────────────────────────── */
export const fmtDuration = (ms: number) =>
  ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;

export const fmtTokens = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : `${(n / 1000).toFixed(0)}K`;
