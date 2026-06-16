PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    avatar TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    alias TEXT,
    encrypted_key TEXT,
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS webhooks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    secret_ref TEXT,
    event_types TEXT NOT NULL DEFAULT '[]',
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    avatar TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '#000000',
    bg_color TEXT NOT NULL DEFAULT '',
    text_color TEXT NOT NULL DEFAULT '',
    border_color TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'idle',
    model TEXT NOT NULL DEFAULT '',
    tools_json TEXT NOT NULL DEFAULT '[]',
    capabilities_json TEXT NOT NULL DEFAULT '[]',
    trigger_rule TEXT NOT NULL DEFAULT '',
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'single',
    last_message TEXT NOT NULL DEFAULT '',
    last_time INTEGER NOT NULL,
    unread INTEGER NOT NULL DEFAULT 0,
    agent_ids_json TEXT NOT NULL DEFAULT '[]',
    pinned INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    msg_type TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'text',
    status TEXT NOT NULL DEFAULT 'done',
    content TEXT NOT NULL DEFAULT '',
    agent_id TEXT,
    timestamp INTEGER NOT NULL,
    tool_call_json TEXT,
    cot_steps_json TEXT,
    code_block_json TEXT,
    image_url TEXT,
    image_caption TEXT,
    card_data_json TEXT,
    mentions_json TEXT,
    attachments_json TEXT,
    meta_json TEXT,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);

CREATE TABLE IF NOT EXISTS kanban_tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    assignee_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'todo',
    priority TEXT NOT NULL DEFAULT 'P1',
    due_date TEXT,
    description TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS workflow_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    nodes_json TEXT NOT NULL DEFAULT '[]',
    created_at INTEGER NOT NULL,
    last_run INTEGER
);

CREATE TABLE IF NOT EXISTS knowledge_docs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    size TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'ready',
    error_msg TEXT,
    chunks INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    doc_type TEXT NOT NULL DEFAULT 'txt',
    file_path TEXT
);

CREATE TABLE IF NOT EXISTS doc_chunks (
    id TEXT PRIMARY KEY,
    doc_id TEXT NOT NULL,
    idx INTEGER NOT NULL,
    content TEXT NOT NULL,
    tokens INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (doc_id) REFERENCES knowledge_docs(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_doc_chunks_doc ON doc_chunks(doc_id);

CREATE TABLE IF NOT EXISTS market_tools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT '',
    tool_type TEXT NOT NULL DEFAULT 'skill',
    icon TEXT NOT NULL DEFAULT '',
    icon_bg TEXT NOT NULL DEFAULT '',
    version TEXT NOT NULL DEFAULT '1.0.0',
    developer TEXT NOT NULL DEFAULT '',
    rating REAL NOT NULL DEFAULT 0,
    installs INTEGER NOT NULL DEFAULT 0,
    tags_json TEXT NOT NULL DEFAULT '[]',
    installed INTEGER NOT NULL DEFAULT 0,
    needs_api_key INTEGER NOT NULL DEFAULT 0,
    official INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS team_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    member_ids_json TEXT NOT NULL DEFAULT '[]',
    coordinator_id TEXT NOT NULL DEFAULT '',
    trigger_rule TEXT NOT NULL DEFAULT '',
    mode TEXT NOT NULL DEFAULT 'parallel',
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS billing_records (
    id TEXT PRIMARY KEY,
    record_date TEXT NOT NULL,
    tokens INTEGER NOT NULL DEFAULT 0,
    cost REAL NOT NULL DEFAULT 0,
    model TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    notif_type TEXT NOT NULL DEFAULT 'info',
    read INTEGER NOT NULL DEFAULT 0,
    timestamp INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY
);
INSERT OR IGNORE INTO schema_version (version) VALUES (1);
