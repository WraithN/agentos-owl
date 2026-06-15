/* 顶部全局栏 */
import { Bell, Sun, Moon } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { cn } from '@/lib/utils';
import WindowControls from './WindowControls';

const MODULE_LABELS: Record<string, string> = {
  chat: '对话',
  knowledge: '知识库',
  tools: '工具市场',
  settings: '设置',
};

export default function TopBar() {
  const {
    activeModule,
    notifications, notificationPanelOpen, setNotificationPanelOpen,
    setCommandPaletteOpen, darkMode, toggleDarkMode,
  } = useApp();

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header
      className="h-14 flex items-center gap-3 px-4 shrink-0 z-20 select-none"
      style={{
        background: 'var(--glass-l2)',
        backdropFilter: 'var(--glass-blur-l2)',
        WebkitBackdropFilter: 'var(--glass-blur-l2)',
        borderBottom: '1px solid var(--border-l2)',
        boxShadow: '0 2px 16px rgba(0,0,0,0.12)',
      }}
      data-tauri-drag-region
    >
      {/* 左侧：模块标题 */}
      <div className="flex items-center gap-2 shrink-0 min-w-[120px] h-full">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-100 truncate tracking-tight">
          {MODULE_LABELS[activeModule] ?? activeModule}
        </span>
      </div>

      {/* 中间：搜索框（居中） */}
      <div className="flex-1 flex items-center justify-center">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2 w-full max-w-md px-4 py-2 rounded-xl text-slate-500 dark:text-slate-400 text-sm transition-all duration-200 btn-lift"
          style={{
            background: 'var(--surface-hover)',
            border: '1px solid var(--border-l2)',
            boxShadow: 'var(--shadow-xs)',
          }}
          onMouseOver={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,242,195,0.25)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 3px rgba(0,242,195,0.06), var(--shadow-sm)';
          }}
          onMouseOut={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-l2)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--shadow-xs)';
          }}
        >
          <svg className="w-4 h-4 shrink-0 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" strokeLinecap="round" />
          </svg>
          <span className="flex-1 text-left truncate opacity-60">搜索会话、Agent、知识库...</span>
          <span className="text-xs font-mono px-1.5 py-0.5 rounded opacity-40"
            style={{ background: 'var(--surface-active)', border: '1px solid var(--border-l1)' }}>
            ⌘K
          </span>
        </button>
      </div>

      {/* 右侧工具区 */}
      <div className="flex items-center gap-1 shrink-0">
        {/* 主题切换 */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all duration-150 btn-lift"
          style={{ background: 'transparent' }}
          title={darkMode ? '切换到浅色模式' : '切换到深色模式'}
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* 通知铃铛 */}
        <button
          onClick={() => setNotificationPanelOpen(!notificationPanelOpen)}
          className={cn(
            'relative p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all duration-150 btn-lift',
            notificationPanelOpen && 'bg-white/8 text-slate-200'
          )}
        >
          <Bell className={cn('w-5 h-5', unreadCount > 0 && 'bell-shake')} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 pulse-cyan ring-2 ring-[var(--glass-l2)]" />
          )}
        </button>

        {/* 窗口控制按钮（仅 Tauri 环境） */}
        <WindowControls />
      </div>
    </header>
  );
}
