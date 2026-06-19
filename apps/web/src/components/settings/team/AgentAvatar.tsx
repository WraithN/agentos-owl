import { cn } from '@/lib/utils';
import { useAgents } from '@/hooks/use-agents';

export function AgentAvatar({ id, size = 8, showName = false, role = '' }: {
  id: string; size?: number; showName?: boolean; role?: string;
}) {
  const { getAgent } = useAgents();
  const a = getAgent(id);
  if (!a) return null;
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(`w-${size} h-${size} rounded-full flex items-center justify-center text-xs font-bold shrink-0`)}
        style={{ background: `${a.color}25`, border: `2px solid ${a.color}55`, color: a.color }}
      >{a.avatar}</div>
      {showName && <span className="text-[10px] text-slate-400 truncate max-w-[56px]">{a.name}</span>}
      {role && <span className="text-[9px] text-slate-500">{role}</span>}
    </div>
  );
}
