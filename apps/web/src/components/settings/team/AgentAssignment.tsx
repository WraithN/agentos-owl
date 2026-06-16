import { ChevronUp, ChevronDown, Plus, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AGENTS, getAgent } from '@/data/mockData';
import { FieldGroup } from './FieldGroup';
import { AgentPicker } from './AgentPicker';
import { AgentAvatar } from './AgentAvatar';
import type { CollabMode, SwarmGroup } from './constants';

// ── Pipeline 配置 ─────────────────────────────────────────────────────────────
function PipelineConfig({ memberIds, setMemberIds }: {
  memberIds: string[]; setMemberIds: (ids: string[]) => void;
}) {
  function move(i: number, dir: -1 | 1) {
    const arr = [...memberIds];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setMemberIds(arr);
  }
  return (
    <div className="space-y-3">
      <p className="text-[11px] text-slate-500">选择并排序智能体，按顺序依次执行</p>
      <AgentPicker memberIds={memberIds} setMemberIds={setMemberIds} />
      {memberIds.length > 0 && (
        <div className="p-3 rounded-xl bg-white/3 border border-white/8 space-y-1.5">
          {memberIds.map((id, i) => {
            const a = getAgent(id);
            return a ? (
              <div key={id} className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-cyan-500/20 text-cyan-400 shrink-0">{i + 1}</span>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                  style={{ background: `${a.color}25`, border: `1.5px solid ${a.color}55`, color: a.color }}>{a.avatar}</div>
                <span className="text-xs text-slate-300 flex-1">{a.name}</span>
                <button onClick={() => move(i, -1)} disabled={i === 0} className="p-0.5 text-slate-600 hover:text-slate-300 disabled:opacity-20 transition-colors"><ChevronUp className="w-3.5 h-3.5" /></button>
                <button onClick={() => move(i, 1)} disabled={i === memberIds.length - 1} className="p-0.5 text-slate-600 hover:text-slate-300 disabled:opacity-20 transition-colors"><ChevronDown className="w-3.5 h-3.5" /></button>
              </div>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

// ── Supervisor 配置 ───────────────────────────────────────────────────────────
function SupervisorConfig({ memberIds, setMemberIds, supervisorId, setSupervisorId }: {
  memberIds: string[]; setMemberIds: (ids: string[]) => void;
  supervisorId: string; setSupervisorId: (id: string) => void;
}) {
  const workers = memberIds.filter(id => id !== supervisorId);
  return (
    <div className="space-y-3">
      <p className="text-[11px] text-slate-500">选一位监督者负责分配任务，其余为并行协作者</p>
      <FieldGroup label="监督者（必选一位）">
        <div className="grid grid-cols-3 gap-2">
          {AGENTS.map(a => (
            <button key={a.id} type="button" onClick={() => {
              setSupervisorId(a.id);
              if (!memberIds.includes(a.id)) setMemberIds([a.id, ...memberIds]);
            }}
              className={cn('flex flex-col items-center gap-1 p-2 rounded-xl border transition-all',
                supervisorId === a.id ? 'border-[2px]' : 'border-white/8 hover:bg-white/5'
              )}
              style={supervisorId === a.id ? { background: `${a.color}12`, borderColor: `${a.color}55` } : {}}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: `${a.color}25`, border: `1.5px solid ${a.color}50`, color: a.color }}>{a.avatar}</div>
              <span className="text-[10px] text-slate-300 truncate w-full text-center">{a.name}</span>
              {supervisorId === a.id && <Crown className="w-3 h-3 text-amber-400" />}
            </button>
          ))}
        </div>
      </FieldGroup>
      <FieldGroup label="协作者（并行执行）">
        <AgentPicker memberIds={workers} setMemberIds={ids => setMemberIds([supervisorId, ...ids].filter((v, i, a) => a.indexOf(v) === i))} excludeId={supervisorId} />
      </FieldGroup>
    </div>
  );
}

// ── Brainstorming 配置 ────────────────────────────────────────────────────────
function BrainstormingConfig({ memberIds, setMemberIds }: {
  memberIds: string[]; setMemberIds: (ids: string[]) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] text-slate-500">自由选择参与讨论的智能体，无固定顺序</p>
      <AgentPicker memberIds={memberIds} setMemberIds={setMemberIds} />
      {memberIds.length > 0 && (
        <div className="p-4 rounded-xl bg-white/3 border border-white/8 flex items-center justify-center gap-3 flex-wrap">
          {memberIds.map(id => <AgentAvatar key={id} id={id} size={10} showName />)}
        </div>
      )}
    </div>
  );
}

// ── Swarm 配置 ────────────────────────────────────────────────────────────────
function SwarmConfig({ ctoId, setCtoId, groups, setGroups }: {
  ctoId: string; setCtoId: (id: string) => void;
  groups: SwarmGroup[]; setGroups: (g: SwarmGroup[]) => void;
}) {
  function addGroup() {
    setGroups([...groups, { id: `g${Date.now()}`, leaderId: '', memberIds: [] }]);
  }
  function updateGroup(idx: number, patch: Partial<SwarmGroup>) {
    const next = [...groups];
    next[idx] = { ...next[idx], ...patch };
    setGroups(next);
  }
  function removeGroup(idx: number) {
    setGroups(groups.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-slate-500">CTO 统筹全局，每个项目组有组长和若干组员并行作战</p>
      <FieldGroup label="CTO（必选）">
        <div className="grid grid-cols-4 gap-2">
          {AGENTS.map(a => (
            <button key={a.id} type="button" onClick={() => setCtoId(a.id)}
              className={cn('flex flex-col items-center gap-1 p-2 rounded-xl border transition-all',
                ctoId === a.id ? 'border-[2px]' : 'border-white/8 hover:bg-white/5'
              )}
              style={ctoId === a.id ? { background: `${a.color}12`, borderColor: `${a.color}55` } : {}}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: `${a.color}25`, border: `1.5px solid ${a.color}50`, color: a.color }}>{a.avatar}</div>
              <span className="text-[10px] text-slate-300 truncate w-full text-center">{a.name}</span>
            </button>
          ))}
        </div>
      </FieldGroup>

      <div className="space-y-2">
        {groups.map((g, gi) => (
          <div key={g.id} className="p-3 rounded-xl bg-white/4 border border-white/8 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">项目组 {gi + 1}</span>
              <button onClick={() => removeGroup(gi)} className="text-[10px] text-slate-600 hover:text-rose-400 transition-colors">移除</button>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 mb-1.5">组长</p>
              <div className="flex gap-1.5 flex-wrap">
                {AGENTS.filter(a => a.id !== ctoId).map(a => (
                  <button key={a.id} type="button" onClick={() => updateGroup(gi, { leaderId: a.id })}
                    className={cn('flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] transition-all',
                      g.leaderId === a.id ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' : 'border-white/8 text-slate-400 hover:bg-white/5'
                    )}>
                    <span className="font-bold">{a.avatar}</span>{a.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 mb-1.5">组员</p>
              <AgentPicker
                memberIds={g.memberIds}
                setMemberIds={ids => updateGroup(gi, { memberIds: ids })}
                excludeId={g.leaderId || ctoId}
                compact
              />
            </div>
          </div>
        ))}
        <button onClick={addGroup}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-white/15 text-xs text-slate-500 hover:text-slate-300 hover:border-white/30 transition-all">
          <Plus className="w-3.5 h-3.5" />添加项目组
        </button>
      </div>
    </div>
  );
}

// ── 模式选择聚合组件 ───────────────────────────────────────────────────────────
interface AgentAssignmentProps {
  mode: CollabMode;
  memberIds: string[];
  setMemberIds: (ids: string[]) => void;
  supervisorId: string;
  setSupervisorId: (id: string) => void;
  ctoId: string;
  setCtoId: (id: string) => void;
  groups: SwarmGroup[];
  setGroups: (g: SwarmGroup[]) => void;
}

export function AgentAssignment({
  mode, memberIds, setMemberIds, supervisorId, setSupervisorId,
  ctoId, setCtoId, groups, setGroups,
}: AgentAssignmentProps) {
  if (mode === 'pipeline') return <PipelineConfig memberIds={memberIds} setMemberIds={setMemberIds} />;
  if (mode === 'supervisor') return <SupervisorConfig memberIds={memberIds} setMemberIds={setMemberIds} supervisorId={supervisorId} setSupervisorId={setSupervisorId} />;
  if (mode === 'brainstorming') return <BrainstormingConfig memberIds={memberIds} setMemberIds={setMemberIds} />;
  return <SwarmConfig ctoId={ctoId} setCtoId={setCtoId} groups={groups} setGroups={setGroups} />;
}
