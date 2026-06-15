/* 空状态页面 */
import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { CONVERSATIONS } from '@/data/mockData';

const QUICK_ACTIONS = [
  { label: '分析数据', emoji: '📊', prompt: '帮我分析用户增长数据，找出关键漏斗瓶颈' },
  { label: '生成代码', emoji: '⚡', prompt: '帮我生成一个 React 拖拽排序组件' },
  { label: '撰写文档', emoji: '📝', prompt: '帮我撰写一份产品需求文档' },
  { label: '竞品监控', emoji: '🔍', prompt: '运行每日竞品监控，分析竞品最新动态' },
];

export default function EmptyState({ onQuickAction }: { onQuickAction: (text: string) => void }) {
  const { setCurrentConversation, setChatMode } = useApp();

  function handleQuick(prompt: string) {
    setCurrentConversation(CONVERSATIONS[2]);
    setChatMode('single');
    setTimeout(() => onQuickAction(prompt), 100);
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6 py-12 overflow-y-auto">
      {/* 极光球 */}
      <motion.div
        animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="relative w-24 h-24"
      >
        <div
          className="absolute inset-0 rounded-full blur-xl opacity-60"
          style={{ background: 'linear-gradient(135deg, #00f2c3, #38bdf8, #7c3aed)' }}
        />
        <div
          className="absolute inset-2 rounded-full blur-md"
          style={{ background: 'linear-gradient(135deg, #00f2c3, #38bdf8, #7c3aed)' }}
        />
      </motion.div>

      {/* 标题 */}
      <div className="text-center">
        <h1 className="text-xl font-semibold text-slate-100 text-balance mb-3">
          告诉我你的意图，剩下的交给 Acta
        </h1>
        <p className="text-sm text-slate-400 max-w-sm text-pretty leading-relaxed">
          简单任务即时响应，复杂项目自动协调团队，重复流程一键自动化
        </p>
      </div>

      {/* 快捷操作 */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-md">
        {QUICK_ACTIONS.map((action, i) => (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            onClick={() => handleQuick(action.prompt)}
            className="glass glass-hover flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200"
          >
            <span className="text-xl">{action.emoji}</span>
            <span className="text-sm text-slate-200 font-medium">{action.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
