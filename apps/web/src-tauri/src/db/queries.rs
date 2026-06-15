use rusqlite::{params, Connection, OptionalExtension};
use serde_json;

use crate::db::models::*;
use crate::error::ActaError;

fn to_json<T: serde::Serialize>(v: &T) -> Result<String, ActaError> {
    serde_json::to_string(v).map_err(ActaError::Json)
}

fn from_json<T: serde::de::DeserializeOwned>(s: &str) -> Result<T, ActaError> {
    serde_json::from_str(s).map_err(ActaError::Json)
}

// === Users ===

pub fn create_user(conn: &Connection, user: &User) -> Result<(), ActaError> {
    conn.execute(
        "INSERT INTO users (id, username, password_hash, display_name, avatar, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            user.id,
            user.username,
            user.password_hash,
            user.display_name,
            user.avatar,
            user.created_at,
            user.updated_at
        ],
    )?;
    Ok(())
}

pub fn get_user_by_username(conn: &Connection, username: &str) -> Result<Option<User>, ActaError> {
    let mut stmt = conn.prepare(
        "SELECT id, username, password_hash, display_name, avatar, created_at, updated_at
         FROM users WHERE username = ?1",
    )?;
    let user = stmt
        .query_row([username], |row| {
            Ok(User {
                id: row.get(0)?,
                username: row.get(1)?,
                password_hash: row.get(2)?,
                display_name: row.get(3)?,
                avatar: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .optional()?;
    Ok(user)
}

pub fn get_user_by_id(conn: &Connection, id: &str) -> Result<Option<User>, ActaError> {
    let mut stmt = conn.prepare(
        "SELECT id, username, password_hash, display_name, avatar, created_at, updated_at
         FROM users WHERE id = ?1",
    )?;
    let user = stmt
        .query_row([id], |row| {
            Ok(User {
                id: row.get(0)?,
                username: row.get(1)?,
                password_hash: row.get(2)?,
                display_name: row.get(3)?,
                avatar: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .optional()?;
    Ok(user)
}

// === Settings ===

pub fn set_setting(conn: &Connection, key: &str, value: &str, now: i64) -> Result<(), ActaError> {
    conn.execute(
        "INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
        params![key, value, now],
    )?;
    Ok(())
}

pub fn get_setting(conn: &Connection, key: &str) -> Result<Option<String>, ActaError> {
    let mut stmt = conn.prepare("SELECT value FROM settings WHERE key = ?1")?;
    let value = stmt.query_row([key], |row| row.get::<_, String>(0)).optional()?;
    Ok(value)
}

pub fn list_settings(conn: &Connection) -> Result<Vec<(String, String)>, ActaError> {
    let mut stmt = conn.prepare("SELECT key, value FROM settings")?;
    let rows = stmt.query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))?;
    rows.collect::<Result<Vec<_>, _>>().map_err(ActaError::Rusqlite)
}

// === Agents ===

impl Agent {
    fn from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Self> {
        let tools_json: String = row.get(9)?;
        let caps_json: String = row.get(10)?;
        Ok(Self {
            id: row.get(0)?,
            name: row.get(1)?,
            role: row.get(2)?,
            description: row.get(3)?,
            avatar: row.get(4)?,
            color: row.get(5)?,
            bg_color: row.get(6)?,
            text_color: row.get(7)?,
            border_color: row.get(8)?,
            tools: from_json(&tools_json).unwrap_or_default(),
            capabilities: from_json(&caps_json).unwrap_or_default(),
            model: row.get(11)?,
            trigger_rule: row.get(12)?,
            status: row.get(13)?,
            enabled: row.get::<_, i32>(14)? != 0,
            created_at: row.get(15)?,
            updated_at: row.get(16)?,
        })
    }
}

pub fn list_agents(conn: &Connection) -> Result<Vec<Agent>, ActaError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, role, description, avatar, color, bg_color, text_color, border_color,
                tools_json, capabilities_json, model, trigger_rule, status, enabled, created_at, updated_at
         FROM agents ORDER BY created_at",
    )?;
    let rows = stmt.query_map([], |row| Agent::from_row(row))?;
    rows.collect::<Result<Vec<_>, _>>().map_err(ActaError::Rusqlite)
}

pub fn get_agent(conn: &Connection, id: &str) -> Result<Option<Agent>, ActaError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, role, description, avatar, color, bg_color, text_color, border_color,
                tools_json, capabilities_json, model, trigger_rule, status, enabled, created_at, updated_at
         FROM agents WHERE id = ?1",
    )?;
    stmt.query_row([id], |row| Agent::from_row(row)).optional().map_err(ActaError::Rusqlite)
}

pub fn upsert_agent(conn: &Connection, agent: &Agent) -> Result<(), ActaError> {
    conn.execute(
        "INSERT INTO agents (id, name, role, description, avatar, color, bg_color, text_color, border_color,
                            tools_json, capabilities_json, model, trigger_rule, status, enabled, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)
         ON CONFLICT(id) DO UPDATE SET
            name = excluded.name, role = excluded.role, description = excluded.description,
            avatar = excluded.avatar, color = excluded.color, bg_color = excluded.bg_color,
            text_color = excluded.text_color, border_color = excluded.border_color,
            tools_json = excluded.tools_json, capabilities_json = excluded.capabilities_json,
            model = excluded.model, trigger_rule = excluded.trigger_rule, status = excluded.status,
            enabled = excluded.enabled, updated_at = excluded.updated_at",
        params![
            agent.id, agent.name, agent.role, agent.description, agent.avatar, agent.color,
            agent.bg_color, agent.text_color, agent.border_color, to_json(&agent.tools)?,
            to_json(&agent.capabilities)?, agent.model, agent.trigger_rule, agent.status,
            if agent.enabled { 1 } else { 0 }, agent.created_at, agent.updated_at
        ],
    )?;
    Ok(())
}

pub fn delete_agent(conn: &Connection, id: &str) -> Result<(), ActaError> {
    conn.execute("DELETE FROM agents WHERE id = ?1", [id])?;
    Ok(())
}

// === Conversations ===

impl Conversation {
    fn from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Self> {
        let agent_ids_json: String = row.get(6)?;
        Ok(Self {
            id: row.get(0)?,
            title: row.get(1)?,
            mode: row.get(2)?,
            last_message: row.get(3)?,
            last_time: row.get(4)?,
            unread: row.get(5)?,
            agent_ids: from_json(&agent_ids_json).unwrap_or_default(),
            pinned: row.get::<_, i32>(7)? != 0,
            created_at: row.get(8)?,
            updated_at: row.get(9)?,
        })
    }
}

pub fn list_conversations(conn: &Connection) -> Result<Vec<Conversation>, ActaError> {
    let mut stmt = conn.prepare(
        "SELECT id, title, mode, last_message, last_time, unread, agent_ids_json, pinned, created_at, updated_at
         FROM conversations ORDER BY pinned DESC, last_time DESC",
    )?;
    let rows = stmt.query_map([], |row| Conversation::from_row(row))?;
    rows.collect::<Result<Vec<_>, _>>().map_err(ActaError::Rusqlite)
}

pub fn get_conversation(conn: &Connection, id: &str) -> Result<Option<Conversation>, ActaError> {
    let mut stmt = conn.prepare(
        "SELECT id, title, mode, last_message, last_time, unread, agent_ids_json, pinned, created_at, updated_at
         FROM conversations WHERE id = ?1",
    )?;
    stmt.query_row([id], |row| Conversation::from_row(row)).optional().map_err(ActaError::Rusqlite)
}

pub fn upsert_conversation(conn: &Connection, conv: &Conversation) -> Result<(), ActaError> {
    conn.execute(
        "INSERT INTO conversations (id, title, mode, last_message, last_time, unread, agent_ids_json, pinned, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
         ON CONFLICT(id) DO UPDATE SET
            title = excluded.title, mode = excluded.mode, last_message = excluded.last_message,
            last_time = excluded.last_time, unread = excluded.unread, agent_ids_json = excluded.agent_ids_json,
            pinned = excluded.pinned, updated_at = excluded.updated_at",
        params![
            conv.id, conv.title, conv.mode, conv.last_message, conv.last_time, conv.unread,
            to_json(&conv.agent_ids)?, if conv.pinned { 1 } else { 0 }, conv.created_at, conv.updated_at
        ],
    )?;
    Ok(())
}

pub fn delete_conversation(conn: &Connection, id: &str) -> Result<(), ActaError> {
    conn.execute("DELETE FROM conversations WHERE id = ?1", [id])?;
    Ok(())
}

// === Messages ===

impl Message {
    fn from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get(0)?,
            conversation_id: row.get(1)?,
            msg_type: row.get(2)?,
            content_type: row.get(3)?,
            status: row.get(4)?,
            content: row.get(5)?,
            agent_id: row.get(6)?,
            timestamp: row.get(7)?,
            tool_call: row.get::<_, Option<String>>(8)?.and_then(|s| serde_json::from_str(&s).ok()),
            cot_steps: row.get::<_, Option<String>>(9)?.and_then(|s| serde_json::from_str(&s).ok()),
            code_block: row.get::<_, Option<String>>(10)?.and_then(|s| serde_json::from_str(&s).ok()),
            image_url: row.get(11)?,
            image_caption: row.get(12)?,
            card_data: row.get::<_, Option<String>>(13)?.and_then(|s| serde_json::from_str(&s).ok()),
            mentions: row.get::<_, Option<String>>(14)?.and_then(|s| serde_json::from_str(&s).ok()),
            attachments: row.get::<_, Option<String>>(15)?.and_then(|s| serde_json::from_str(&s).ok()),
            meta: row.get::<_, Option<String>>(16)?.and_then(|s| serde_json::from_str(&s).ok()),
        })
    }
}

