use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub id: String,
    pub username: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub display_name: Option<String>,
    pub avatar: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Agent {
    pub id: String,
    pub name: String,
    pub role: String,
    pub description: String,
    pub avatar: String,
    pub color: String,
    pub bg_color: String,
    pub text_color: String,
    pub border_color: String,
    pub status: String,
    pub model: String,
    pub tools: Vec<String>,
    pub capabilities: Vec<String>,
    pub trigger_rule: String,
    pub enabled: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Conversation {
    pub id: String,
    pub title: String,
    pub mode: String,
    pub last_message: String,
    pub last_time: i64,
    pub unread: i32,
    pub agent_ids: Vec<String>,
    pub pinned: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Message {
    pub id: String,
    pub conversation_id: String,
    #[serde(rename = "type")]
    pub msg_type: String,
    pub content_type: String,
    pub status: String,
    pub content: String,
    pub agent_id: Option<String>,
    pub timestamp: i64,
    pub tool_call: Option<serde_json::Value>,
    pub cot_steps: Option<Vec<serde_json::Value>>,
    pub code_block: Option<serde_json::Value>,
    pub image_url: Option<String>,
    pub image_caption: Option<String>,
    pub card_data: Option<serde_json::Value>,
    pub mentions: Option<Vec<String>>,
    pub attachments: Option<Vec<String>>,
    pub meta: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KanbanTask {
    pub id: String,
    pub title: String,
    pub assignee_id: String,
    pub status: String,
    pub priority: String,
    pub due_date: Option<String>,
    pub description: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowTemplate {
    pub id: String,
    pub name: String,
    pub description: String,
    pub nodes: Vec<serde_json::Value>,
    pub created_at: i64,
    pub last_run: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeDoc {
    pub id: String,
    pub name: String,
    pub size: String,
    pub status: String,
    pub error_msg: Option<String>,
    pub chunks: i32,
    pub created_at: i64,
    #[serde(rename = "type")]
    pub doc_type: String,
    pub file_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocChunk {
    pub id: String,
    pub doc_id: String,
    pub idx: i32,
    pub content: String,
    pub tokens: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketTool {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: String,
    #[serde(rename = "toolType")]
    pub tool_type: String,
    pub icon: String,
    pub icon_bg: String,
    pub version: String,
    pub developer: String,
    pub rating: f64,
    pub installs: i64,
    pub tags: Vec<String>,
    pub installed: bool,
    pub needs_api_key: bool,
    pub official: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TeamTemplate {
    pub id: String,
    pub name: String,
    pub description: String,
    pub member_ids: Vec<String>,
    pub coordinator_id: String,
    pub trigger_rule: String,
    pub mode: String,
    pub enabled: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BillingRecord {
    pub id: String,
    pub record_date: String,
    pub tokens: i64,
    pub cost: f64,
    pub model: String,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Notification {
    pub id: String,
    pub title: String,
    pub content: String,
    #[serde(rename = "type")]
    pub notif_type: String,
    pub read: bool,
    pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiKeyEntry {
    pub id: String,
    pub provider: String,
    pub alias: Option<String>,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Webhook {
    pub id: String,
    pub name: String,
    pub url: String,
    pub event_types: Vec<String>,
    pub active: bool,
    pub created_at: i64,
    pub updated_at: i64,
}
