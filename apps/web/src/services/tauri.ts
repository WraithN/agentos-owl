/* OwlOS v1.0 Tauri 后端服务封装 */
import { invoke } from '@tauri-apps/api/core';
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

export const signIn = (req: SignInRequest) => invoke<AuthInfo>('sign_in', { req });
export const signUp = (req: SignUpRequest) => invoke<AuthInfo>('sign_up', { req });
export const getProfile = (userId: string) => invoke<AuthInfo | null>('get_profile', { userId });

// ===== Settings =====

export const getSetting = (key: string) => invoke<string | null>('get_setting', { key });
export const setSetting = (key: string, value: string) => invoke<void>('set_setting', { key, value });
export const listSettings = () => invoke<Array<[string, string]>>('list_settings');

// ===== Agents =====

export const listAgents = () => invoke<Agent[]>('list_agents');
export const getAgent = (id: string) => invoke<Agent | null>('get_agent', { id });
export const saveAgent = (agent: Agent) => invoke<Agent>('save_agent', { agent });
export const deleteAgent = (id: string) => invoke<void>('delete_agent', { id });

// ===== Conversations =====

function convFromBackend(c: Conversation): Conversation {
  return {
    ...c,
    lastTime: toDate(c.lastTime) ?? new Date(),
    createdAt: toDate(c.createdAt) ?? new Date(),
    updatedAt: toDate(c.updatedAt) ?? new Date(),
  };
}

function convToBackend(c: Conversation): Conversation {
  return {
    ...c,
    lastTime: toNum(c.lastTime) as unknown as Date,
    createdAt: toNum(c.createdAt) as unknown as Date,
    updatedAt: toNum(c.updatedAt) as unknown as Date,
  };
}

export const listConversations = () =>
  invoke<Conversation[]>('list_conversations').then(arr => arr.map(convFromBackend));

export const getConversation = (id: string) =>
  invoke<Conversation | null>('get_conversation', { id }).then(c => c ? convFromBackend(c) : null);

export const saveConversation = (conv: Conversation) =>
  invoke<Conversation>('save_conversation', { conv: convToBackend(conv) }).then(convFromBackend);

export const deleteConversation = (id: string) => invoke<void>('delete_conversation', { id });

// ===== Messages =====

function msgFromBackend(m: Message): Message {
  return { ...m, timestamp: toDate(m.timestamp) ?? new Date() };
}

function msgToBackend(m: Message): Message {
  return { ...m, timestamp: toNum(m.timestamp) as unknown as Date };
}

export const listMessages = (conversationId: string) =>
  invoke<Message[]>('list_messages', { conversationId }).then(arr => arr.map(msgFromBackend));

export const saveMessage = (msg: Message) =>
  invoke<Message>('save_message', { msg: msgToBackend(msg) }).then(msgFromBackend);

export const deleteMessage = (id: string) => invoke<void>('delete_message', { id });

// ===== Kanban Tasks =====

function taskFromBackend(t: KanbanTask): KanbanTask {
  return {
    ...t,
    createdAt: toDate(t.createdAt) ?? new Date(),
    updatedAt: toDate(t.updatedAt) ?? new Date(),
  };
}

function taskToBackend(t: KanbanTask): KanbanTask {
  return {
    ...t,
    createdAt: toNum(t.createdAt) as unknown as Date,
    updatedAt: toNum(t.updatedAt) as unknown as Date,
  };
}

export const listTasks = () => invoke<KanbanTask[]>('list_tasks').then(arr => arr.map(taskFromBackend));
export const saveTask = (task: KanbanTask) =>
  invoke<KanbanTask>('save_task', { task: taskToBackend(task) }).then(taskFromBackend);
export const deleteTask = (id: string) => invoke<void>('delete_task', { id });

// ===== Workflows =====

function wfFromBackend(w: WorkflowTemplate): WorkflowTemplate {
  return {
    ...w,
    createdAt: toDate(w.createdAt) ?? new Date(),
    lastRun: toDate(w.lastRun),
  };
}

function wfToBackend(w: WorkflowTemplate): WorkflowTemplate {
  return {
    ...w,
    createdAt: toNum(w.createdAt) as unknown as Date,
    lastRun: toNum(w.lastRun) as unknown as Date,
  };
}

export const listWorkflows = () => invoke<WorkflowTemplate[]>('list_workflows').then(arr => arr.map(wfFromBackend));
export const saveWorkflow = (wf: WorkflowTemplate) =>
  invoke<WorkflowTemplate>('save_workflow', { wf: wfToBackend(wf) }).then(wfFromBackend);
export const deleteWorkflow = (id: string) => invoke<void>('delete_workflow', { id });

// ===== Knowledge =====

function docFromBackend(d: KnowledgeDoc): KnowledgeDoc {
  return { ...d, createdAt: toDate(d.createdAt) ?? new Date() };
}

function docToBackend(d: KnowledgeDoc): KnowledgeDoc {
  return { ...d, createdAt: toNum(d.createdAt) as unknown as Date };
}

export const listDocs = () => invoke<KnowledgeDoc[]>('list_docs').then(arr => arr.map(docFromBackend));
export const saveDoc = (doc: KnowledgeDoc) =>
  invoke<KnowledgeDoc>('save_doc', { doc: docToBackend(doc) }).then(docFromBackend);
