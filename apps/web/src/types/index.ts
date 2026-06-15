/* OwlOS v1.0 类型定义 */

// ============================================================
// 基础类型
// ============================================================

/** 应用模式：单聊 / 群聊 / 自动化 */
export type AppMode = 'single' | 'squad' | 'auto';

/** Agent 角色 */
export type AgentRole = 'aria' | 'coder' | 'muse' | 'analyst' | 'writer' | 'pm' | 'ops' | 'designer' | 'custom';

/** Agent 状态 */
export type AgentStatus = 'idle' | 'working' | 'blocked' | 'offline';

/** 消息类型 */
export type MessageType =
  | 'user'
  | 'agent'
  | 'system'
  | 'tool-call'
  | 'cot'
  | 'task-assign'
  | 'approval-request';

/** 任务优先级 */
export type Priority = 'P0' | 'P1' | 'P2';

/** 任务状态 */
export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done';

/** 工作流节点状态 */
export type NodeStatus = 'pending' | 'running' | 'done' | 'error';

/** 文档状态 */
export type DocStatus = 'ready' | 'processing' | 'error';

// ============================================================
// Agent 相关
// ============================================================

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  description: string;
  avatar: string;
  color: string;        // 角色颜色 hex
  bgColor: string;      // 背景色（Tailwind class）
  textColor: string;    // 文字色（Tailwind class）
  borderColor: string;  // 边框色（Tailwind class）
  status: AgentStatus;
  model: string;
  tools: string[];
  capabilities: string[];
  triggerRule: string;
  enabled: boolean;
}

// ============================================================
// 消息相关
// ============================================================

export interface ToolCallInfo {
  id: string;
  toolName: string;
  toolIcon?: string;      // emoji 图标
  status: 'running' | 'done' | 'error';
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  duration?: number;
}

export interface CotStep {
  id: string;
  title: string;
  content: string;
  toolName?: string;
  duration: number;
}

/** 消息内容类型（决定渲染方式） */
export type ContentType = 'text' | 'code' | 'image' | 'card' | 'tool_call';

/** 卡片数据结构 */
export interface CardData {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;   // 'cyan' | 'emerald' | 'violet' | 'amber'
  rows?: Array<{ label: string; value: string; highlight?: boolean }>;
  actions?: Array<{ label: string; variant?: 'primary' | 'ghost' }>;
  footer?: string;
}

/** 代码块数据 */
export interface CodeBlockData {
  language: string;
  filename?: string;
  code: string;
}

/** 消息渲染状态 */
export type MessageStatus = 'sending' | 'streaming' | 'done' | 'error';

export interface Message {
  id: string;
  type: MessageType;
  /** 内容展示类型（默认 text） */
  contentType?: ContentType;
  /** 消息渲染状态 */
  status?: MessageStatus;
  content: string;
  agentId?: string;
  timestamp: Date;
  toolCall?: ToolCallInfo;
  cotSteps?: CotStep[];
  codeBlock?: CodeBlockData;
  imageUrl?: string;           // contentType='image' 时使用
  imageCaption?: string;
  cardData?: CardData;         // contentType='card' 时使用
  mentions?: string[];
  attachments?: string[];
  meta?: {
    model?: string;
    tokens?: number;
    summary?: string;          // 一句话结论，置顶高亮
    durationMs?: number;
  };
}

// ============================================================
// 会话相关
// ============================================================

export interface Conversation {
  id: string;
  title: string;
  mode: AppMode;
  lastMessage: string;
  lastTime: Date;
  unread: number;
  agentIds: string[];   // 参与的 Agent
  pinned?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// 任务看板
// ============================================================

export interface KanbanTask {
  id: string;
  title: string;
  assigneeId: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// 工作流
// ============================================================

export interface WorkflowNode {
  id: string;
  name: string;
  type: 'trigger' | 'llm' | 'tool' | 'condition' | 'end';
  status: NodeStatus;
  duration?: number;
  input?: string;
  output?: string;
  x?: number;
  y?: number;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  createdAt: Date;
  lastRun?: Date;
}

// ============================================================
// 知识库
// ============================================================

export interface KnowledgeDoc {
  id: string;
  name: string;
  size: string;
  status: DocStatus;
  errorMsg?: string;
  chunks: number;
  createdAt: Date;
  type: 'pdf' | 'docx' | 'txt' | 'md' | 'csv';
}

export interface DocChunk {
  id: string;
  index: number;
  content: string;
  tokens: number;
  similarity?: number;
}

// ============================================================
// 工具市场
// ============================================================

export interface MarketTool {
  id: string;
  name: string;
  description: string;
  category: string;
  toolType: 'mcp' | 'skill' | 'cli';  // 工具类型
  icon: string;         // lucide icon name
  iconBg: string;       // 背景色 Tailwind class
  version: string;
  developer: string;
  rating: number;
  installs: number;
  tags: string[];
  installed: boolean;
  needsApiKey: boolean;
  official: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// 设置模块
// ============================================================

export interface TeamTemplate {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
  coordinatorId: string;
  trigger: string;
  mode: 'parallel' | 'sequential' | 'pipeline' | 'supervisor' | 'brainstorming' | 'swarm';
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillingRecord {
  date: string;
  tokens: number;
  cost: number;
  model: string;
  createdAt: Date;
}

// ============================================================
// 通知
// ============================================================

export interface Notification {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  timestamp: Date;
}
