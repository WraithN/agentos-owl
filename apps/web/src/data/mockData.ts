/* OwlOS v1.0 Mock 数据 */

import type {
  Agent, Conversation, Message, KanbanTask, WorkflowTemplate, WorkflowNode,
  TeamTemplate, BillingRecord, Notification
} from '../types';

const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 60 * 60 * 1000);

// ============================================================
// Agents
// ============================================================

export const AGENTS: Agent[] = [
  {
    id: 'aria',
    name: 'Aria',
    role: 'aria',
    description: '协调员 · 负责任务拆解与团队调度',
    avatar: 'A',
    color: '#a855f7',
    bgColor: 'bg-purple-500/20',
    textColor: 'text-purple-400',
    borderColor: 'border-purple-500/40',
    status: 'working',
    model: 'GPT-4o',
    tools: ['web-search', 'task-manager', 'code-runner'],
    capabilities: ['任务协调', '自然语言理解', '多Agent调度'],
    triggerRule: '当任务涉及跨领域协作或需要多步骤规划时自动参与',
    enabled: true,
  },
  {
    id: 'coder',
    name: 'Coder',
    role: 'coder',
    description: '代码专家 · 全栈开发与代码审查',
    avatar: 'C',
    color: '#00f2c3',
    bgColor: 'bg-cyan-500/20',
    textColor: 'text-cyan-400',
    borderColor: 'border-cyan-500/40',
    status: 'working',
    model: 'Claude 3.5 Sonnet',
    tools: ['code-runner', 'github', 'terminal'],
    capabilities: ['代码开发', '代码审查', '架构设计', '调试'],
    triggerRule: '当任务涉及编写、调试或审查代码时自动参与',
    enabled: true,
  },
  {
    id: 'muse',
    name: 'Muse',
    role: 'muse',
    description: '创意设计师 · UI/UX 与品牌内容',
    avatar: 'M',
    color: '#38bdf8',
    bgColor: 'bg-blue-500/20',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/40',
    status: 'idle',
    model: 'GPT-4o',
    tools: ['figma-plugin', 'image-gen', 'web-search'],
    capabilities: ['UI/UX 设计', '品牌设计', '文案创作', '视觉分析'],
    triggerRule: '当任务涉及设计、视觉创意或品牌内容时自动参与',
    enabled: true,
  },
  {
    id: 'analyst',
    name: 'Analyst',
    role: 'analyst',
    description: '数据分析师 · 数据洞察与商业决策',
    avatar: 'An',
    color: '#f59e0b',
    bgColor: 'bg-amber-500/20',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/40',
    status: 'working',
    model: 'GPT-4o',
    tools: ['python-runner', 'sql-query', 'chart-gen'],
    capabilities: ['数据分析', '可视化', '统计建模', '商业智能'],
    triggerRule: '当任务涉及数据处理、统计分析或商业报告时自动参与',
    enabled: true,
  },
  {
    id: 'writer',
    name: 'Writer',
    role: 'writer',
    description: '资深文案 · 各类文档撰写与内容润色',
    avatar: 'W',
    color: '#f43f5e',
    bgColor: 'bg-rose-500/20',
    textColor: 'text-rose-400',
    borderColor: 'border-rose-500/40',
    status: 'idle',
    model: 'Claude 3.5 Sonnet',
    tools: ['web-search', 'file-reader'],
    capabilities: ['文案撰写', '内容润色', '翻译', '总结'],
    triggerRule: '当任务涉及写作、翻译或内容创作时自动参与',
    enabled: true,
  },
  {
    id: 'pm',
    name: 'PM',
    role: 'pm',
    description: '产品经理 · 需求分析与项目规划',
    avatar: 'P',
    color: '#8b5cf6',
    bgColor: 'bg-violet-500/20',
    textColor: 'text-violet-400',
    borderColor: 'border-violet-500/40',
    status: 'working',
    model: 'GPT-4o',
    tools: ['web-search', 'task-manager'],
    capabilities: ['需求分析', 'PRD撰写', '项目规划', '竞品调研'],
    triggerRule: '当任务涉及产品设计、需求分析或项目规划时自动参与',
    enabled: true,
  },
  {
    id: 'ops',
    name: 'Ops',
    role: 'ops',
    description: '运维专家 · CI/CD 与基础设施管理',
    avatar: 'O',
    color: '#10b981',
    bgColor: 'bg-emerald-500/20',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/40',
    status: 'idle',
    model: 'GPT-4o',
    tools: ['terminal', 'github', 'code-runner'],
    capabilities: ['CI/CD配置', 'Docker', 'K8s', '监控告警'],
    triggerRule: '当任务涉及部署、运维或基础设施时自动参与',
    enabled: false,
  },
  {
    id: 'designer',
    name: 'Designer',
    role: 'designer',
    description: '资深设计师 · UI/UX 与视觉规范',
    avatar: 'D',
    color: '#f59e0b',
    bgColor: 'bg-amber-500/20',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/40',
    status: 'idle',
    model: 'Claude 3.5 Sonnet',
    tools: ['figma-plugin', 'image-gen'],
    capabilities: ['UI设计', 'UX优化', '设计规范', '原型评审'],
    triggerRule: '当任务涉及界面设计、视觉规范或用户体验时自动参与',
    enabled: true,
  },
];