pub fn list_messages(conn: &Connection, conversation_id: &str) -> Result<Vec<Message>, ActaError> {
    let mut stmt = conn.prepare(
        "SELECT id, conversation_id, msg_type, content_type, status, content, agent_id, timestamp,
                tool_call_json, cot_steps_json, code_block_json, image_url, image_caption,
                card_data_json, mentions_json, attachments_json, meta_json
         FROM messages WHERE conversation_id = ?1 ORDER BY timestamp ASC",
    )?;
    let rows = stmt.query_map([conversation_id], |row| Message::from_row(row))?;
    rows.collect::<Result<Vec<_>, _>>().map_err(ActaError::Rusqlite)
}

pub fn upsert_message(conn: &Connection, msg: &Message) -> Result<(), ActaError> {
    conn.execute(
        "INSERT INTO messages (id, conversation_id, msg_type, content_type, status, content, agent_id, timestamp,
                             tool_call_json, cot_steps_json, code_block_json, image_url, image_caption,
                             card_data_json, mentions_json, attachments_json, meta_json)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)
         ON CONFLICT(id) DO UPDATE SET
            content = excluded.content, status = excluded.status, agent_id = excluded.agent_id,
            tool_call_json = excluded.tool_call_json, cot_steps_json = excluded.cot_steps_json,
            code_block_json = excluded.code_block_json, image_url = excluded.image_url,
            image_caption = excluded.image_caption, card_data_json = excluded.card_data_json,
            mentions_json = excluded.mentions_json, attachments_json = excluded.attachments_json,
            meta_json = excluded.meta_json",
        params![
            msg.id, msg.conversation_id, msg.msg_type, msg.content_type, msg.status, msg.content,
            msg.agent_id, msg.timestamp,
            msg.tool_call.as_ref().map(to_json).transpose()?,
            msg.cot_steps.as_ref().map(to_json).transpose()?,
            msg.code_block.as_ref().map(to_json).transpose()?,
            msg.image_url, msg.image_caption,
            msg.card_data.as_ref().map(to_json).transpose()?,
            msg.mentions.as_ref().map(to_json).transpose()?,
            msg.attachments.as_ref().map(to_json).transpose()?,
            msg.meta.as_ref().map(to_json).transpose()?,
        ],
    )?;
    Ok(())
}

