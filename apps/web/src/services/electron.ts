/* OwlOS v1.0 Electron IPC 后端服务封装 */
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

function convFromBackend(c: Conversation): Conversation {
  return {
    ...c,
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

function msgFromBackend(m: Message): Message {
  return {
    ...m,
    timestamp: toDate(m.timestamp) ?? new Date(),
  };
}

export const listMessages = (conversationId: string) =>
  invoke<Message[]>('list_messages', conversationId).then(list => list.map(msgFromBackend));

export const saveMessage = (msg: Message & { conversationId: string }) =>
  invoke<Message>('save_message', {
    ...msg,
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

export const listWorkflowTemplates = () => invoke<WorkflowTemplate[]>('list_workflow_templates');
export const saveWorkflowTemplate = (template: WorkflowTemplate) =>
  invoke<WorkflowTemplate>('save_workflow_template', template);
export const deleteWorkflowTemplate = (id: string) => invoke<void>('delete_workflow_template', id);

// ===== Knowledge =====

export const saveDoc = (doc: KnowledgeDoc) =>
  invoke<KnowledgeDoc>('save_doc', {
    ...doc,
    createdAt: toNum(doc.createdAt),
  });

export const saveChunk = (chunk: DocChunk) => invoke<DocChunk>('save_chunk', chunk);
export const saveChunks = (chunks: DocChunk[]) => invoke<DocChunk[]>('save_chunks', chunks);

// ===== Market Tools =====

export const listMarketTools = () => invoke<MarketTool[]>('list_market_tools');
export const saveMarketTool = (tool: MarketTool) => invoke<MarketTool>('save_market_tool', tool);
export const deleteMarketTool = (id: string) => invoke<void>('delete_market_tool', id);

// ===== Teams =====

export const listTeams = () => invoke<TeamTemplate[]>('list_teams');
export const saveTeam = (team: TeamTemplate) =>
  invoke<TeamTemplate>('save_team', {
    ...team,
    createdAt: toNum(team.createdAt),
    updatedAt: toNum(team.updatedAt),
  });
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

// ===== Pi Agent Runtime =====

export interface AgentEventWrapper {
  sessionId: string;
  event: unknown;
}

export const createAgent = (sessionId: string) => invoke<{ ok: boolean }>('agent:create', { sessionId });
export const disposeAgent = (sessionId: string) => invoke<{ ok: boolean }>('agent:dispose', { sessionId });
export const promptAgent = (sessionId: string, text: string) =>
  invoke<{ ok: boolean }>('agent:prompt', { sessionId, text });
export const stopAgent = (sessionId: string) => invoke<{ ok: boolean }>('agent:stop', { sessionId });
export const onAgentEvent = (callback: (wrapper: AgentEventWrapper) => void) =>
  subscribe('agent:event', callback as (...args: unknown[]) => void);
