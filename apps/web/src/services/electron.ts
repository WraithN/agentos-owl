/* OwlOS v1.0 Electron IPC 后端服务封装 */
import type { AgentDriverChunk, AgentWorkSnapshot, SessionSummary, TeammateStatus } from '@owl-os/core';
import type {
  Agent,
  Conversation,
  Message,
  KanbanTask,
  WorkflowTemplate,
  KnowledgeDoc,
  DocChunk,
  MarketTool,
  TeamTemplate,
  BillingRecord,
  Notification,
  TeammateMode,
} from '@/types';

// ===== IPC 调用入口 =====

interface ElectronApi {
  invoke: <T>(channel: string, ...args: unknown[]) => Promise<T>;
  on: (channel: string, callback: (...args: unknown[]) => void) => () => void;
}

declare global {
  interface Window {
    electron: ElectronApi;
  }
}

const invoke = <T>(channel: string, ...args: unknown[]): Promise<T> =>
  window.electron.invoke(channel, ...args);

const subscribe = (channel: string, callback: (...args: unknown[]) => void) =>
  window.electron.on(channel, callback);

// ===== 日期/时间戳转换 =====

const toNum = (d: Date | number | undefined | null): number | undefined =>
  d instanceof Date ? d.getTime() : d ?? undefined;

const toDate = (n: number | Date | undefined | null): Date | undefined =>
  n == null ? undefined : n instanceof Date ? n : new Date(n);

// ===== Auth =====

export interface AuthInfo {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
}

export interface SignInRequest {
  username: string;
  password: string;
}

export interface SignUpRequest {
  username: string;
  password: string;
  displayName?: string;
}

export const signIn = (req: SignInRequest) => invoke<AuthInfo>('sign_in', req.username, req.password);
export const signUp = (req: SignUpRequest) => invoke<AuthInfo>('sign_up', req.username, req.password);
export const getProfile = (userId: string) => invoke<AuthInfo | null>('get_profile', userId);

// ===== Settings =====

export type Settings = Record<string, unknown>;

export const getSettings = () => invoke<Settings>('get_settings');
export const saveSettings = (settings: Settings) => invoke<Settings>('save_settings', settings);

// ===== Agents =====

export const listAgents = () => invoke<Agent[]>('list_agents');
export const getAgent = (id: string) => invoke<Agent | undefined>('get_agent', id);
export const saveAgent = (agent: Agent) => invoke<Agent>('save_agent', agent);
export const deleteAgent = (id: string) => invoke<void>('delete_agent', id);

// ===== Conversations =====

function normalizeMode(mode: string): Conversation['mode'] {
  // 旧数据中的 single/squad 统一映射为新的统一对话模式
  return mode === 'auto' ? 'auto' : 'chat';
}

function convFromBackend(c: Conversation): Conversation {
  return {
    ...c,
    mode: normalizeMode(c.mode),
    lastTime: toDate(c.lastTime) ?? new Date(),
    createdAt: toDate(c.createdAt) ?? new Date(),
    updatedAt: toDate(c.updatedAt) ?? new Date(),
  };
}

export const listConversations = () =>
  invoke<Conversation[]>('list_conversations').then(list => list.map(convFromBackend));

export const getConversation = (id: string) =>
  invoke<Conversation | undefined>('get_conversation', id).then(c => (c ? convFromBackend(c) : undefined));

export const saveConversation = (conv: Conversation) =>
  invoke<Conversation>('save_conversation', {
    ...conv,
    lastTime: toNum(conv.lastTime),
    createdAt: toNum(conv.createdAt),
    updatedAt: toNum(conv.updatedAt),
  }).then(convFromBackend);

export const deleteConversation = (id: string) => invoke<void>('delete_conversation', id);

// ===== Messages =====

function msgFromBackend(m: Message & { msgType?: string }): Message {
  return {
    ...m,
    type: (m.type ?? m.msgType ?? 'user') as Message['type'],
    timestamp: toDate(m.timestamp) ?? new Date(),
  };
}

export const listMessages = (conversationId: string) =>
  invoke<Message[]>('list_messages', conversationId).then(list => list.map(msgFromBackend));

export const saveMessage = (msg: Message & { conversationId: string }) =>
  invoke<Message>('save_message', {
    ...msg,
    msgType: msg.type,
    contentType: msg.contentType ?? 'text',
    status: msg.status ?? 'done',
    timestamp: toNum(msg.timestamp),
  }).then(msgFromBackend);

export const deleteMessage = (id: string) => invoke<void>('delete_message', id);

