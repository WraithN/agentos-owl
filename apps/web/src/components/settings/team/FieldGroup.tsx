import type { ReactNode } from 'react';

export function FieldGroup({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div>
      <label className="text-xs text-slate-500 font-medium block mb-1.5">{label}</label>
      {children}
    </div>
  );
}
