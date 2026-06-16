/* OwlOS v1.0 Chat 模块类型定义 */

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

/** 消息内容类型（决定渲染方式） */
export type ContentType = 'text' | 'code' | 'image' | 'card' | 'tool_call';

/** 消息渲染状态 */
export type MessageStatus = 'sending' | 'streaming' | 'done' | 'error';

/** Agent */
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

/** 工具调用信息 */
export interface ToolCallInfo {
  id: string;
  toolName: string;
  toolIcon?: string;      // emoji 图标
  status: 'running' | 'done' | 'error';
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  duration?: number;
}

/** 思维链步骤 */
export interface CotStep {
  id: string;
  title: string;
  content: string;
  toolName?: string;
  duration: number;
}

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

/** 消息 */
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

/** 团队模板 */
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