pub fn delete_message(conn: &Connection, id: &str) -> Result<(), ActaError> {
    conn.execute("DELETE FROM messages WHERE id = ?1", [id])?;
    Ok(())
}

// === Tasks ===

impl KanbanTask {
    fn from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get(0)?,
            title: row.get(1)?,
            assignee_id: row.get(2)?,
            status: row.get(3)?,
            priority: row.get(4)?,
            due_date: row.get(5)?,
            description: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
        })
    }
}

pub fn list_tasks(conn: &Connection) -> Result<Vec<KanbanTask>, ActaError> {
    let mut stmt = conn.prepare(
        "SELECT id, title, assignee_id, status, priority, due_date, description, created_at, updated_at
         FROM kanban_tasks ORDER BY created_at",
    )?;
    let rows = stmt.query_map([], |row| KanbanTask::from_row(row))?;
    rows.collect::<Result<Vec<_>, _>>().map_err(ActaError::Rusqlite)
}

pub fn upsert_task(conn: &Connection, task: &KanbanTask) -> Result<(), ActaError> {
    conn.execute(
        "INSERT INTO kanban_tasks (id, title, assignee_id, status, priority, due_date, description, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
         ON CONFLICT(id) DO UPDATE SET
            title = excluded.title, assignee_id = excluded.assignee_id, status = excluded.status,
            priority = excluded.priority, due_date = excluded.due_date, description = excluded.description,
            updated_at = excluded.updated_at",
        params![
            task.id, task.title, task.assignee_id, task.status, task.priority, task.due_date,
            task.description, task.created_at, task.updated_at
        ],
    )?;
    Ok(())
}

