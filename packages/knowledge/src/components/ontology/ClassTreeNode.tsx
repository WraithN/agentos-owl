import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Box } from 'lucide-react';
import { cn } from '@owl-os/core';
import type { OntClass } from './types.js';

export default function ClassTreeNode({ cls, all, selected, onSelect, depth }: {
  cls: OntClass;
  all: OntClass[];
  selected: OntClass | null;
  onSelect: (c: OntClass) => void;
  depth: number;
}) {
  const children = all.filter(c => c.parent === cls.id);
  const [open, setOpen] = useState(depth < 2);
  const isSelected = selected?.id === cls.id;
  return (
    <div>
      <div className="flex items-center">
        <button onClick={() => { onSelect(cls); if (children.length) setOpen(v => !v); }}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          className={cn('flex-1 flex items-center gap-1.5 py-1.5 pr-3 text-xs transition-colors',
            isSelected ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 font-semibold' : 'text-slate-600 dark:text-slate-300 hover:bg-black/4 dark:hover:bg-white/4')}>
          {children.length > 0
            ? <ChevronRight className={cn('w-3 h-3 shrink-0 transition-transform', open && 'rotate-90')} />
            : <div className="w-3 h-3 shrink-0" />}
          <Box className={cn('w-3 h-3 shrink-0', isSelected ? 'text-violet-400' : 'text-slate-400')} />
          <span className="truncate">{cls.name}</span>
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && children.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.12 }} className="overflow-hidden">
            {children.map(child => <ClassTreeNode key={child.id} cls={child} all={all} selected={selected} onSelect={onSelect} depth={depth + 1} />)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
