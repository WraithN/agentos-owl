/* 自定义标题栏窗口控制按钮（仅 Tauri 环境显示） */
import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, Maximize2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function WindowControls() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isTauri, setIsTauri] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) {
      return;
    }

    setIsTauri(true);
    const win = getCurrentWindow();

    // 初始化最大化状态
    win.isMaximized().then(setIsMaximized).catch(() => {});

    // 监听窗口尺寸变化，同步最大化状态
    const unlisten = win.onResized(() => {
      win.isMaximized().then(setIsMaximized).catch(() => {});
    });

    return () => {
      unlisten.then(fn => fn()).catch(() => {});
    };
  }, []);

  if (!isTauri) return null;

  const win = getCurrentWindow();

  return (
    <div className="flex items-center gap-0.5 ml-1">
      <button
        type="button"
        onClick={() => win.minimize().catch(() => {})}
        className={cn(
          'p-2 rounded-lg transition-all duration-150 btn-lift',
          'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
        )}
        style={{ background: 'transparent' }}
        title="最小化"
      >
        <Minus className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => win.toggleMaximize().catch(() => {})}
        className={cn(
          'p-2 rounded-lg transition-all duration-150 btn-lift',
          'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
        )}
        style={{ background: 'transparent' }}
        title={isMaximized ? '还原' : '最大化'}
      >
        {isMaximized ? (
          <Square className="w-3.5 h-3.5" strokeWidth={2.5} />
        ) : (
          <Maximize2 className="w-3.5 h-3.5" strokeWidth={2} />
        )}
      </button>

      <button
        type="button"
        onClick={() => win.close().catch(() => {})}
        className={cn(
          'p-2 rounded-lg transition-all duration-150 btn-lift',
          'text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:bg-rose-500/10'
        )}
        style={{ background: 'transparent' }}
        title="关闭"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