export function getAgent(id: string): Agent | undefined {
  return AGENTS.find(a => a.id === id);
}

// ============================================================
// 会话列表
// ============================================================

export const CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    title: '用户增长方案设计',
    mode: 'squad',
    lastMessage: 'Analyst: 已完成 DAU 数据分析，关键漏斗在注册环节流失 34%...',
    lastTime: new Date(Date.now() - 1000 * 60 * 8),
    unread: 3,
    agentIds: ['aria', 'coder', 'muse', 'analyst'],
    pinned: true,
    createdAt: daysAgo(1),
    updatedAt: new Date(),
  },
  {
    id: 'conv-2',
    title: '每日竞品监控',
    mode: 'auto',
    lastMessage: '⚡ 正在执行步骤 3/4：生成对比报告...',
    lastTime: new Date(Date.now() - 1000 * 60 * 23),
    unread: 1,
    agentIds: ['analyst'],
    createdAt: daysAgo(1),
    updatedAt: new Date(),
  },
  {
    id: 'conv-3',
    title: '帮我写一个 React 拖拽组件',
    mode: 'single',
    lastMessage: 'Aria: 这是一个基于 @dnd-kit 的完整拖拽实现，包含动画和无障碍支持...',
    lastTime: new Date(Date.now() - 1000 * 60 * 60 * 2),
    unread: 0,
    agentIds: ['aria'],
    createdAt: daysAgo(1),
    updatedAt: new Date(),
  },
  {
    id: 'conv-4',
    title: '分析 Q2 销售数据',
    mode: 'single',
    lastMessage: 'Q2 整体收入同比增长 18.3%，北区表现最佳...',
    lastTime: new Date(Date.now() - 1000 * 60 * 60 * 26),
    unread: 0,
    agentIds: ['analyst'],
    createdAt: daysAgo(1),
    updatedAt: new Date(),
  },
];

// ============================================================
// 消息（群聊会话：conv-1 的消息流）
// ============================================================

