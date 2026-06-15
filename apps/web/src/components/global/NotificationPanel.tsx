/* 通知中心侧滑面板 */
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertTriangle, Info, XCircle, Bell } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { cn } from '@/lib/utils';
import type { Notification } from '@/types';

const typeConfig = {
  success: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  info:    { icon: Info,          color: 'text-blue-400',   bg: 'bg-blue-500/10' },
  error:   { icon: XCircle,       color: 'text-rose-400',   bg: 'bg-rose-500/10' },
};

function timeAgo(date: Date) {
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  return `${Math.floor(h / 24)} 天前`;
}

export default function NotificationPanel() {
  const { notificationPanelOpen, setNotificationPanelOpen, notifications, markNotificationRead } = useApp();
  const unread = notifications.filter(n => !n.read).length;

  return (
    <AnimatePresence>
      {notificationPanelOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setNotificationPanelOpen(false)}
          />
          <motion.aside
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="fixed right-0 top-0 bottom-0 w-80 z-50 flex flex-col shadow-2xl"
            style={{ background: 'var(--panel-bg-solid)', border: '1px solid var(--border-subtle)', backdropFilter: 'blur(24px)' }}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 shrink-0">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-cyan-400" />
                <span className="text-slate-200 font-semibold text-sm">通知中心</span>
                {unread > 0 && (
                  <span className="text-xs bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full">{unread}</span>
                )}
              </div>
              <button
                onClick={() => setNotificationPanelOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/8 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 通知列表 */}
            <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-2">
              {notifications.map(n => (
                <NotifCard key={n.id} notif={n} onRead={markNotificationRead} />
              ))}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function NotifCard({ notif, onRead }: { notif: Notification; onRead: (id: string) => void }) {
  const cfg = typeConfig[notif.type];
  const Icon = cfg.icon;
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
      onClick={() => onRead(notif.id)}
      className={cn(
        'flex gap-3 p-3 rounded-xl cursor-pointer transition-all border',
        notif.read
          ? 'border-white/5 bg-white/2 opacity-60'
          : 'border-white/10 bg-white/5 hover:bg-white/8'
      )}
    >
      <div className={cn('p-1.5 rounded-lg shrink-0 mt-0.5', cfg.bg)}>
        <Icon className={cn('w-3.5 h-3.5', cfg.color)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-200 font-medium text-balance">{notif.title}</p>
        <p className="text-xs text-slate-400 mt-0.5 text-pretty">{notif.content}</p>
        <p className="text-xs text-slate-600 mt-1">{timeAgo(notif.timestamp)}</p>
      </div>
      {!notif.read && <div className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 mt-1.5 pulse-cyan" />}
    </motion.div>
  );
}