pub fn delete_task(conn: &Connection, id: &str) -> Result<(), ActaError> {
    conn.execute("DELETE FROM kanban_tasks WHERE id = ?1", [id])?;
    Ok(())
}

// === Workflows ===

impl WorkflowTemplate {
    fn from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Self> {
        let nodes_json: String = row.get(3)?;
        Ok(Self {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            nodes: from_json(&nodes_json).unwrap_or_default(),
            created_at: row.get(4)?,
            last_run: row.get(5)?,
        })
    }
}

pub fn list_workflows(conn: &Connection) -> Result<Vec<WorkflowTemplate>, ActaError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, description, nodes_json, created_at, last_run FROM workflow_templates ORDER BY created_at",
    )?;
    let rows = stmt.query_map([], |row| WorkflowTemplate::from_row(row))?;
    rows.collect::<Result<Vec<_>, _>>().map_err(ActaError::Rusqlite)
}

pub fn upsert_workflow(conn: &Connection, wf: &WorkflowTemplate) -> Result<(), ActaError> {
    conn.execute(
        "INSERT INTO workflow_templates (id, name, description, nodes_json, created_at, last_run)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)
         ON CONFLICT(id) DO UPDATE SET
            name = excluded.name, description = excluded.description, nodes_json = excluded.nodes_json,
            last_run = excluded.last_run",
        params![wf.id, wf.name, wf.description, to_json(&wf.nodes)?, wf.created_at, wf.last_run],
    )?;
    Ok(())
}

pub fn delete_workflow(conn: &Connection, id: &str) -> Result<(), ActaError> {
    conn.execute("DELETE FROM workflow_templates WHERE id = ?1", [id])?;
    Ok(())
}

// === Knowledge Docs ===

impl KnowledgeDoc {
    fn from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get(0)?,
            name: row.get(1)?,
            size: row.get(2)?,
            status: row.get(3)?,
            error_msg: row.get(4)?,
            chunks: row.get(5)?,
            created_at: row.get(6)?,
            doc_type: row.get(7)?,
            file_path: row.get(8)?,
        })
    }
}