export const MESSAGES_SQUAD: Message[] = [
  {
    id: 'msg-1',
    type: 'user',
    content: '帮我设计用户增长方案，需要包含数据分析、工程实现和设计规范，目标是 Q3 DAU 提升 30%。',
    timestamp: new Date(Date.now() - 1000 * 60 * 40),
  },
  {
    id: 'msg-sys-1',
    type: 'system',
    content: 'Aria 已召集 Analyst、Coder、Muse 组成「用户增长攻坚队」。建议分三个方向并行推进：数据漏斗分析 / 工程优化 / 设计改版。',
    timestamp: new Date(Date.now() - 1000 * 60 * 39),
  },
  {
    id: 'msg-2',
    type: 'agent',
    agentId: 'aria',
    content: '好的，我来统一协调。@Analyst 请先拉取最近 30 天的用户漏斗数据，重点关注注册→首日留存→7日留存各阶段转化率。@Coder 准备好技术方案文档框架。@Muse 开始竞品 UI 调研。',
    mentions: ['analyst', 'coder', 'muse'],
    timestamp: new Date(Date.now() - 1000 * 60 * 38),
  },
  {
    id: 'msg-3',
    type: 'agent',
    agentId: 'analyst',
    content: '已完成漏斗数据分析。关键发现：\n\n注册环节流失率高达 **34%**，主要卡点在手机验证步骤（平均耗时 87 秒）。7 日留存率 22%，低于行业均值 31%。Push 通知开启率仅 41%。',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    toolCall: {
      id: 'tc-1',
      toolName: 'SQL 数据查询',
      status: 'done',
      input: { query: 'SELECT funnel_step, drop_rate FROM user_funnel WHERE date > NOW()-30d' },
      output: { rows: 4, data: '注册→验证: 34% 流失, 验证→首页: 8% 流失' },
      duration: 2340,
    },
  },
  {
    id: 'msg-4',
    type: 'agent',
    agentId: 'coder',
    content: '根据 Analyst 的数据，我建议从技术侧做以下优化：',
    codeBlock: {
      language: 'typescript',
      code: `// 优化方案：手机验证简化为一步滑动验证
// 预计可将验证耗时从 87s 降至 < 15s
interface OptimizedAuth {
  method: 'slide' | 'sms' | 'oauth';
  timeout: number; // 毫秒
  fallback: 'email';
}

const config: OptimizedAuth = {
  method: 'slide',
  timeout: 15000,
  fallback: 'email',
};`,
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 20),
  },
  {
    id: 'msg-5',
    type: 'agent',
    agentId: 'muse',
    content: '竞品 UI 调研完成。主流应用均采用「渐进式注册」策略：先允许访客体验核心功能，再在关键节点触发注册引导。建议我们也采用此方案，配合重新设计的 Onboarding 流程，预计可将注册转化率提升 15-20%。',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
  },
  {
    id: 'msg-approval',
    type: 'approval-request',
    agentId: 'aria',
    content: '已汇总三位专家的方案建议，请确认是否按以下优先级推进：\n① 简化手机验证（P0，本周）\n② 渐进式注册改版（P1，两周）\n③ Push 通知优化（P2，下月）',
    timestamp: new Date(Date.now() - 1000 * 60 * 10),
  },
  {
    id: 'msg-6',
    type: 'user',
    content: '方案很好，通过！请 Aria 生成最终的项目计划文档。',
    timestamp: new Date(Date.now() - 1000 * 60 * 8),
  },
];

// ============================================================
// 看板任务
// ============================================================

export const KANBAN_TASKS: KanbanTask[] = [
  { id: 'task-1', title: '用户漏斗数据分析报告', assigneeId: 'analyst', status: 'done', priority: 'P0', dueDate: '2026-06-10', createdAt: daysAgo(14), updatedAt: daysAgo(5) },
  { id: 'task-2', title: '竞品 UI 调研报告', assigneeId: 'muse', status: 'done', priority: 'P1', dueDate: '2026-06-11', createdAt: daysAgo(14), updatedAt: daysAgo(4) },
  { id: 'task-3', title: '手机验证优化方案', assigneeId: 'coder', status: 'in-progress', priority: 'P0', dueDate: '2026-06-14', createdAt: daysAgo(10), updatedAt: daysAgo(1) },
  { id: 'task-4', title: '渐进式注册原型设计', assigneeId: 'muse', status: 'in-progress', priority: 'P1', dueDate: '2026-06-18', createdAt: daysAgo(8), updatedAt: daysAgo(2) },
  { id: 'task-5', title: '项目总结文档', assigneeId: 'aria', status: 'review', priority: 'P1', dueDate: '2026-06-20', createdAt: daysAgo(7), updatedAt: daysAgo(1) },
  { id: 'task-6', title: 'Push 通知策略优化', assigneeId: 'analyst', status: 'todo', priority: 'P2', dueDate: '2026-07-05', createdAt: daysAgo(3), updatedAt: daysAgo(3) },
];

