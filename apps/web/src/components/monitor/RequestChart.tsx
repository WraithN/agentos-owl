/* ── 请求/任务趋势迷你折线图 ───────────────────────────────────── */
export function RequestChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80, h = 28, pad = 3;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
      <polyline
        points={`${pad},${h} ${pts} ${w - pad},${h}`}
        fill={color} opacity="0.08" stroke="none"
      />
    </svg>
  );
}
