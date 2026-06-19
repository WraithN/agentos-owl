import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAgents } from '@/hooks/use-agents';

export function AgentPicker({ memberIds, setMemberIds, excludeId, compact }: {
  memberIds: string[]; setMemberIds: (ids: string[]) => void;
  excludeId?: string; compact?: boolean;
}) {
  const { agents: allAgents } = useAgents();
  function toggle(id: string) {
    setMemberIds(memberIds.includes(id) ? memberIds.filter(m => m !== id) : [...memberIds, id]);
  }
  const agents = allAgents.filter(a => a.id !== excludeId);
  if (agents.length === 0) {
    return (
      <p className="text-[11px] text-slate-500">尚无可选智能体，请先在「智能体配置」中创建。</p>
    );
  }
  return (
    <div className={cn('grid gap-1.5', compact ? 'grid-cols-3' : 'grid-cols-2')}>
      {agents.map(a => {
        const active = memberIds.includes(a.id);
        return (
          <button key={a.id} type="button" onClick={() => toggle(a.id)}
            className={cn('flex items-center gap-2 px-2.5 py-2 rounded-xl border transition-all text-left',
              active ? 'border-[2px]' : 'border border-white/8 hover:bg-white/5'
            )}
            style={active ? { background: `${a.color}12`, borderColor: `${a.color}55` } : {}}
          >
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
              style={{ background: `${a.color}25`, border: `1.5px solid ${a.color}50`, color: a.color }}>{a.avatar}</div>
            {!compact && (
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-slate-200 truncate">{a.name}</p>
                <p className="text-[9px] text-slate-500 truncate">{a.role}</p>
              </div>
            )}
            {compact && <span className="text-[10px] text-slate-300 truncate flex-1">{a.name}</span>}
            <div className={cn('w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 transition-all',
              active ? 'opacity-100' : 'opacity-0')}
              style={{ background: a.color }}>
              <Check className="w-2 h-2 text-white" />
            </div>
          </button>
        );
      })}
    </div>
  );
}