// ============================================================
// 自动化工作流
// ============================================================

export const WORKFLOW_NODES: WorkflowNode[] = [
  {
    id: 'node-1',
    name: '定时触发',
    type: 'trigger',
    status: 'done',
    duration: 12,
    output: '触发时间: 2026-06-12 09:00:00',
  },
  {
    id: 'node-2',
    name: '抓取竞品页面',
    type: 'tool',
    status: 'done',
    duration: 8420,
    input: '目标站点: ["competitor-a.com", "competitor-b.com", "competitor-c.com"]',
    output: '成功抓取 3 个站点，共 47 页，总计 128,304 tokens',
  },
  {
    id: 'node-3',
    name: 'AI 对比分析',
    type: 'llm',
    status: 'running',
    input: '分析维度：定价/功能/UX/营销文案',
  },
  {
    id: 'node-4',
    name: '生成并推送报告',
    type: 'end',
    status: 'pending',
  },
];

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'wf-1',
    name: '每日竞品监控',
    description: '每天 9:00 自动抓取竞品动态，AI 分析后推送摘要报告',
    nodes: WORKFLOW_NODES,
    createdAt: new Date('2026-05-01'),
    lastRun: new Date(Date.now() - 1000 * 60 * 23),
  },
];

// ============================================================
// 团队模板
// ============================================================

export const TEAM_TEMPLATES: TeamTemplate[] = [
  {
    id: 'team-1',
    name: '用户增长攻坚队',
    description: '处理用户增长相关的数据分析、工程优化与设计改版',
    memberIds: ['aria', 'analyst', 'coder', 'muse'],
    coordinatorId: 'aria',
    trigger: '当用户提到"增长"、"留存"、"DAU"、"转化率"等关键词时自动召集',
    mode: 'parallel',
    enabled: true,
    createdAt: daysAgo(60),
    updatedAt: daysAgo(10),
  },
  {
    id: 'team-2',
    name: '技术方案评审组',
    description: '对复杂技术方案进行多维度评审，输出结构化评审报告',
    memberIds: ['aria', 'coder', 'analyst'],
    coordinatorId: 'coder',
    trigger: '当用户提到"技术方案"、"架构设计"、"代码评审"时自动召集',
    mode: 'sequential',
    enabled: false,
    createdAt: daysAgo(60),
    updatedAt: daysAgo(10),
  },
  {
    id: 'team-3',
    name: '内容创作工作室',
    description: '负责文案撰写、品牌内容与设计素材产出',
    memberIds: ['muse', 'writer', 'designer'],
    coordinatorId: 'muse',
    trigger: '当用户提到"文案"、"品牌"、"海报"、"内容营销"时自动召集',
    mode: 'parallel',
    enabled: true,
    createdAt: daysAgo(60),
    updatedAt: daysAgo(10),
  },
  {
    id: 'team-4',
    name: '产品开发全栈组',
    description: '端到端产品交付：需求 → 设计 → 开发 → 部署',
    memberIds: ['pm', 'designer', 'coder', 'ops'],
    coordinatorId: 'pm',
    trigger: '当用户提到"产品"、"上线"、"迭代"、"全栈"时自动召集',
    mode: 'pipeline',
    enabled: true,
    createdAt: daysAgo(60),
    updatedAt: daysAgo(10),
  },
  {
    id: 'team-5',
    name: '运维保障小分队',
    description: '监控、告警、故障排查与自动化运维',
    memberIds: ['ops', 'coder', 'analyst'],
    coordinatorId: 'ops',
    trigger: '当用户提到"故障"、"告警"、"监控"、"部署"时自动召集',
    mode: 'supervisor',
    enabled: false,
    createdAt: daysAgo(60),
    updatedAt: daysAgo(10),
  },
  {
    id: 'team-6',
    name: '数据分析洞察组',
    description: '多维度数据分析、报告撰写与商业洞察',
    memberIds: ['analyst', 'writer', 'pm'],
    coordinatorId: 'analyst',
    trigger: '当用户提到"报表"、"分析"、"洞察"、"KPI"时自动召集',
    mode: 'brainstorming',
    enabled: true,
    createdAt: daysAgo(60),
    updatedAt: daysAgo(10),
  },
  {
    id: 'team-7',
    name: '创意头脑风暴群',
    description: '快速创意发散，收集想法并筛选最优方案',
    memberIds: ['muse', 'writer', 'pm', 'designer'],
    coordinatorId: '',
    trigger: '当用户提到"创意"、"头脑风暴"、"方案"、"灵感"时自动召集',
    mode: 'swarm',
    enabled: false,
    createdAt: daysAgo(60),
    updatedAt: daysAgo(10),
  },
  {
    id: 'team-8',
    name: '代码质量监控站',
    description: '代码审查、性能分析与重构建议',
    memberIds: ['coder', 'ops', 'aria'],
    coordinatorId: 'coder',
    trigger: '当用户提到"性能"、"重构"、"Bug"、"质量"时自动召集',
    mode: 'pipeline',
    enabled: true,
    createdAt: daysAgo(60),
    updatedAt: daysAgo(10),
  },
];

