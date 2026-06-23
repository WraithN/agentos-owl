/* 左侧边栏导航 */
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Database, Puzzle, Settings,
  ChevronLeft, ChevronRight,
  Zap, MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';
import { useT } from '@/lib/i18n';

export default function Sidebar() {
  const { sidebarExpanded, toggleSidebar, activeModule, setActiveModule } = useApp();
  const t = useT();

  const NAV_ITEMS = [
    { id: 'chat',      icon: MessageSquare, label: t('nav.chat'),      highlight: true },
    { id: 'knowledge', icon: Database,      label: t('nav.knowledge'), highlight: false },
    { id: 'tools',     icon: Puzzle,        label: t('nav.tools'),     highlight: false },
    { id: 'settings',  icon: Settings,      label: t('nav.settings'),  highlight: false },
    { id: 'more',      icon: MoreHorizontal,label: '更多',              highlight: false },
  ];

  const w = sidebarExpanded ? 240 : 80;

  return (
    <motion.aside
      animate={{ width: w }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      className="relative flex flex-col h-screen shrink-0"
      style={{
        background: 'var(--glass-l1)',
        backdropFilter: 'var(--glass-blur-l1)',
        WebkitBackdropFilter: 'var(--glass-blur-l1)',
        borderRight: '1px solid var(--border-l2)',
        boxShadow: '2px 0 24px rgba(0,0,0,0.18)',
        overflow: 'visible',
        // 右侧 tooltip 可溢出，但左/上/下裁剪
        clipPath: 'none',
      }}
    >
      {/* Logo 区 */}
      <div className={cn(
          'flex items-center h-14 shrink-0',
          sidebarExpanded ? 'gap-3 px-3' : 'gap-1 px-2'
        )}
        style={{ borderBottom: '1px solid var(--border-l1)' }}>
        {/* 极光 A 图标 */}
        <div className={cn(
          'flex items-center justify-center rounded-xl shrink-0 btn-aurora',
          sidebarExpanded ? 'w-8 h-8' : 'w-8 h-8'
        )}>
          <Zap className="w-4 h-4 text-white" />
        </div>
        <AnimatePresence>
          {sidebarExpanded && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className="aurora-text font-semibold text-base whitespace-nowrap flex-1 min-w-0"
            >
              OwlOS
            </motion.span>
          )}
        </AnimatePresence>
        {/* 折叠/展开 按钮 */}
        <motion.button
          onClick={toggleSidebar}
          className="ml-auto flex items-center justify-center w-6 h-6 rounded-lg transition-all btn-lift shrink-0 text-slate-400 hover:text-slate-200 hover:bg-white/5"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          title={sidebarExpanded ? '收起侧边栏' : '展开侧边栏'}
        >
          {sidebarExpanded ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </motion.button>
      </div>

      {/* 主导航 */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto overflow-x-visible min-h-0 scrollbar-none">
        {NAV_ITEMS.map(item => {
          const active = activeModule === item.id;
          const Icon = item.icon;
          return (
            <motion.button
              key={item.id}
              onClick={() => setActiveModule(item.id)}
              className={cn(
                'group relative w-full flex items-center rounded-xl transition-all duration-200',
                sidebarExpanded ? 'gap-3 px-3 py-2.5' : 'justify-center px-0 py-2.5',
                active
                  ? 'text-white'
                  : 'hover:bg-white/5'
              )}
              style={active ? {
                background: 'rgba(0,212,170,0.10)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 8px rgba(0,212,170,0.10)',
                border: '1px solid rgba(0,212,170,0.18)',
              } : {}}
              whileHover={{ x: sidebarExpanded ? 2 : 0 }}
              whileTap={{ scale: 0.96 }}
            >
              {/* 左侧激活指示条 */}
              {active && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full nav-active-glow"
                  style={{ background: 'linear-gradient(180deg, #00f2c3, #0ea5e9)' }}
                />
              )}
              <Icon className={cn('w-5 h-5 shrink-0 transition-colors', active ? 'text-cyan-400' : '')} />
              <AnimatePresence>
                {sidebarExpanded && (
                  <motion.span
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.15 }}
                    className={cn('text-sm font-medium whitespace-nowrap', active ? 'text-slate-100' : '')}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {/* 收起状态 hover tooltip */}
              {!sidebarExpanded && (
                <>
                  <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-30 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150"
                    style={{
                      background: 'var(--glass-l4)',
                      backdropFilter: 'var(--glass-blur-l4)',
                      WebkitBackdropFilter: 'var(--glass-blur-l4)',
                      border: '1px solid var(--border-l2)',
                      boxShadow: 'var(--shadow-md)',
                      color: 'var(--text-primary)',
                    }}>
                    {item.label}
                  </span>
                  {/* tooltip 小箭头 */}
                  <span className="absolute left-full top-1/2 -translate-y-1/2 z-30 w-1.5 h-1.5 rotate-45 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150"
                    style={{
                      background: 'var(--glass-l4)',
                      borderLeft: '1px solid var(--border-l2)',
                      borderBottom: '1px solid var(--border-l2)',
                      marginLeft: '1.5px',
                    }} />
                </>
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* 底部工具栏 */}
      <div className="px-2 py-3 shrink-0"
        style={{ borderTop: '1px solid var(--border-l1)' }}>
        {/* 用户信息卡 */}
        <div className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
          sidebarExpanded ? 'cursor-pointer' : ''
        )}>
          <div className="w-8 h-8 rounded-full btn-aurora flex items-center justify-center text-white text-xs font-bold shrink-0 ring-2 ring-white/10">
            U
          </div>
          <AnimatePresence>
            {sidebarExpanded && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="min-w-0 flex-1"
              >
                <p className="text-sm text-slate-200 font-medium truncate leading-tight">用户</p>
                <p className="text-xs text-cyan-400 opacity-80 leading-tight mt-0.5">
                  <span className="badge badge-success text-[10px] py-0 px-1.5">Pro</span>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
}
