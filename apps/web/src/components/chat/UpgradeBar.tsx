/* 自动升级提示条 */
import { motion } from 'framer-motion';
import { Users, X } from 'lucide-react';

export default function UpgradeBar({
  onConfirm, onDismiss,
}: {
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="shrink-0 overflow-hidden"
    >
      <div
        className="flex items-center gap-3 px-4 py-2 text-sm"
        style={{
          background: 'linear-gradient(135deg, rgba(0,242,195,0.12) 0%, rgba(124,58,237,0.12) 100%)',
          borderBottom: '1px solid rgba(0,242,195,0.2)',
        }}
      >
        {/* 旋转加载圈 */}
        <div className="w-4 h-4 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin shrink-0" />
        <span className="text-slate-300 flex-1 text-pretty">
          检测到复杂项目，正在为您组建专家团队...
        </span>
        <button
          onClick={onConfirm}
          className="px-3 py-1 rounded-lg text-xs font-medium btn-aurora text-white shrink-0"
        >
          <Users className="w-3 h-3 inline mr-1" />
          组建团队
        </button>
        <button
          onClick={onDismiss}
          className="p-1 text-slate-500 hover:text-slate-300 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
