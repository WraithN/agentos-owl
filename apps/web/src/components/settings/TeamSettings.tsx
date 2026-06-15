/* 智能体协作页 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Check, AlertCircle, ChevronUp, ChevronDown,
  GitBranch, Eye, MessageCircle, Network, Crown, Shield,
  Zap, Star, Flame, Globe, Target, Cpu, Bot, Layers, Trash2, Database, X, ChevronDown as ChevronDownIcon,
  ChevronLeft, ChevronRight, Copy, Search, Pencil, ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { inputClsErr, btnPrimary } from '@/lib/ui-styles';
import { TEAM_TEMPLATES, AGENTS, getAgent, AVAILABLE_KBS } from '@/data/mockData';
import type { TeamTemplate } from '@/types';

const DIALOG_BG = 'var(--panel-bg-solid)';
const DIALOG_BD = 'var(--border-subtle)';

// ── 知识库选择器（下拉多选） ──────────────────────────────────────────
interface KBRef { id: string; name: string }

function KBPicker({ value, onChange }: { value: KBRef[]; onChange: (v: KBRef[]) => void }) {
  const [open, setOpen] = useState(false);
  const selectedIds = new Set(value.map(k => k.id));

  function toggle(kb: typeof AVAILABLE_KBS[number]) {
    if (selectedIds.has(kb.id)) onChange(value.filter(k => k.id !== kb.id));
    else onChange([...value, { id: kb.id, name: kb.name }]);
  }

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map(kb => (
            <span key={kb.id} className="flex items-center gap-1 text-[11px] bg-cyan-500/12 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/25">
              <Database className="w-3 h-3 shrink-0" />{kb.name}
              <button onClick={() => onChange(value.filter(k => k.id !== kb.id))} className="hover:text-rose-400 transition-colors ml-0.5"><X className="w-2.5 h-2.5" /></button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <button onClick={() => setOpen(v => !v)}
          className={cn('w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl border transition-colors',
            open ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-white/10 bg-white/5 hover:border-white/20')}>
          <span className={value.length ? 'text-slate-300' : 'text-slate-600'}>
            {value.length ? `已选 ${value.length} 个知识库` : '选择知识库…'}
          </span>
          <ChevronDownIcon className={cn('w-3.5 h-3.5 text-slate-500 transition-transform', open && 'rotate-180')} />
        </button>
        {open && (
          <div className="absolute z-20 top-full mt-1 w-full rounded-xl border border-white/10 overflow-hidden shadow-xl"
            style={{ background: 'var(--panel-bg-solid)', backdropFilter: 'blur(16px)' }}>
            {AVAILABLE_KBS.map(kb => {
              const selected = selectedIds.has(kb.id);
              return (
                <button key={kb.id} onClick={() => toggle(kb)}
                  className={cn('w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-white/8', selected && 'bg-cyan-500/8')}>
                  <div className={cn('w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all',
                    selected ? 'bg-cyan-500 border-cyan-500' : 'border-white/20')}>
                    {selected && <span className="text-white text-[10px] font-bold leading-none">✓</span>}
                  </div>
                  <Database className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-200 truncate">{kb.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono truncate">{kb.vectorDbUrl}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 删除确认弹窗 ──────────────────────────────────────────────────────────────
function DeleteConfirm({ name, onCancel, onConfirm }: { name: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.15 }}
        className="relative w-full max-w-sm rounded-2xl shadow-2xl p-5 space-y-4"
        style={{ background: DIALOG_BG, border: `1px solid ${DIALOG_BD}`, backdropFilter: 'blur(24px)' }}
        onClick={e => e.stopPropagation()}>
        <p className="text-sm font-semibold text-slate-100">确认删除</p>
        <p className="text-xs text-slate-400">确定要删除团队 <span className="text-slate-200 font-medium">「{name}」</span> 吗？此操作不可撤销。</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-white/8 rounded-xl transition-colors">取消</button>
          <button onClick={onConfirm} className="px-4 py-2 text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-colors">删除</button>
        </div>
      </motion.div>
    </div>
  );
}
type CollabMode = 'pipeline' | 'supervisor' | 'brainstorming' | 'swarm';

const MODE_META: Record<CollabMode, {
  icon: React.ReactNode; label: string; desc: string; color: string; accent: string;
}> = {
  pipeline: {
    icon: <GitBranch className="w-4 h-4" />,
    label: '流水线 Pipeline',
    desc: '智能体按选择顺序依次执行，上一步输出传给下一步',
    color: 'text-cyan-400', accent: 'border-cyan-500/40 bg-cyan-500/10',
  },
  supervisor: {
    icon: <Eye className="w-4 h-4" />,
    label: '监督者 Supervisor',
    desc: '监督者分配任务，协作者并行工作后汇报给监督者',
    color: 'text-violet-400', accent: 'border-violet-500/40 bg-violet-500/10',
  },
  brainstorming: {
    icon: <MessageCircle className="w-4 h-4" />,
    label: '头脑风暴 Brainstorm',
    desc: '智能体自由讨论，互相启发，产生创意与多样观点',
    color: 'text-amber-400', accent: 'border-amber-500/40 bg-amber-500/10',
  },
  swarm: {
    icon: <Network className="w-4 h-4" />,
    label: '层级模式 Hierarchy',
    desc: '一位 CTO 统筹若干项目组，每组有组长和组员并行作战',
    color: 'text-rose-400', accent: 'border-rose-500/40 bg-rose-500/10',
  },
};

// ── 团队图标选项 ──────────────────────────────────────────────────────────────
const TEAM_ICONS = [
  { id: 'users',   icon: <Users className="w-5 h-5" />,         label: '团队' },
  { id: 'crown',   icon: <Crown className="w-5 h-5" />,         label: '精英' },
  { id: 'shield',  icon: <Shield className="w-5 h-5" />,        label: '安全' },
  { id: 'zap',     icon: <Zap className="w-5 h-5" />,           label: '闪电' },
  { id: 'star',    icon: <Star className="w-5 h-5" />,          label: '明星' },
  { id: 'flame',   icon: <Flame className="w-5 h-5" />,         label: '火焰' },
  { id: 'globe',   icon: <Globe className="w-5 h-5" />,         label: '全球' },
  { id: 'target',  icon: <Target className="w-5 h-5" />,        label: '目标' },
  { id: 'cpu',     icon: <Cpu className="w-5 h-5" />,           label: '算法' },
  { id: 'bot',     icon: <Bot className="w-5 h-5" />,           label: '机器人' },
  { id: 'layers',  icon: <Layers className="w-5 h-5" />,        label: '层级' },
  { id: 'network', icon: <Network className="w-5 h-5" />,       label: '网络' },
];

// ── 头像子组件 ────────────────────────────────────────────────────────────────
function AgentAvatar({ id, size = 8, showName = false, role = '' }: {
  id: string; size?: number; showName?: boolean; role?: string;
}) {
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
      {/* 选择器 */}
      <AgentPicker memberIds={memberIds} setMemberIds={setMemberIds} />
      {/* 顺序预览 */}
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
      {/* 监督者 */}
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
      {/* 协作者 */}
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
interface SwarmGroup { id: string; leaderId: string; memberIds: string[]; }

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
      {/* CTO 选择 */}
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

      {/* 项目组列表 */}
      <div className="space-y-2">
        {groups.map((g, gi) => (
          <div key={g.id} className="p-3 rounded-xl bg-white/4 border border-white/8 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">项目组 {gi + 1}</span>
              <button onClick={() => removeGroup(gi)} className="text-[10px] text-slate-600 hover:text-rose-400 transition-colors">移除</button>
            </div>
            {/* 组长 */}
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
            {/* 组员 */}
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

// ── 通用智能体选择器 ──────────────────────────────────────────────────────────
function AgentPicker({ memberIds, setMemberIds, excludeId, compact }: {
  memberIds: string[]; setMemberIds: (ids: string[]) => void;
  excludeId?: string; compact?: boolean;
}) {
  function toggle(id: string) {
    setMemberIds(memberIds.includes(id) ? memberIds.filter(m => m !== id) : [...memberIds, id]);
  }
  const agents = AGENTS.filter(a => a.id !== excludeId);
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

// ── 主组件 ────────────────────────────────────────────────────────────────────
export default function TeamSettings() {
  const [teams, setTeams] = useState<TeamTemplate[]>(TEAM_TEMPLATES);
  const [deleteTarget, setDeleteTarget] = useState<TeamTemplate | null>(null);
  const [teamKBs, setTeamKBs] = useState<KBRef[]>([]);
  const [detailView, setDetailView] = useState<TeamTemplate | null>(null);
  const [teamPage, setTeamPage] = useState(0);
  const [teamSearch, setTeamSearch] = useState('');
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>(Object.fromEntries(TEAM_TEMPLATES.map(t => [t.id, t.enabled])));

  const TEAM_PAGE_SIZE = 6;

  // Detail view states (synced when entering detail)
  const [teamName, setTeamName] = useState('');
  const [teamDesc, setTeamDesc] = useState('');
  const [teamIcon, setTeamIcon] = useState('users');
  const [trigger, setTrigger] = useState('');
  const [mode, setMode] = useState<CollabMode>('pipeline');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [supervisorId, setSupervisorId] = useState('');
  const [ctoId, setCtoId] = useState('');
  const [swarmGroups, setSwarmGroups] = useState<SwarmGroup[]>([{ id: 'g1', leaderId: '', memberIds: [] }]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  function enterDetail(t: TeamTemplate) {
    setDetailView(t);
    setTeamName(t.name);
    setTeamDesc(t.description);
    setTeamIcon('users');
    setTrigger(t.trigger);
    setMemberIds(t.memberIds);
    setSupervisorId(t.coordinatorId ?? '');
    setCtoId(t.coordinatorId ?? '');
    setTeamKBs([]);
    setErrors({});
  }

  function handleDeleteTeam() {
    if (!deleteTarget) return;
    const remaining = teams.filter(t => t.id !== deleteTarget.id);
    setTeams(remaining);
    if (detailView?.id === deleteTarget.id) setDetailView(null);
    setDeleteTarget(null);
  }

  function handleCopy(t: TeamTemplate) {
    const copy: TeamTemplate = {
      ...t,
      id: `team-${Date.now()}`,
      name: `${t.name} (副本)`,
      enabled: false,
    };
    setTeams(prev => [...prev, copy]);
    setEnabledMap(prev => ({ ...prev, [copy.id]: false }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!teamName.trim()) e.name = '团队名称不能为空';
    if (!teamIcon) e.icon = '请选择团队图标';
    if (!trigger.trim()) e.trigger = '触发条件不能为空';
    if (mode === 'supervisor' && !supervisorId) e.supervisor = '请指定监督者';
    if (mode === 'swarm' && !ctoId) e.cto = '请指定 CTO';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave() {
    if (!validate() || !detailView) return;
    setTeams(prev => prev.map(t => t.id === detailView.id
      ? { ...t, name: teamName, description: teamDesc, trigger, memberIds }
      : t));
    setDetailView(null);
  }

  const currentIconDef = TEAM_ICONS.find(i => i.id === teamIcon);

  const filtered = teams.filter(t => t.name.toLowerCase().includes(teamSearch.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / TEAM_PAGE_SIZE));
  const safePage = Math.min(teamPage, totalPages - 1);
  const pageTeams = filtered.slice(safePage * TEAM_PAGE_SIZE, (safePage + 1) * TEAM_PAGE_SIZE);

  // ── 详情编辑页 ──────────────────────────────────────────
  if (detailView) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* 详情头部 */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--border-subtle)] shrink-0">
          <button onClick={() => setDetailView(null)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 px-2 py-1.5 rounded-lg hover:bg-white/8 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />返回
          </button>
          <div className="w-px h-4 bg-white/10" />
          <h1 className="text-sm font-semibold text-slate-100">{teamName || '未命名团队'}</h1>
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded border',
            enabledMap[detailView.id]
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
              : 'bg-slate-500/15 text-slate-400 border-slate-500/25')}>
            {enabledMap[detailView.id] ? '已启用' : '已停用'}
          </span>
          <div className="flex-1" />
          <button onClick={handleSave} className={btnPrimary}>
            <Check className="w-3.5 h-3.5" />保存配置
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-6">
          <div className="max-w-2xl space-y-5 mx-auto">
            {/* 图标 + 名称 */}
            <div className="flex items-start gap-3">
              <div className="shrink-0">
                <p className="text-xs text-slate-500 font-medium mb-1.5">图标 <span className="text-rose-400">*</span></p>
                <div className="relative">
                  <button type="button" onClick={() => setIconPickerOpen(v => !v)}
                    className={cn('w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all',
                      errors.icon ? 'border-rose-500/60 bg-rose-500/10' : 'border-[var(--border-subtle)] bg-black/5 dark:bg-white/5 hover:bg-black/8 dark:hover:bg-white/8'
                    )}>
                    <span className="text-cyan-400">{currentIconDef?.icon ?? <Users className="w-5 h-5" />}</span>
                  </button>
                  <AnimatePresence>
                    {iconPickerOpen && (
                      <motion.div initial={{ opacity: 0, scale: 0.95, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute top-14 left-0 z-20 p-2 rounded-xl border border-white/15 grid grid-cols-4 gap-1.5 shadow-xl"
                        style={{ background: 'rgba(15,15,30,0.95)', backdropFilter: 'blur(16px)', width: 196 }}>
                        {TEAM_ICONS.map(ic => (
                          <button key={ic.id} type="button" onClick={() => { setTeamIcon(ic.id); setIconPickerOpen(false); setErrors(e => ({ ...e, icon: '' })); }}
                            className={cn('w-10 h-10 rounded-xl flex items-center justify-center border transition-all',
                              teamIcon === ic.id ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-400' : 'border-white/8 text-slate-400 hover:bg-white/8 hover:text-slate-200'
                            )}>
                            {ic.icon}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                {errors.icon && <p className="text-[10px] text-rose-400 mt-1 flex items-center gap-0.5"><AlertCircle className="w-3 h-3" />{errors.icon}</p>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 font-medium mb-1.5">团队名称 <span className="text-rose-400">*</span></p>
                <input value={teamName} onChange={e => { setTeamName(e.target.value); setErrors(v => ({ ...v, name: '' })); }}
                  placeholder="输入团队名称..."
                  className={inputClsErr(!!errors.name)} />
                {errors.name && <p className="text-[10px] text-rose-400 mt-1 flex items-center gap-0.5"><AlertCircle className="w-3 h-3" />{errors.name}</p>}
              </div>
            </div>

            <FieldGroup label="描述">
              <textarea value={teamDesc} onChange={e => setTeamDesc(e.target.value)}
                rows={4} placeholder="描述团队的职责与能力（选填）..."
                className={cn(inputClsErr(), 'resize-none')} />
            </FieldGroup>

            <FieldGroup label={<>触发条件 <span className="text-rose-400">*</span></>}>
              <textarea value={trigger} onChange={e => { setTrigger(e.target.value); setErrors(v => ({ ...v, trigger: '' })); }}
                rows={4} placeholder={'描述何时自动召集此团队，例如：当用户提到"数据分析"或"报表"时...'}
                className={cn(inputClsErr(!!errors.trigger), 'resize-none')} />
              {errors.trigger && <p className="text-[10px] text-rose-400 mt-1 flex items-center gap-0.5"><AlertCircle className="w-3 h-3" />{errors.trigger}</p>}
            </FieldGroup>

            <FieldGroup label="协作模式">
              <div className="grid grid-cols-2 gap-2 mb-4">
                {(Object.entries(MODE_META) as [CollabMode, typeof MODE_META[CollabMode]][]).map(([key, meta]) => (
                  <button key={key} type="button" onClick={() => setMode(key)}
                    className={cn('flex items-start gap-2.5 p-3 rounded-xl border-2 text-left transition-all',
                      mode === key ? meta.accent + ' ' + meta.color : 'border-white/8 text-slate-400 hover:bg-white/5'
                    )}>
                    <span className={cn('mt-0.5 shrink-0', mode === key ? meta.color : 'text-slate-500')}>{meta.icon}</span>
                    <div>
                      <p className={cn('text-xs font-semibold', mode === key ? meta.color : 'text-slate-300')}>{meta.label}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 text-pretty">{meta.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="p-4 rounded-xl bg-white/3 border border-white/8">
                <AnimatePresence mode="wait">
                  <motion.div key={mode} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                    {mode === 'pipeline' && <PipelineConfig memberIds={memberIds} setMemberIds={setMemberIds} />}
                    {mode === 'supervisor' && (
                      <>
                        <SupervisorConfig memberIds={memberIds} setMemberIds={setMemberIds} supervisorId={supervisorId} setSupervisorId={id => { setSupervisorId(id); setErrors(v => ({ ...v, supervisor: '' })); }} />
                        {errors.supervisor && <p className="text-[10px] text-rose-400 mt-2 flex items-center gap-0.5"><AlertCircle className="w-3 h-3" />{errors.supervisor}</p>}
                      </>
                    )}
                    {mode === 'brainstorming' && <BrainstormingConfig memberIds={memberIds} setMemberIds={setMemberIds} />}
                    {mode === 'swarm' && (
                      <>
                        <SwarmConfig ctoId={ctoId} setCtoId={id => { setCtoId(id); setErrors(v => ({ ...v, cto: '' })); }} groups={swarmGroups} setGroups={setSwarmGroups} />
                        {errors.cto && <p className="text-[10px] text-rose-400 mt-2 flex items-center gap-0.5"><AlertCircle className="w-3 h-3" />{errors.cto}</p>}
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </FieldGroup>

            <FieldGroup label="知识库（选填）">
              <KBPicker value={teamKBs} onChange={setTeamKBs} />
            </FieldGroup>
          </div>
        </div>

        <AnimatePresence>
          {deleteTarget && (
            <DeleteConfirm name={deleteTarget.name} onCancel={() => setDeleteTarget(null)} onConfirm={handleDeleteTeam} />
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── 卡片列表页 ──────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 pt-5 pb-0 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-100">智能体团队</h1>
            <p className="text-sm text-slate-500 mt-0.5">配置 Agent 协作模式与触发规则</p>
          </div>
          <button onClick={() => {
            const now = new Date();
            const newTeam: TeamTemplate = {
              id: `team-${Date.now()}`, name: '新建团队', description: '', trigger: '',
              memberIds: [], mode: 'parallel', enabled: false, coordinatorId: '',
              createdAt: now, updatedAt: now,
            };
            setTeams(prev => [...prev, newTeam]);
            setEnabledMap(prev => ({ ...prev, [newTeam.id]: false }));
            enterDetail(newTeam);
          }} className={btnPrimary}>
            <Plus className="w-3.5 h-3.5" />新建团队
          </button>
        </div>
        <div className="flex items-center gap-3 py-2">
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input value={teamSearch} onChange={e => { setTeamSearch(e.target.value); setTeamPage(0); }}
              placeholder="搜索团队..." className="w-full bg-black/5 dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl pl-9 pr-3 py-2 text-xs text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-600 outline-none focus:border-cyan-500/40 transition-colors" />
          </div>
          <span className="text-xs text-slate-500">{filtered.length} 个团队</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-6 pb-4">
        {pageTeams.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <Users className="w-8 h-8 text-slate-500" />
            <p className="text-sm text-slate-500">暂无团队，点击「新建团队」开始</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {pageTeams.map((t, i) => {
              const members = t.memberIds.map(id => getAgent(id)).filter(Boolean);
              const enabled = enabledMap[t.id] ?? t.enabled;
              return (
                <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  onClick={() => enterDetail(t)}
                  className="glass glass-hover rounded-2xl p-4 flex flex-col h-full cursor-pointer hover:ring-1 hover:ring-cyan-500/30 transition-all relative">

                  {/* 右上角操作按钮组（开关 → 编辑 → 复制 → 删除） */}
                  <div className="absolute top-3 right-3 flex items-center gap-0.5 z-10" onClick={e => e.stopPropagation()}>
                    {/* 启用/停用开关 */}
                    <button
                      onClick={() => setEnabledMap(prev => ({ ...prev, [t.id]: !prev[t.id] }))}
                      title={enabled ? '停用' : '启用'}
                      className={cn(
                        'w-9 h-5 rounded-full relative transition-all duration-200 shrink-0 mr-1',
                        enabled ? 'bg-gradient-to-r from-cyan-500 to-purple-600' : 'bg-black/15 dark:bg-white/15'
                      )}>
                      <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200', enabled ? 'left-4' : 'left-0.5')} />
                    </button>
                    <button onClick={() => enterDetail(t)} title="编辑"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleCopy(t)} title="复制"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 transition-colors">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteTarget(t)} title="删除"
                      className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* 卡片头（为右上角按钮留出空间） */}
                  <div className="flex items-start gap-3 mb-3 pr-32">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-violet-500 to-purple-600">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-100 truncate">{t.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{t.description || '暂无描述'}</p>
                    </div>
                  </div>
                  {/* 成员头像 */}
                  {members.length > 0 && (
                    <div className="flex items-center gap-1 mb-3">
                      {members.slice(0, 5).map(a => a && (
                        <div key={a.id} className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                          style={{ background: `${a.color}25`, border: `1.5px solid ${a.color}50`, color: a.color }} title={a.name}>{a.avatar}</div>
                      ))}
                      {members.length > 5 && <span className="text-[10px] text-slate-500 ml-0.5">+{members.length - 5}</span>}
                    </div>
                  )}
                  {/* 统计 */}
                  <div className="flex items-center gap-3 mt-auto pt-3 border-t border-white/8 text-[11px] text-slate-500">
                    <span>{t.memberIds.length} 名成员</span>
                    <span>·</span>
                    <span>{t.mode === 'parallel' ? '并行' : '顺序'}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-[var(--border-subtle)] shrink-0">
          <span className="text-xs text-slate-500">第 {safePage + 1} / {totalPages} 页</span>
          <div className="flex items-center gap-1">
            <button disabled={safePage === 0} onClick={() => setTeamPage(p => p - 1)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/8 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i} onClick={() => setTeamPage(i)}
                className={cn('w-7 h-7 rounded-lg text-xs font-medium transition-all',
                  i === safePage ? 'btn-aurora text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/8')}>
                {i + 1}
              </button>
            ))}
            <button disabled={safePage >= totalPages - 1} onClick={() => setTeamPage(p => p + 1)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/8 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {deleteTarget && (
          <DeleteConfirm name={deleteTarget.name} onCancel={() => setDeleteTarget(null)} onConfirm={handleDeleteTeam} />
        )}
      </AnimatePresence>
    </div>
  );
}

function FieldGroup({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-slate-500 font-medium block mb-1.5">{label}</label>
      {children}
    </div>
  );
}