// ===== Tasks =====

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'P0' | 'P1' | 'P2';
  assigneeId?: string;
  dueDate?: string;
  createdAt: Date;
  updatedAt: Date;
}

function taskFromBackend(t: Task): Task {
  return {
    ...t,
    createdAt: toDate(t.createdAt) ?? new Date(),
    updatedAt: toDate(t.updatedAt) ?? new Date(),
  };
}

export const listTasks = () => invoke<Task[]>('list_tasks').then(list => list.map(taskFromBackend));
export const saveTask = (task: Task) =>
  invoke<Task>('save_task', {
    ...task,
    createdAt: toNum(task.createdAt),
    updatedAt: toNum(task.updatedAt),
  }).then(taskFromBackend);
export const deleteTask = (id: string) => invoke<void>('delete_task', id);

// ===== Workflows =====

/**
 * 主进程返回的工作流模板：日期字段是数字时间戳，
 * 这里在 service 层统一转回 Date，使前端组件无需关心序列化细节。
 */
interface WorkflowTemplateRaw extends Omit<WorkflowTemplate, 'createdAt' | 'updatedAt' | 'lastRun'> {
  createdAt: number;
  updatedAt: number;
  lastRun?: number;
}

const workflowFromBackend = (raw: WorkflowTemplateRaw): WorkflowTemplate => ({
  ...raw,
  createdAt: new Date(raw.createdAt),
  updatedAt: new Date(raw.updatedAt),
  lastRun: raw.lastRun ? new Date(raw.lastRun) : undefined,
});

const workflowToBackend = (wf: WorkflowTemplate): WorkflowTemplateRaw => ({
  ...wf,
  createdAt: wf.createdAt.getTime(),
  updatedAt: wf.updatedAt.getTime(),
  lastRun: wf.lastRun?.getTime(),
});

export const listWorkflowTemplates = async (): Promise<WorkflowTemplate[]> => {
  const list = await invoke<WorkflowTemplateRaw[]>('list_workflow_templates');
  return list.map(workflowFromBackend);
};

export const saveWorkflowTemplate = async (
  template: WorkflowTemplate
): Promise<WorkflowTemplate> => {
  const saved = await invoke<WorkflowTemplateRaw>(
    'save_workflow_template',
    workflowToBackend(template)
  );
  return workflowFromBackend(saved);
};

export const deleteWorkflowTemplate = (id: string) =>
  invoke<void>('delete_workflow_template', id);

// ===== Knowledge =====

export const saveDoc = (doc: KnowledgeDoc) =>
  invoke<KnowledgeDoc>('save_doc', {
    ...doc,
    createdAt: toNum(doc.createdAt),
  });

export const saveChunk = (chunk: DocChunk) => invoke<DocChunk>('save_chunk', chunk);
export const saveChunks = (chunks: DocChunk[]) => invoke<DocChunk[]>('save_chunks', chunks);

// ===== Market Tools =====

interface MarketToolRaw extends Omit<MarketTool, 'createdAt' | 'updatedAt'> {
  createdAt: number;
  updatedAt: number;
}

function marketToolFromBackend(t: MarketToolRaw): MarketTool {
  return {
    ...t,
    createdAt: toDate(t.createdAt) ?? new Date(),
    updatedAt: toDate(t.updatedAt) ?? new Date(),
  };
}

export const listMarketTools = () =>
  invoke<MarketToolRaw[]>('list_market_tools').then(list => list.map(marketToolFromBackend));
export const saveMarketTool = (tool: MarketTool) =>
  invoke<MarketToolRaw>('save_market_tool', {
    ...tool,
    createdAt: toNum(tool.createdAt),
    updatedAt: toNum(tool.updatedAt),
  }).then(marketToolFromBackend);
export const deleteMarketTool = (id: string) => invoke<void>('delete_market_tool', id);

// ===== Extensions: Skills / Prompts / Tags =====

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

