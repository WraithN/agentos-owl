/* 安全与审计设置 */
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const ALL_AUDIT_LOGS = [
  { time: '2026-06-12 09:02', user: '当前用户', action: '执行工作流',    detail: '每日竞品监控',          ip: '127.0.0.1',   result: '成功' },
  { time: '2026-06-12 08:45', user: '当前用户', action: '上传文档',      detail: '竞品分析数据集.csv',    ip: '127.0.0.1',   result: '成功' },
  { time: '2026-06-11 18:30', user: '当前用户', action: '修改 Agent',    detail: '更新 Analyst 触发规则', ip: '127.0.0.1',   result: '成功' },
  { time: '2026-06-11 14:12', user: '当前用户', action: '创建团队模板',  detail: '技术方案评审组',        ip: '127.0.0.1',   result: '成功' },
  { time: '2026-06-10 10:00', user: '当前用户', action: '登录',          detail: 'Web 客户端',            ip: '127.0.0.1',   result: '成功' },
  { time: '2026-06-09 22:11', user: '当前用户', action: '删除文档',      detail: '旧竞品报告.pdf',        ip: '192.168.1.5', result: '成功' },
  { time: '2026-06-09 14:03', user: '当前用户', action: '修改 API Key',  detail: '重新生成主密钥',        ip: '127.0.0.1',   result: '成功' },
  { time: '2026-06-08 11:22', user: '当前用户', action: '添加成员',      detail: '邀请 dev@example.com',  ip: '127.0.0.1',   result: '成功' },
  { time: '2026-06-08 09:15', user: '当前用户', action: '修改权限',      detail: '设置 Viewer 角色',      ip: '127.0.0.1',   result: '成功' },
  { time: '2026-06-07 17:44', user: '当前用户', action: '导出数据',      detail: '知识库全量导出',        ip: '192.168.1.5', result: '成功' },
  { time: '2026-06-07 14:30', user: '当前用户', action: '执行工作流',    detail: '周报生成任务',          ip: '127.0.0.1',   result: '失败' },
  { time: '2026-06-06 10:00', user: '当前用户', action: '登录',          detail: 'Mobile 客户端',         ip: '10.0.0.1',    result: '成功' },
];

const PAGE_SIZE = 5;

export default function SecuritySettings() {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(ALL_AUDIT_LOGS.length / PAGE_SIZE);
  const pageLogs = ALL_AUDIT_LOGS.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">安全与审计</h1>
        <p className="text-sm text-slate-400 mt-1">系统操作日志与安全配置</p>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
          <span className="text-sm font-medium text-slate-200">操作日志</span>
          <button className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">导出 CSV</button>
        </div>

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
              {pageLogs.map((log, i) => (
                <tr key={i} className="border-b border-white/4 hover:bg-white/3 transition-colors">
                  <td className="px-5 py-3 text-xs text-slate-500 font-mono whitespace-nowrap">{log.time}</td>
                  <td className="px-5 py-3 text-xs text-slate-300 whitespace-nowrap">{log.user}</td>
                  <td className="px-5 py-3 text-xs text-slate-300 whitespace-nowrap">{log.action}</td>
                  <td className="px-5 py-3 text-xs text-slate-400 whitespace-nowrap max-w-xs truncate">{log.detail}</td>
                  <td className="px-5 py-3 text-xs text-slate-500 font-mono whitespace-nowrap">{log.ip}</td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <span className={cn(
                      'text-[11px] px-2 py-0.5 rounded-full border',
                      log.result === '成功'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                        : 'bg-rose-500/15 text-rose-400 border-rose-500/25'
                    )}>{log.result}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 分页栏 */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-white/5">
          <span className="text-xs text-slate-500">
            第 {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, ALL_AUDIT_LOGS.length)} 条，共 {ALL_AUDIT_LOGS.length} 条
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className={cn('p-1.5 rounded-lg transition-colors', page === 0 ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-slate-200 hover:bg-white/8')}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i} onClick={() => setPage(i)}
                className={cn('w-7 h-7 rounded-lg text-xs font-medium transition-colors',
                  i === page ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500 hover:text-slate-300 hover:bg-white/8'
                )}>
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className={cn('p-1.5 rounded-lg transition-colors', page === totalPages - 1 ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-slate-200 hover:bg-white/8')}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