pub fn list_docs(conn: &Connection) -> Result<Vec<KnowledgeDoc>, ActaError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, size, status, error_msg, chunks, created_at, doc_type, file_path
         FROM knowledge_docs ORDER BY created_at DESC",
    )?;
    let rows = stmt.query_map([], |row| KnowledgeDoc::from_row(row))?;
    rows.collect::<Result<Vec<_>, _>>().map_err(ActaError::Rusqlite)
}

pub fn upsert_doc(conn: &Connection, doc: &KnowledgeDoc) -> Result<(), ActaError> {
    conn.execute(
        "INSERT INTO knowledge_docs (id, name, size, status, error_msg, chunks, created_at, doc_type, file_path)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
         ON CONFLICT(id) DO UPDATE SET
            name = excluded.name, size = excluded.size, status = excluded.status,
            error_msg = excluded.error_msg, chunks = excluded.chunks, doc_type = excluded.doc_type,
            file_path = excluded.file_path",
        params![
            doc.id, doc.name, doc.size, doc.status, doc.error_msg, doc.chunks, doc.created_at,
            doc.doc_type, doc.file_path
        ],
    )?;
    Ok(())
}

pub fn delete_doc(conn: &Connection, id: &str) -> Result<(), ActaError> {
    conn.execute("DELETE FROM knowledge_docs WHERE id = ?1", [id])?;
    Ok(())
}

// === Doc Chunks ===

pub fn list_chunks(conn: &Connection, doc_id: &str) -> Result<Vec<DocChunk>, ActaError> {
    let mut stmt = conn.prepare(
        "SELECT id, doc_id, idx, content, tokens FROM doc_chunks WHERE doc_id = ?1 ORDER BY idx",
    )?;
    let rows = stmt.query_map([doc_id], |row| {
        Ok(DocChunk {
            id: row.get(0)?,
            doc_id: row.get(1)?,
            idx: row.get(2)?,
            content: row.get(3)?,
            tokens: row.get(4)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(ActaError::Rusqlite)
}

pub fn insert_chunk(conn: &Connection, chunk: &DocChunk) -> Result<(), ActaError> {
    conn.execute(
        "INSERT INTO doc_chunks (id, doc_id, idx, content, tokens) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![chunk.id, chunk.doc_id, chunk.idx, chunk.content, chunk.tokens],
    )?;
    Ok(())
}

pub fn delete_chunks_for_doc(conn: &Connection, doc_id: &str) -> Result<(), ActaError> {
    conn.execute("DELETE FROM doc_chunks WHERE doc_id = ?1", [doc_id])?;
    Ok(())
}

// === Market Tools ===

impl MarketTool {
    fn from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Self> {
        let tags_json: String = row.get(10)?;
        Ok(Self {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            category: row.get(3)?,
            tool_type: row.get(4)?,
            icon: row.get(5)?,
            icon_bg: row.get(6)?,
            version: row.get(7)?,
            developer: row.get(8)?,
            rating: row.get(9)?,
            installs: row.get(11)?,
            tags: from_json(&tags_json).unwrap_or_default(),
            installed: row.get::<_, i32>(12)? != 0,
            needs_api_key: row.get::<_, i32>(13)? != 0,
            official: row.get::<_, i32>(14)? != 0,
            created_at: row.get(15)?,
            updated_at: row.get(16)?,
        })
    }
}

pub fn list_market_tools(conn: &Connection) -> Result<Vec<MarketTool>, ActaError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, description, category, tool_type, icon, icon_bg, version, developer, rating,
                tags_json, installs, installed, needs_api_key, official, created_at, updated_at
         FROM market_tools ORDER BY installs DESC",
    )?;
    let rows = stmt.query_map([], |row| MarketTool::from_row(row))?;
    rows.collect::<Result<Vec<_>, _>>().map_err(ActaError::Rusqlite)
}

pub fn upsert_market_tool(conn: &Connection, tool: &MarketTool) -> Result<(), ActaError> {
    conn.execute(
        "INSERT INTO market_tools (id, name, description, category, tool_type, icon, icon_bg, version,
                                   developer, rating, tags_json, installs, installed, needs_api_key, official,
                                   created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)
         ON CONFLICT(id) DO UPDATE SET
            name = excluded.name, description = excluded.description, category = excluded.category,
            tool_type = excluded.tool_type, icon = excluded.icon, icon_bg = excluded.icon_bg,
            version = excluded.version, developer = excluded.developer, rating = excluded.rating,
            tags_json = excluded.tags_json, installs = excluded.installs, installed = excluded.installed,
            needs_api_key = excluded.needs_api_key, official = excluded.official, updated_at = excluded.updated_at",
        params![
            tool.id, tool.name, tool.description, tool.category, tool.tool_type, tool.icon, tool.icon_bg,
            tool.version, tool.developer, tool.rating, to_json(&tool.tags)?, tool.installs,
            if tool.installed { 1 } else { 0 }, if tool.needs_api_key { 1 } else { 0 },
            if tool.official { 1 } else { 0 }, tool.created_at, tool.updated_at
        ],
    )?;
    Ok(())
}

// === Team Templates ===

impl TeamTemplate {
    fn from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Self> {
        let member_ids_json: String = row.get(3)?;
        Ok(Self {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            member_ids: from_json(&member_ids_json).unwrap_or_default(),
            coordinator_id: row.get(4)?,
            trigger_rule: row.get(5)?,
            mode: row.get(6)?,
            enabled: row.get::<_, i32>(7)? != 0,
            created_at: row.get(8)?,
            updated_at: row.get(9)?,
        })
    }
}

pub fn list_teams(conn: &Connection) -> Result<Vec<TeamTemplate>, ActaError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, description, member_ids_json, coordinator_id, trigger_rule, mode, enabled, created_at, updated_at
         FROM team_templates ORDER BY created_at",
    )?;
    let rows = stmt.query_map([], |row| TeamTemplate::from_row(row))?;
    rows.collect::<Result<Vec<_>, _>>().map_err(ActaError::Rusqlite)
}

