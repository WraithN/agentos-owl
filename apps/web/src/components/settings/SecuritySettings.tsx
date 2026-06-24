/* 安全与审计：会话日志 + 操作日志（数据来源 SQLite） */
import { Fragment, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronRight as ChevronRightIcon, RefreshCw, MessagesSquare, ScrollText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { listAuditLogs, listConversationDetails, listSessionLogs, type AuditLog, type ConversationDetailEntry, type SessionLog } from '@/services/electron';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';

type TabKey = 'session' | 'audit';

const PAGE_SIZE = 8;

const SESSION_STATUS_STYLE: Record<string, string> = {
  success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  failed:  'bg-rose-500/15 text-rose-400 border-rose-500/25',
  running: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
};

const AUDIT_RESULT_STYLE: Record<string, string> = {
  success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  failed:  'bg-rose-500/15 text-rose-400 border-rose-500/25',
};

function ModeLabel({ mode }: { mode: string }) {
  const t = useT();
  return <>{t(`mode.${mode}` as Parameters<ReturnType<typeof useT>>[0], mode)}</>;
}

function formatTimestamp(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDuration(ms: number): string {
  if (!ms) return '-';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export default function SecuritySettings() {
  const [tab, setTab] = useState<TabKey>('session');
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [details, setDetails] = useState<ConversationDetailEntry[]>([]);
  const [selectedLog, setSelectedLog] = useState<SessionLog | null>(null);
  const [detailArchived, setDetailArchived] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const [s, a] = await Promise.all([listSessionLogs(500), listAuditLogs(500)]);
      setSessionLogs(s);
      setAuditLogs(a);
    } catch (err) {
      console.error('[SecuritySettings] 加载日志失败', err);
      toast.error('加载日志失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const openSessionDetail = async (log: SessionLog) => {
    if (selectedLog?.id === log.id) {
      setSelectedLog(null);
      setDetails([]);
      setDetailArchived(false);
      return;
    }
    setSelectedLog(log);
    setDetailArchived(false);
    if (!log.conversationId) {
      setDetails([]);
      setDetailArchived(true);
      return;
    }
    try {
      const nextDetails = await listConversationDetails(log.conversationId);
      setDetails(nextDetails);
      setDetailArchived(nextDetails.length === 0);
    } catch (err) {
      console.error('[SecuritySettings] 加载会话详情失败', err);
      setDetails([]);
      setDetailArchived(true);
    }
  };

  // 切换 tab 时重置分页
  useEffect(() => {
    setPage(0);
  }, [tab]);

  const currentLogs = tab === 'session' ? sessionLogs : auditLogs;
  const totalPages = Math.max(1, Math.ceil(currentLogs.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageLogs = useMemo(
    () => currentLogs.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE),
    [currentLogs, safePage]
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">安全与审计</h1>
          <p className="text-sm text-slate-400 mt-1">系统会话与操作日志，全部从本地 SQLite 读取</p>
        </div>
        <button
          type="button"
          onClick={loadLogs}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-white/10 text-slate-300 hover:text-slate-100 hover:bg-white/5 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          刷新
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 w-fit">
        <TabButton
          active={tab === 'session'}
          icon={<MessagesSquare className="w-3.5 h-3.5" />}
          label="会话日志"
          count={sessionLogs.length}
          onClick={() => setTab('session')}
        />
        <TabButton
          active={tab === 'audit'}
          icon={<ScrollText className="w-3.5 h-3.5" />}
          label="操作日志"
          count={auditLogs.length}
          onClick={() => setTab('audit')}
        />
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        {tab === 'session' ? (
          <SessionLogTable
            logs={pageLogs as SessionLog[]}
            selectedLog={selectedLog}
            details={details}
            detailArchived={detailArchived}
            onToggleDetail={openSessionDetail}
          />
        ) : (
          <AuditLogTable logs={pageLogs as AuditLog[]} />
        )}


        {/* 分页栏 */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-white/5">
          <span className="text-xs text-slate-500">
            {currentLogs.length === 0
              ? '暂无日志记录'
              : `第 ${safePage * PAGE_SIZE + 1}–${Math.min((safePage + 1) * PAGE_SIZE, currentLogs.length)} 条，共 ${currentLogs.length} 条`}
          </span>
          {currentLogs.length > 0 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={safePage === 0}
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  safePage === 0
                    ? 'text-slate-700 cursor-not-allowed'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/8'
                )}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setPage(i)}
                  className={cn(
                    'w-7 h-7 rounded-lg text-xs font-medium transition-colors',
                    i === safePage
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-white/8'
                  )}
                >
                  {i + 1}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={safePage === totalPages - 1}
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  safePage === totalPages - 1
                    ? 'text-slate-700 cursor-not-allowed'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/8'
                )}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  count: number;
  onClick: () => void;
}

function TabButton({ active, icon, label, count, onClick }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
        active
          ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/25'
          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
      )}
    >
      {icon}
      <span>{label}</span>
      <span className={cn(
        'ml-1 px-1.5 py-0.5 rounded-md text-[10px]',
        active ? 'bg-cyan-500/20 text-cyan-200' : 'bg-white/5 text-slate-500'
      )}>{count}</span>
    </button>
  );
}

