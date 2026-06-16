/* ── 模拟运行数据 ─────────────────────────────────────────────── */
export interface AgentMetrics {
  agentId: string;
  totalTasks: number;
  successTasks: number;
  failedTasks: number;
  avgDurationMs: number;
  totalTokens: number;
  tokensPerTask: number;
  trend: 'up' | 'down' | 'flat';
  recentErrors: string[];
  hourlyTasks: number[];
}

export const METRICS: AgentMetrics[] = [
  {
    agentId: 'aria',
    totalTasks: 312,
    successTasks: 298,
    failedTasks: 14,
    avgDurationMs: 2340,
    totalTokens: 1_842_000,
    tokensPerTask: 5904,
    trend: 'up',
    recentErrors: ['超时: 任务 #312', '上下文溢出: 任务 #305'],
    hourlyTasks: [12, 18, 22, 15, 8, 25, 30, 28, 20, 16, 24, 32],
  },
  {
    agentId: 'coder',
    totalTasks: 187,
    successTasks: 179,
    failedTasks: 8,
    avgDurationMs: 4820,
    totalTokens: 2_610_000,
    tokensPerTask: 13_957,
    trend: 'up',
    recentErrors: ['编译错误: 任务 #187'],
    hourlyTasks: [8, 10, 14, 12, 6, 18, 22, 20, 16, 10, 14, 19],
  },
  {
    agentId: 'analyst',
    totalTasks: 254,
    successTasks: 241,
    failedTasks: 13,
    avgDurationMs: 3150,
    totalTokens: 980_000,
    tokensPerTask: 3858,
    trend: 'flat',
    recentErrors: ['数据源不可用: 任务 #250', 'SQL 超时: 任务 #244'],
    hourlyTasks: [6, 8, 10, 14, 18, 12, 20, 18, 14, 12, 16, 21],
  },
  {
    agentId: 'muse',
    totalTasks: 98,
    successTasks: 96,
    failedTasks: 2,
    avgDurationMs: 5600,
    totalTokens: 540_000,
    tokensPerTask: 5510,
    trend: 'down',
    recentErrors: [],
    hourlyTasks: [2, 4, 6, 8, 10, 8, 12, 14, 10, 6, 8, 10],
  },
  {
    agentId: 'writer',
    totalTasks: 143,
    successTasks: 139,
    failedTasks: 4,
    avgDurationMs: 2080,
    totalTokens: 720_000,
    tokensPerTask: 5035,
    trend: 'up',
    recentErrors: ['内容过滤: 任务 #143'],
    hourlyTasks: [4, 6, 8, 10, 8, 14, 16, 12, 10, 8, 12, 14],
  },
];