export const deleteDoc = (id: string) => invoke<void>('delete_doc', { id });
export const listChunks = (docId: string) => invoke<DocChunk[]>('list_chunks', { docId });
export const saveChunks = (chunks: DocChunk[]) => invoke<void>('save_chunks', { chunks });

// ===== Market Tools =====

function toolFromBackend(t: MarketTool): MarketTool {
  return {
    ...t,
    createdAt: toDate(t.createdAt) ?? new Date(),
    updatedAt: toDate(t.updatedAt) ?? new Date(),
  };
}

function toolToBackend(t: MarketTool): MarketTool {
  return {
    ...t,
    createdAt: toNum(t.createdAt) as unknown as Date,
    updatedAt: toNum(t.updatedAt) as unknown as Date,
  };
}

export const listMarketTools = () =>
  invoke<MarketTool[]>('list_market_tools').then(arr => arr.map(toolFromBackend));

export const saveMarketTool = (tool: MarketTool) =>
  invoke<MarketTool>('save_market_tool', { tool: toolToBackend(tool) }).then(toolFromBackend);

// ===== Teams =====

function teamFromBackend(t: TeamTemplate): TeamTemplate {
  return {
    ...t,
    createdAt: toDate(t.createdAt) ?? new Date(),
    updatedAt: toDate(t.updatedAt) ?? new Date(),
  };
}

function teamToBackend(t: TeamTemplate): TeamTemplate {
  return {
    ...t,
    createdAt: toNum(t.createdAt) as unknown as Date,
    updatedAt: toNum(t.updatedAt) as unknown as Date,
  };
}

export const listTeams = () => invoke<TeamTemplate[]>('list_teams').then(arr => arr.map(teamFromBackend));
export const saveTeam = (team: TeamTemplate) =>
  invoke<TeamTemplate>('save_team', { team: teamToBackend(team) }).then(teamFromBackend);
export const deleteTeam = (id: string) => invoke<void>('delete_team', { id });

// ===== Billing =====

function billingFromBackend(b: BillingRecord): BillingRecord {
  return { ...b, createdAt: toDate(b.createdAt) ?? new Date() };
}

function billingToBackend(b: BillingRecord): BillingRecord {
  return { ...b, createdAt: toNum(b.createdAt) as unknown as Date };
}

export const listBilling = () => invoke<BillingRecord[]>('list_billing').then(arr => arr.map(billingFromBackend));
export const recordBilling = (record: BillingRecord) =>
  invoke<BillingRecord>('record_billing', { record: billingToBackend(record) }).then(billingFromBackend);

// ===== Notifications =====

function notifFromBackend(n: Notification): Notification {
  return { ...n, timestamp: toDate(n.timestamp) ?? new Date() };
}

function notifToBackend(n: Notification): Notification {
  return { ...n, timestamp: toNum(n.timestamp) as unknown as Date };
}

export const listNotifications = () =>
  invoke<Notification[]>('list_notifications').then(arr => arr.map(notifFromBackend));

export const saveNotification = (n: Notification) =>
  invoke<Notification>('save_notification', { n: notifToBackend(n) }).then(notifFromBackend);

export const markNotificationRead = (id: string) => invoke<void>('mark_notification_read', { id });
export const deleteNotification = (id: string) => invoke<void>('delete_notification', { id });

// ===== API Keys (secure) =====

export interface ApiKeyEntry {
  id: string;
  provider: string;
  alias?: string;
  createdAt: number;
}

export interface ApiKeyPayload {
  id?: string;
  provider: string;
  alias?: string;
  secret: string;
}

export const saveApiKey = (payload: ApiKeyPayload) => invoke<ApiKeyEntry>('save_api_key', { payload });
export const listApiKeys = () => invoke<ApiKeyEntry[]>('list_api_keys');
export const deleteApiKey = (id: string) => invoke<void>('delete_api_key', { id });
export const getApiKeySecret = (id: string) => invoke<string | null>('get_api_key_secret', { id });

// ===== Webhooks =====

export interface Webhook {
  id: string;
  name: string;
  url: string;
  eventTypes: string[];
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface WebhookPayload {
  id?: string;
  name: string;
  url: string;
  secret?: string;
  eventTypes: string[];
  active: boolean;
}

export const saveWebhook = (payload: WebhookPayload) => invoke<Webhook>('save_webhook', { payload });
export const listWebhooks = () => invoke<Webhook[]>('list_webhooks');
export const deleteWebhook = (id: string) => invoke<void>('delete_webhook', { id });

// ===== Misc =====

export const getAppDataDir = () => invoke<string>('get_app_data_dir');

export interface ShellResult {
  stdout: string;
  stderr: string;
  exitCode?: number;
}

export const runShell = (command: string, args: string[]) =>
  invoke<ShellResult>('run_shell', { command, args });

export interface LlmChatRequest {
  provider: string;
  model: string;
  apiKeyId: string;
  messages: Array<Record<string, unknown>>;
  temperature?: number;
  stream?: boolean;
}

export interface LlmChatResponse {
  content: string;
  usage?: Record<string, unknown>;
}

export const llmChat = (req: LlmChatRequest) => invoke<LlmChatResponse>('llm_chat', { req });

export interface ParsedDoc {
  text: string;
  pages: number;
}

export const parseDocument = (path: string) => invoke<ParsedDoc>('parse_document', { path });