function SessionLogTable({
  logs,
  selectedLog,
  details,
  detailArchived,
  onToggleDetail,
}: {
  logs: SessionLog[];
  selectedLog: SessionLog | null;
  details: ConversationDetailEntry[];
  detailArchived: boolean;
  onToggleDetail: (log: SessionLog) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/5">
            {['时间', '会话', '模式', 'Agent', '模型', '事件', '摘要', 'Tokens', '耗时', '状态'].map(h => (
              <th key={h} className="px-4 py-2.5 text-left text-xs text-slate-500 font-medium whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr>
              <td colSpan={10} className="px-4 py-10 text-center text-xs text-slate-500">暂无会话日志</td>
            </tr>
          ) : logs.map(log => {
            const expanded = selectedLog?.id === log.id;
            return (
              <Fragment key={log.id}>
                <tr className="border-b border-white/4 hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3 text-xs text-slate-500 font-mono whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="rounded-md p-1 text-slate-500 hover:bg-white/8 hover:text-slate-200 disabled:opacity-30"
                        disabled={!log.conversationId}
                        onClick={() => onToggleDetail(log)}
                      >
                        {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRightIcon className="h-3.5 w-3.5" />}
                      </button>
                      <span>{formatTimestamp(log.timestamp)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300 whitespace-nowrap max-w-[160px] truncate" title={log.conversationTitle}>
                    {log.conversationTitle || '-'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap"><ModeLabel mode={log.mode} /></td>
                  <td className="px-4 py-3 text-xs text-slate-300 whitespace-nowrap">{log.agentName || '-'}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 font-mono whitespace-nowrap">{log.model || '-'}</td>
                  <td className="px-4 py-3 text-xs text-slate-300 font-mono whitespace-nowrap">{log.event}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 max-w-xs truncate" title={log.summary}>{log.summary || '-'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 font-mono whitespace-nowrap text-right">{log.tokens || '-'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 font-mono whitespace-nowrap">{formatDuration(log.durationMs)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={cn(
                      'text-[11px] px-2 py-0.5 rounded-full border',
                      SESSION_STATUS_STYLE[log.status] ?? 'bg-slate-500/15 text-slate-400 border-slate-500/25'
                    )}>
                      {log.status}
                    </span>
                  </td>
                </tr>
                {expanded && (
                  <tr className="border-b border-white/5 bg-black/20">
                    <td colSpan={10} className="px-5 py-4">
                      <div className="mb-3 text-xs text-slate-500">{log.detailPath || log.conversationId || '-'}</div>
                      {details.length === 0 ? (
                        <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-500">
                          {detailArchived ? '会话详情已归档，无法查看' : '暂无会话详情'}
                        </div>
                      ) : (
                        <div className="max-h-72 space-y-2 overflow-y-auto">
                          {details.map((item) => (
                            <div key={`${item.id}-${item.timestamp}`} className="rounded-lg border border-white/10 bg-white/5 p-3">
                              <div className="mb-1 flex items-center justify-between gap-3 text-[11px] text-slate-500">
                                <span className="font-mono">{item.role}</span>
                                <span>{formatTimestamp(new Date(item.timestamp))}</span>
                              </div>
                              <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-300">{item.content}</pre>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AuditLogTable({ logs }: { logs: AuditLog[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/5">
            {['时间', '操作人', '操作', '详情', 'IP', '结果'].map(h => (
              <th key={h} className="px-5 py-2.5 text-left text-xs text-slate-500 font-medium whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-5 py-10 text-center text-xs text-slate-500">暂无操作日志</td>
            </tr>
          ) : logs.map(log => (
            <tr key={log.id} className="border-b border-white/4 hover:bg-white/3 transition-colors">
              <td className="px-5 py-3 text-xs text-slate-500 font-mono whitespace-nowrap">{formatTimestamp(log.timestamp)}</td>
              <td className="px-5 py-3 text-xs text-slate-300 whitespace-nowrap">{log.userName || '-'}</td>
              <td className="px-5 py-3 text-xs text-slate-300 whitespace-nowrap">{log.action}</td>
              <td className="px-5 py-3 text-xs text-slate-400 max-w-xs truncate" title={log.detail}>{log.detail || '-'}</td>
              <td className="px-5 py-3 text-xs text-slate-500 font-mono whitespace-nowrap">{log.ip || '-'}</td>
              <td className="px-5 py-3 whitespace-nowrap">
                <span className={cn(
                  'text-[11px] px-2 py-0.5 rounded-full border',
                  AUDIT_RESULT_STYLE[log.result] ?? 'bg-slate-500/15 text-slate-400 border-slate-500/25'
                )}>
                  {log.result === 'success' ? '成功' : log.result === 'failed' ? '失败' : log.result}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
