/* CoT 思维过程（可折叠） */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Brain } from 'lucide-react';
import { cn } from '@owl-os/core';
import type { CotStep } from '../types.js';

export default function CotSteps({ steps, defaultOpen }: { steps: CotStep[]; defaultOpen?: boolean }) {
  const [expanded, setExpanded] = useState(defaultOpen ?? false);
  return (
    <div className="mb-2">
      <button onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-1.5 text-xs transition-colors group btn-lift px-2 py-1 rounded-lg"
        style={{ color: 'var(--text-tertiary)' }}>
        <Brain className="w-3.5 h-3.5 text-violet-400" />
        <span className="group-hover:text-violet-300 transition-colors">
          思考过程 <span style={{ color: 'var(--text-disabled)' }}>({steps.length} 步)</span>
        </span>
        <ChevronDown className={cn('w-3 h-3 transition-transform', expanded && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="overflow-hidden">
            <div className="mt-2 pl-3 border-l-2 border-violet-500/30 space-y-2.5">
              {steps.map(step => (
                <div key={step.id} className="text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-violet-400 font-medium">{step.title}</span>
                    <span style={{ color: 'var(--text-disabled)' }}>· {step.duration}ms</span>
                  </div>
                  <p className="mt-0.5 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>{step.content}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
