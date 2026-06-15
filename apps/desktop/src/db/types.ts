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
  nodes: unknown[];
  createdAt: number;
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
  notifType: string;
  read: boolean;
  timestamp: number;
}

export interface ApiKeyEntry {
  id: string;
  provider: string;
  alias?: string;
  createdAt: number;
}

export interface Webhook {
  id: string;
  name: string;
  url: string;
  eventTypes: string[];
  active: boolean;
  createdAt: number;
  updatedAt: number;
}
