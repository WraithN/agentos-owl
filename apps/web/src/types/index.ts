/* OwlOS v1.0 类型定义 */

// ============================================================
// 基础类型
// ============================================================

/** 应用模式：统一对话 / 自动化 */
export type AppMode = 'chat' | 'auto';

/** Teammate 协作模式：由前端指定并传入 Owlery */
export type TeammateMode = 'pipeline' | 'brainstorm' | 'supervisor' | 'hierarchy';

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
    contentParts?: unknown;
    agentOutputs?: unknown;
    [key: string]: unknown;
  };
}

// ============================================================
// 会话相关
// ============================================================

export interface Conversation {
  id: string;
  title: string;
  mode: AppMode;
  /** @deprecated 由 teamTemplateId 替代，保留仅用于兼容旧数据 */
  teammateMode?: TeammateMode;
  /** 用户手动选择的团队模板 ID */
  teamTemplateId?: string;
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

/**
 * 运行时节点视图（用于"自动化执行日志"等场景），
 * 与画布持久化的 CanvasNode 不同：含 status / duration / 输入输出快照。
 */
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

/**
 * 工作流模板（可持久化）：与 packages/workflow 的画布数据结构一致，
 * 由 IPC 在 SQLite 中读写。
 */
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  /** 画布节点（含坐标 + 配置） */
  nodes: WorkflowCanvasNode[];
  /** 画布连线 */
  edges: WorkflowCanvasEdge[];
  /** 画布视口：用户上次离开时的平移与缩放 */
  viewport: WorkflowViewport;
  createdAt: Date;
  updatedAt: Date;
  lastRun?: Date;
}

export interface WorkflowCanvasNode {
  id: string;
  type: 'input' | 'agent' | 'tool' | 'condition' | 'output';
  name: string;
  x: number;
  y: number;
  config: Record<string, string>;
}

export interface WorkflowCanvasEdge {
  id: string;
  source: string;
  target: string;
}

export interface WorkflowViewport {
  x: number;
  y: number;
  scale: number;
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
  toolType: 'mcp' | 'cli';  // 工具类型
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