// ============================================================
// 计费数据
// ============================================================

export const BILLING_DATA: BillingRecord[] = [
  { date: '06-06', tokens: 18240, cost: 1.28, model: 'GPT-4o', createdAt: daysAgo(9) },
  { date: '06-07', tokens: 24560, cost: 1.92, model: 'GPT-4o', createdAt: daysAgo(8) },
  { date: '06-08', tokens: 12380, cost: 0.87, model: 'Claude 3.5', createdAt: daysAgo(7) },
  { date: '06-09', tokens: 31200, cost: 2.45, model: 'GPT-4o', createdAt: daysAgo(6) },
  { date: '06-10', tokens: 28900, cost: 2.13, model: 'GPT-4o', createdAt: daysAgo(5) },
  { date: '06-11', tokens: 19650, cost: 1.47, model: 'Claude 3.5', createdAt: daysAgo(4) },
  { date: '06-12', tokens: 16800, cost: 1.40, model: 'GPT-4o', createdAt: daysAgo(3) },
];

export const MONTHLY_COST = 13.52;

/* ── 共享知识库列表（AgentSettings / TeamSettings 下拉用） ─────────── */
export const AVAILABLE_KBS: { id: string; name: string; vectorDbUrl: string }[] = [
  { id: 'kb-1', name: '默认知识库',  vectorDbUrl: 'http://localhost:6333' },
  { id: 'kb-2', name: '产品文档库',  vectorDbUrl: 'http://localhost:6333' },
  { id: 'kb-3', name: '外部知识库',  vectorDbUrl: 'https://qdrant.example.com:6333' },
];

// ============================================================
// 通知
// ============================================================

export const NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    title: '任务完成',
    content: '「用户增长方案」项目看板任务「竞品 UI 调研报告」已完成',
    type: 'success',
    read: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
  },
  {
    id: 'notif-2',
    title: '需要审批',
    content: 'Aria 已提交用户增长方案优先级确认，请审阅并通过',
    type: 'warning',
    read: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 10),
  },
  {
    id: 'notif-3',
    title: '工作流执行中',
    content: '「每日竞品监控」工作流正在执行步骤 3/4',
    type: 'info',
    read: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 23),
  },
  {
    id: 'notif-4',
    title: '文档上传失败',
    content: '「2025 年度财务报告.pdf」解析失败，请检查文件格式后重新上传',
    type: 'error',
    read: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
];
