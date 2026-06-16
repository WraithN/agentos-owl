import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, AlertCircle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { inputClsErr, btnPrimary } from '@/lib/ui-styles';
import type { TeamTemplate } from '@/types';
import { FieldGroup } from './FieldGroup';
import { KBPicker } from './KBPicker';
import { AgentAssignment } from './AgentAssignment';
import { MODE_META, TEAM_ICONS, type CollabMode, type KBRef, type SwarmGroup } from './constants';

interface TemplateFormDialogProps {
  template: TeamTemplate;
  enabled: boolean;
  onCancel: () => void;
  onSave: (t: TeamTemplate) => void;
}

// ── 创建/编辑模板表单（全页） ──────────────────────────────────────────────────
export function TemplateFormDialog({ template, enabled, onCancel, onSave }: TemplateFormDialogProps) {
  const [teamName, setTeamName] = useState('');
  const [teamDesc, setTeamDesc] = useState('');
  const [teamIcon, setTeamIcon] = useState('users');
  const [trigger, setTrigger] = useState('');
  const [mode, setMode] = useState<CollabMode>('pipeline');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [supervisorId, setSupervisorId] = useState('');
  const [ctoId, setCtoId] = useState('');
  const [swarmGroups, setSwarmGroups] = useState<SwarmGroup[]>([{ id: 'g1', leaderId: '', memberIds: [] }]);
  const [teamKBs, setTeamKBs] = useState<KBRef[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  useEffect(() => {
    setTeamName(template.name);
    setTeamDesc(template.description);
    setTeamIcon('users');
    setTrigger(template.trigger);
    setMemberIds(template.memberIds);
    setSupervisorId(template.coordinatorId ?? '');
    setCtoId(template.coordinatorId ?? '');
    setTeamKBs([]);
    setErrors({});
  }, [template.id]);

  const currentIconDef = TEAM_ICONS.find(i => i.id === teamIcon);

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
    if (!validate()) return;
    onSave({ ...template, name: teamName, description: teamDesc, trigger, memberIds });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 详情头部 */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--border-subtle)] shrink-0">
        <button onClick={onCancel}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 px-2 py-1.5 rounded-lg hover:bg-white/8 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />返回
        </button>
        <div className="w-px h-4 bg-white/10" />
        <h1 className="text-sm font-semibold text-slate-100">{teamName || '未命名团队'}</h1>
        <span className={cn('text-[10px] px-1.5 py-0.5 rounded border',
          enabled
            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
            : 'bg-slate-500/15 text-slate-400 border-slate-500/25')}>
          {enabled ? '已启用' : '已停用'}
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
                  <AgentAssignment
                    mode={mode}
                    memberIds={memberIds}
                    setMemberIds={setMemberIds}
                    supervisorId={supervisorId}
                    setSupervisorId={id => { setSupervisorId(id); setErrors(v => ({ ...v, supervisor: '' })); }}
                    ctoId={ctoId}
                    setCtoId={id => { setCtoId(id); setErrors(v => ({ ...v, cto: '' })); }}
                    groups={swarmGroups}
                    setGroups={setSwarmGroups}
                  />
                  {mode === 'supervisor' && errors.supervisor && (
                    <p className="text-[10px] text-rose-400 mt-2 flex items-center gap-0.5"><AlertCircle className="w-3 h-3" />{errors.supervisor}</p>
                  )}
                  {mode === 'swarm' && errors.cto && (
                    <p className="text-[10px] text-rose-400 mt-2 flex items-center gap-0.5"><AlertCircle className="w-3 h-3" />{errors.cto}</p>
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
    </div>
  );
}
