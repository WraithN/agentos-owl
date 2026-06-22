// Electron 主进程数据库模型（从 Rust Tauri 后端移植）

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  displayName?: string;
  avatar?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  avatar: string;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  status: string;
  model: string;
  tools: string[];
  capabilities: string[];
  triggerRule: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Conversation {
  id: string;
  title: string;
  mode: string;
  teammateMode?: string;
  teamTemplateId?: string;
  lastMessage: string;
  lastTime: number;
  unread: number;
  agentIds: string[];
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  id: string;
  conversationId: string;
  msgType: string;
  contentType: string;
  status: string;
  content: string;
  agentId?: string;
  timestamp: number;
  toolCall?: unknown;
  cotSteps?: unknown[];
  codeBlock?: unknown;
  imageUrl?: string;
  imageCaption?: string;
  cardData?: unknown;
  mentions?: string[];
  attachments?: string[];
  meta?: unknown;
}

export interface KanbanTask {
  id: string;
  title: string;
  assigneeId: string;
  status: string;
  priority: string;
  dueDate?: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  /** 画布节点（含坐标 + 配置），结构由 packages/workflow 定义 */
  nodes: unknown[];
  /** 画布连线 */
  edges: unknown[];
  /** 画布视口：{ x, y, scale }，记录用户上次离开时的视角 */
  viewport: { x: number; y: number; scale: number };
  createdAt: number;
  updatedAt: number;
  lastRun?: number;
}

export interface KnowledgeDoc {
  id: string;
  name: string;
  size: string;
  status: string;
  errorMsg?: string;
  chunks: number;
  createdAt: number;
  docType: string;
  filePath?: string;
}

export interface DocChunk {
  id: string;
  docId: string;
  idx: number;
  content: string;
  tokens: number;
}

export interface MarketTool {
  id: string;
  name: string;
  description: string;
  category: string;
  toolType: string;
  icon: string;
  iconBg: string;
  version: string;
  developer: string;
  rating: number;
  installs: number;
  tags: string[];
  installed: boolean;
  needsApiKey: boolean;
  official: boolean;
  createdAt: number;
  updatedAt: number;
}

/** 技能市场条目（无 version / installed 等市场化字段） */
export interface Skill {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  iconBg: string;
  stars: number;
  installs: number;
  official: boolean;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

/** 提示词市场条目，content 是核心 prompt 文本 */
export interface Prompt {
  id: string;
  name: string;
  category: string;
  description: string;
  content: string;
  official: boolean;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

/** 扩展标签，scope 区分技能 / 提示词 / 工具 */
export type ToolCategoryScope = "skill" | "prompt" | "tool";

export interface ToolCategory {
  id: string;
  scope: ToolCategoryScope;
  name: string;
  sortOrder: number;
  createdAt: number;
}

export interface TeamTemplate {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
  coordinatorId: string;
  triggerRule: string;
  mode: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface BillingRecord {
  id: string;
  recordDate: string;
  tokens: number;
  cost: number;
  model: string;
  createdAt: number;
}

export interface Notification {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  timestamp: Date | number;
}

export interface ApiKeyEntry {
  id: string;
  provider: string;
  alias?: string;
  encryptedKey?: string;
  createdAt: number;
}

export interface Webhook {
  id: string;
  name: string;
  url: string;
  secretRef?: string;
  eventTypes: string[];
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

/** 操作日志：用户级动作（登录、改设置、上传文件等） */
export interface AuditLog {
  id: string;
  timestamp: number;
  userName: string;
  action: string;
  detail: string;
  ip: string;
  /** success | failed */
  result: string;
}

/** 会话日志：对话/Agent 运行时事件（创建会话、调用模型、发送消息等） */
export interface SessionLog {
  id: string;
  timestamp: number;
  conversationId?: string;
  conversationTitle: string;
  detailPath?: string;
  /** single / squad / auto */
  mode: string;
  agentName: string;
  model: string;
  /** 事件类型，例如 conversation.create / message.send / agent.invoke */
  event: string;
  summary: string;
  tokens: number;
  durationMs: number;
  /** success | failed | running */
  status: string;
}
