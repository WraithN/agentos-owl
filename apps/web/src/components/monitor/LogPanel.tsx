import { XCircle } from 'lucide-react';

/* ── 执行日志/最近错误面板 ─────────────────────────────────────── */
export function LogPanel({ errors }: { errors: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold mb-2 flex items-center gap-1.5"
        style={{ color: 'var(--text-secondary)' }}>
        <XCircle className="w-3.5 h-3.5 text-rose-400" />最近错误
      </p>
      {errors.length === 0
        ? <p className="text-xs" style={{ color: 'var(--text-disabled)' }}>暂无错误记录</p>
        : errors.map((e, i) => (
          <p key={i} className="text-xs mb-1 flex items-start gap-1.5">
            <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
            <span style={{ color: 'var(--text-tertiary)' }}>{e}</span>
          </p>
        ))}
    </div>
  );
}
