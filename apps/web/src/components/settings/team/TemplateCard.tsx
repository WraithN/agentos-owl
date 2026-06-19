import { motion } from 'framer-motion';
import { Users, Pencil, Copy, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAgents } from '@/hooks/use-agents';
import type { TeamTemplate } from '@/types';

interface TemplateCardProps {
  team: TeamTemplate;
  index: number;
  enabled: boolean;
  onEdit: (t: TeamTemplate) => void;
  onCopy: (t: TeamTemplate) => void;
  onDelete: (t: TeamTemplate) => void;
  onToggle: () => void;
}

// ── 团队模板卡片 ───────────────────────────────────────────────────────────────
export function TemplateCard({ team, index, enabled, onEdit, onCopy, onDelete, onToggle }: TemplateCardProps) {
  const { getAgent } = useAgents();
  const members = team.memberIds.map(id => getAgent(id)).filter(Boolean);
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
      onClick={() => onEdit(team)}
      className="glass glass-hover rounded-2xl p-4 flex flex-col h-full cursor-pointer hover:ring-1 hover:ring-cyan-500/30 transition-all relative">

      {/* 右上角操作按钮组（开关 → 编辑 → 复制 → 删除） */}
      <div className="absolute top-3 right-3 flex items-center gap-0.5 z-10" onClick={e => e.stopPropagation()}>
        <button
          onClick={onToggle}
          title={enabled ? '停用' : '启用'}
          className={cn(
            'w-9 h-5 rounded-full relative transition-all duration-200 shrink-0 mr-1',
            enabled ? 'bg-gradient-to-r from-cyan-500 to-purple-600' : 'bg-black/15 dark:bg-white/15'
          )}>
          <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200', enabled ? 'left-4' : 'left-0.5')} />
        </button>
        <button onClick={() => onEdit(team)} title="编辑"
          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onCopy(team)} title="复制"
          className="p-1.5 rounded-lg text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 transition-colors">
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onDelete(team)} title="删除"
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
          <p className="text-sm font-semibold text-slate-100 truncate">{team.name}</p>
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{team.description || '暂无描述'}</p>
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
        <span>{team.memberIds.length} 名成员</span>
        <span>·</span>
        <span>{team.mode === 'parallel' ? '并行' : '顺序'}</span>
      </div>
    </motion.div>
  );
}