pub fn upsert_team(conn: &Connection, team: &TeamTemplate) -> Result<(), ActaError> {
    conn.execute(
        "INSERT INTO team_templates (id, name, description, member_ids_json, coordinator_id, trigger_rule,
                                     mode, enabled, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
         ON CONFLICT(id) DO UPDATE SET
            name = excluded.name, description = excluded.description, member_ids_json = excluded.member_ids_json,
            coordinator_id = excluded.coordinator_id, trigger_rule = excluded.trigger_rule, mode = excluded.mode,
            enabled = excluded.enabled, updated_at = excluded.updated_at",
        params![
            team.id, team.name, team.description, to_json(&team.member_ids)?, team.coordinator_id,
            team.trigger_rule, team.mode, if team.enabled { 1 } else { 0 }, team.created_at, team.updated_at
        ],
    )?;
    Ok(())
}

pub fn delete_team(conn: &Connection, id: &str) -> Result<(), ActaError> {
    conn.execute("DELETE FROM team_templates WHERE id = ?1", [id])?;
    Ok(())
}

// === Billing ===

pub fn list_billing(conn: &Connection) -> Result<Vec<BillingRecord>, ActaError> {
    let mut stmt = conn.prepare(
        "SELECT id, record_date, tokens, cost, model, created_at FROM billing_records ORDER BY record_date",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(BillingRecord {
            id: row.get(0)?,
            record_date: row.get(1)?,
            tokens: row.get(2)?,
            cost: row.get(3)?,
            model: row.get(4)?,
            created_at: row.get(5)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(ActaError::Rusqlite)
}

pub fn insert_billing(conn: &Connection, record: &BillingRecord) -> Result<(), ActaError> {
    conn.execute(
        "INSERT INTO billing_records (id, record_date, tokens, cost, model, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![record.id, record.record_date, record.tokens, record.cost, record.model, record.created_at],
    )?;
    Ok(())
}

// === Notifications ===

impl Notification {
    fn from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get(0)?,
            title: row.get(1)?,
            content: row.get(2)?,
            notif_type: row.get(3)?,
            read: row.get::<_, i32>(4)? != 0,
            timestamp: row.get(5)?,
        })
    }
}

