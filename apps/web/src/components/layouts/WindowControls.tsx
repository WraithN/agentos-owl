/* 自定义标题栏窗口控制按钮（Electron 环境） */
import { useEffect, useState } from 'react';
import { Minus, Square, Maximize2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function WindowControls() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.electron) {
      return;
    }

    setIsElectron(true);

    window.electron.invoke<boolean>('window_is_maximized').then(setIsMaximized).catch(() => {});

    const unsubscribe = window.electron.on('window_resized', (...args: unknown[]) => {
      const payload = args[0] as { isMaximized?: boolean } | undefined;
      if (typeof payload?.isMaximized === 'boolean') {
        setIsMaximized(payload.isMaximized);
      }
    });

    window.electron.invoke<void>('window_start_resize_listener').catch(() => {});

    return () => {
      unsubscribe();
    };
  }, []);

  if (!isElectron) return null;

  return (
    <div className="flex items-center gap-0.5 ml-1">
      <button
        type="button"
        onClick={() => window.electron.invoke('window_minimize').catch(() => {})}
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
        onClick={() => window.electron.invoke('window_maximize').catch(() => {})}
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
        onClick={() => window.electron.invoke('window_close').catch(() => {})}
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
