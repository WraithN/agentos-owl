import { motion } from 'framer-motion';
import { X } from 'lucide-react';

export default function Modal({ title, icon, onClose, children, footer }: {
  title: string;
  icon: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.16 }}
        className="relative w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
        style={{ background: 'var(--panel-bg-solid)', border: '1px solid var(--border-subtle)', backdropFilter: 'blur(24px)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2">{icon}<h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h2></div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/8 dark:hover:bg-white/8 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0 p-5 space-y-4">{children}</div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 shrink-0" style={{ borderTop: '1px solid var(--border-subtle)' }}>{footer}</div>
      </motion.div>
    </div>
  );
}