export interface Prompt {
  id: string;
  name: string;
  category: string;
  description: string;
  content: string;
  official: boolean;
  isFavorite: boolean;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export type ToolCategoryScope = 'skill' | 'prompt' | 'tool';

export interface ToolCategory {
  id: string;
  scope: ToolCategoryScope;
  name: string;
  sortOrder: number;
  createdAt: number;
}

export const listSkills = () => invoke<Skill[]>('list_skills');
export const saveSkill = (skill: Partial<Skill>) => invoke<Skill>('save_skill', skill);
export const deleteSkill = (id: string) => invoke<void>('delete_skill', id);

export const listPrompts = () => invoke<Prompt[]>('list_prompts');
export const savePrompt = (prompt: Partial<Prompt>) => invoke<Prompt>('save_prompt', prompt);
export const deletePrompt = (id: string) => invoke<void>('delete_prompt', id);

export const listExtensionTags = (scope?: ToolCategoryScope) =>
  invoke<ToolCategory[]>('list_extension_tags', scope);
export const saveExtensionTag = (cat: Partial<ToolCategory>) =>
  invoke<ToolCategory>('save_extension_tag', cat);
export const deleteExtensionTag = (id: string) =>
  invoke<void>('delete_extension_tag', id);
export const listToolCategories = listExtensionTags;
export const saveToolCategory = saveExtensionTag;
export const deleteToolCategory = deleteExtensionTag;

// ===== Teams =====

function teamFromBackend(t: TeamTemplate): TeamTemplate {
  return {
    ...t,
    createdAt: toDate(t.createdAt) ?? new Date(),
    updatedAt: toDate(t.updatedAt) ?? new Date(),
  };
}

export const listTeams = () =>
  invoke<TeamTemplate[]>('list_teams').then((list) => list.map(teamFromBackend));
export const saveTeam = (team: TeamTemplate) =>
  invoke<TeamTemplate>('save_team', {
    ...team,
    createdAt: toNum(team.createdAt),
    updatedAt: toNum(team.updatedAt),
  }).then(teamFromBackend);
export const deleteTeam = (id: string) => invoke<void>('delete_team', id);

// ===== Billing =====

export interface BillingSummary {
  totalTokens: number;
  totalCost: number;
  records: BillingRecord[];
}

export const getBillingSummary = (start?: Date, end?: Date) =>
  invoke<BillingSummary>('get_billing_summary', toNum(start), toNum(end));

// ===== Notifications =====

function notificationFromBackend(n: Notification): Notification {
  return {
    ...n,
    timestamp: toDate(n.timestamp) ?? new Date(),
  };
}

export const listNotifications = () =>
  invoke<Notification[]>('list_notifications').then(list => list.map(notificationFromBackend));

export const saveNotification = (n: Notification) =>
  invoke<Notification>('save_notification', {
    ...n,
    timestamp: toNum(n.timestamp),
  });

export const markNotificationRead = (id: string) => invoke<void>('mark_notification_read', id);
export const deleteNotification = (id: string) => invoke<void>('delete_notification', id);

// ===== Audit & Session Logs =====

export interface AuditLog {
  id: string;
  timestamp: Date;
  userName: string;
  action: string;
  detail: string;
  ip: string;
  result: string;
}

export interface SessionLog {
  id: string;
  timestamp: Date;
  conversationId?: string;
  conversationTitle: string;
  detailPath?: string;
  mode: string;
  agentName: string;
  model: string;
  event: string;
  summary: string;
  tokens: number;
  durationMs: number;
  status: string;
}

interface AuditLogRaw extends Omit<AuditLog, 'timestamp'> { timestamp: number }
interface SessionLogRaw extends Omit<SessionLog, 'timestamp'> { timestamp: number }

const auditLogFromBackend = (raw: AuditLogRaw): AuditLog => ({
  ...raw,
  timestamp: new Date(raw.timestamp),
});

const sessionLogFromBackend = (raw: SessionLogRaw): SessionLog => ({
  ...raw,
  timestamp: new Date(raw.timestamp),
});

export const listAuditLogs = (limit?: number) =>
  invoke<AuditLogRaw[]>('list_audit_logs', limit).then(list => list.map(auditLogFromBackend));

export const saveAuditLog = (log: Partial<AuditLog>) =>
  invoke<AuditLogRaw>('save_audit_log', {
    ...log,
    timestamp: log.timestamp instanceof Date ? log.timestamp.getTime() : log.timestamp,
  }).then(auditLogFromBackend);

export const clearAuditLogs = () => invoke<void>('clear_audit_logs');

export const listSessionLogs = (limit?: number) =>
  invoke<SessionLogRaw[]>('list_session_logs', limit).then(list => list.map(sessionLogFromBackend));

export const saveSessionLog = (log: Partial<SessionLog>) =>
  invoke<SessionLogRaw>('save_session_log', {
    ...log,
    timestamp: log.timestamp instanceof Date ? log.timestamp.getTime() : log.timestamp,
  }).then(sessionLogFromBackend);

export const clearSessionLogs = () => invoke<void>('clear_session_logs');

export interface ConversationDetailEntry {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  status?: string;
  meta?: unknown;
}

export const listConversationDetails = (conversationId: string) =>
  invoke<ConversationDetailEntry[]>('list_conversation_details', conversationId);

// ===== API Keys =====

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  provider?: string;
  createdAt: Date;
}