pub fn list_notifications(conn: &Connection) -> Result<Vec<Notification>, ActaError> {
    let mut stmt = conn.prepare(
        "SELECT id, title, content, notif_type, read, timestamp FROM notifications ORDER BY timestamp DESC",
    )?;
    let rows = stmt.query_map([], |row| Notification::from_row(row))?;
    rows.collect::<Result<Vec<_>, _>>().map_err(ActaError::Rusqlite)
}

pub fn upsert_notification(conn: &Connection, n: &Notification) -> Result<(), ActaError> {
    conn.execute(
        "INSERT INTO notifications (id, title, content, notif_type, read, timestamp)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)
         ON CONFLICT(id) DO UPDATE SET
            title = excluded.title, content = excluded.content, notif_type = excluded.notif_type,
            read = excluded.read",
        params![n.id, n.title, n.content, n.notif_type, if n.read { 1 } else { 0 }, n.timestamp],
    )?;
    Ok(())
}

pub fn delete_notification(conn: &Connection, id: &str) -> Result<(), ActaError> {
    conn.execute("DELETE FROM notifications WHERE id = ?1", [id])?;
    Ok(())
}

pub fn mark_notification_read(conn: &Connection, id: &str) -> Result<(), ActaError> {
    conn.execute("UPDATE notifications SET read = 1 WHERE id = ?1", [id])?;
    Ok(())
}

// === API Keys ===

pub fn list_api_keys(conn: &Connection) -> Result<Vec<ApiKeyEntry>, ActaError> {
    let mut stmt = conn.prepare("SELECT id, provider, alias, created_at FROM api_keys ORDER BY created_at")?;
    let rows = stmt.query_map([], |row| {
        Ok(ApiKeyEntry {
            id: row.get(0)?,
            provider: row.get(1)?,
            alias: row.get(2)?,
            created_at: row.get(3)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(ActaError::Rusqlite)
}

pub fn upsert_api_key(conn: &Connection, key: &ApiKeyEntry) -> Result<(), ActaError> {
    conn.execute(
        "INSERT INTO api_keys (id, provider, alias, created_at) VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(id) DO UPDATE SET provider = excluded.provider, alias = excluded.alias",
        params![key.id, key.provider, key.alias, key.created_at],
    )?;
    Ok(())
}

pub fn delete_api_key(conn: &Connection, id: &str) -> Result<(), ActaError> {
    conn.execute("DELETE FROM api_keys WHERE id = ?1", [id])?;
    Ok(())
}

// === Webhooks ===

impl Webhook {
    fn from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Self> {
        let event_types_json: String = row.get(4)?;
        Ok(Self {
            id: row.get(0)?,
            name: row.get(1)?,
            url: row.get(2)?,
            event_types: from_json(&event_types_json).unwrap_or_default(),
            active: row.get::<_, i32>(3)? != 0,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    }
}

pub fn list_webhooks(conn: &Connection) -> Result<Vec<Webhook>, ActaError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, url, active, event_types, created_at, updated_at FROM webhooks ORDER BY created_at",
    )?;
    let rows = stmt.query_map([], |row| Webhook::from_row(row))?;
    rows.collect::<Result<Vec<_>, _>>().map_err(ActaError::Rusqlite)
}

pub fn upsert_webhook(conn: &Connection, hook: &Webhook) -> Result<(), ActaError> {
    conn.execute(
        "INSERT INTO webhooks (id, name, url, active, event_types, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
         ON CONFLICT(id) DO UPDATE SET
            name = excluded.name, url = excluded.url, active = excluded.active,
            event_types = excluded.event_types, updated_at = excluded.updated_at",
        params![
            hook.id, hook.name, hook.url, if hook.active { 1 } else { 0 }, to_json(&hook.event_types)?,
            hook.created_at, hook.updated_at
        ],
    )?;
    Ok(())
}

pub fn delete_webhook(conn: &Connection, id: &str) -> Result<(), ActaError> {
    conn.execute("DELETE FROM webhooks WHERE id = ?1", [id])?;
    Ok(())
}
