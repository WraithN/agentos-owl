/* 输入框团队选择器 */
import { useState, useEffect, useCallback } from 'react';
import { Users } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { TeamTemplate } from '@/types';
import { listTeams } from '@/services/electron';

interface TeamSelectorProps {
  selected?: string;
  onSelect?: (teamId?: string) => void;
}

export function TeamSelector({ selected, onSelect }: TeamSelectorProps) {
  const [teams, setTeams] = useState<TeamTemplate[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    listTeams().then(setTeams).catch(() => setTeams([]));
  }, []);

  const handleSelect = useCallback((teamId?: string) => {
    onSelect?.(teamId);
    setOpen(false);
  }, [onSelect]);

  return (
    <div className="relative">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="智能团队"
            className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5"
          >
            <Users className="w-3.5 h-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent>智能团队</TooltipContent>
      </Tooltip>
      {open && (
        <div className="absolute bottom-8 left-0 z-20 min-w-[160px] rounded-xl border border-white/10 bg-background/95 p-1 shadow-xl">
          <button
            type="button"
            onClick={() => handleSelect(undefined)}
            className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-white/5 text-slate-300"
          >
            智能选择
          </button>
          {teams.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleSelect(t.id)}
              className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-white/5 text-slate-300"
            >
              {t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