export const listApiKeys = () => invoke<ApiKey[]>('list_api_keys');
export const saveApiKey = (key: ApiKey) => invoke<ApiKey>('save_api_key', key);
export const deleteApiKey = (id: string) => invoke<void>('delete_api_key', id);

// ===== Webhooks =====

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  secret?: string;
  enabled: boolean;
  createdAt: Date;
}

export interface WebhookPayload {
  id?: string;
  url: string;
  events: string[];
  secret?: string;
  enabled?: boolean;
}

function webhookFromBackend(w: Webhook): Webhook {
  return {
    ...w,
    createdAt: toDate(w.createdAt) ?? new Date(),
  };
}

export const saveWebhook = (payload: WebhookPayload) =>
  invoke<Webhook>('save_webhook', payload).then(webhookFromBackend);

export const listWebhooks = () => invoke<Webhook[]>('list_webhooks').then(list => list.map(webhookFromBackend));
export const deleteWebhook = (id: string) => invoke<void>('delete_webhook', id);

// ===== Misc =====

export const getAppDataDir = () => invoke<string>('get_app_data_dir');

export interface ShellResult {
  stdout: string;
  stderr: string;
  exitCode?: number;
}

export const runShell = (command: string, args: string[]) =>
  invoke<ShellResult>('run_shell', command, args);

export const openPath = (target: string) => invoke<void>('shell_open', target);
export const openExternal = (url: string) => invoke<void>('shell_open_external', url);
export const showOpenDialog = (options: unknown) =>
  invoke<{ canceled: boolean; filePaths: string[] }>('show_open_dialog', options);
export const showSaveDialog = (options: unknown) =>
  invoke<{ canceled: boolean; filePath?: string }>('show_save_dialog', options);

export interface LlmChatRequest {
  provider?: string;
  model?: string;
  apiKeyId?: string;
  messages: Array<Record<string, unknown>>;
  temperature?: number;
  stream?: boolean;
}

export interface LlmChatResponse {
  content: string;
  usage?: Record<string, unknown>;
}

export const llmChat = (req: LlmChatRequest) => invoke<LlmChatResponse>('llm_chat', req);

export interface ParsedDoc {
  text: string;
  pages?: number;
}

export const parseDocument = (path: string) => invoke<ParsedDoc>('parse_document', path);

// ===== Secrets =====

export const getSecret = (key: string) => invoke<string | undefined>('get_secret', key);
export const setSecret = (key: string, value: string) =>
  invoke<{ ok: boolean }>('set_secret', key, value);
export const deleteSecret = (key: string) => invoke<{ ok: boolean }>('delete_secret', key);

// ===== Owlery Runtime =====

export interface AgentStatusWrapper {
  sessionId: string;
  status: TeammateStatus;
}

export const onAgentStatus = (callback: (wrapper: AgentStatusWrapper) => void) =>
  subscribe('agent:status', callback as (...args: unknown[]) => void);

export interface OwleryChunkWrapper {
  sessionId: string;
  chunk: AgentDriverChunk;
}

export const activateOwlerySession = (sessionId: string) =>
  invoke<{ ok: boolean }>('owlery:activate_session', { sessionId });
export const startOwleryChat = (
  sessionId: string,
  text: string,
  options?: { teammateMode?: TeammateMode; teamTemplateId?: string },
) =>
  invoke<{ ok: boolean }>('owlery:start_chat', {
    sessionId,
    text,
    teammateMode: options?.teammateMode,
    teamTemplateId: options?.teamTemplateId,
  });
export const getOwleryBufferedOutput = (sessionId: string) =>
  invoke<AgentDriverChunk[]>('owlery:get_buffered_output', { sessionId });
export const listOwlerySessionSummaries = () =>
  invoke<SessionSummary[]>('owlery:list_session_summaries');
export const getOwleryCrystalBall = (sessionId: string) =>
  invoke<AgentWorkSnapshot[]>('owlery:get_crystal_ball', { sessionId });
export const getTeammateStatus = (sessionId: string) =>
  invoke<TeammateStatus>('owlery:get_teammate_status', { sessionId });
export const onOwleryChunk = (callback: (wrapper: OwleryChunkWrapper) => void) =>
  subscribe('owlery:chunk', callback as (...args: unknown[]) => void);
