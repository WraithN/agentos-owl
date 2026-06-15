use argon2::{Argon2, PasswordHash, PasswordVerifier};
use serde::{Deserialize, Serialize};
use serde_json;
use tauri::{command, AppHandle, Manager, State};

use crate::db::models::*;
use crate::db::queries;
use crate::db::DbState;
use crate::error::ActaError;
use crate::secure;

fn now_ms() -> i64 {
    chrono::Utc::now().timestamp_millis()
}

fn uuid() -> String {
    uuid::Uuid::new_v4().to_string()
}

fn conn<'a>(state: &'a State<'a, DbState>) -> Result<std::sync::MutexGuard<'a, rusqlite::Connection>, ActaError> {
    state.0.lock().map_err(|e| ActaError::Db(format!("锁错误: {}", e)))
}

// === Auth ===

#[derive(Serialize)]
pub struct AuthInfo {
    pub id: String,
    pub username: String,
    pub display_name: Option<String>,
    pub avatar: Option<String>,
}

#[derive(Deserialize)]
pub struct SignInRequest {
    pub username: String,
    pub password: String,
}

#[command]
pub fn sign_in(state: State<'_, DbState>, req: SignInRequest) -> Result<AuthInfo, ActaError> {
    let conn = conn(&state)?;
    let user = queries::get_user_by_username(&conn, &req.username)?
        .ok_or_else(|| ActaError::Auth("用户名或密码错误".into()))?;
    let parsed_hash = PasswordHash::new(&user.password_hash)
        .map_err(|e| ActaError::Auth(format!("密码哈希解析失败: {}", e)))?;
    Argon2::default()
        .verify_password(req.password.as_bytes(), &parsed_hash)
        .map_err(|_| ActaError::Auth("用户名或密码错误".into()))?;
    Ok(AuthInfo {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        avatar: user.avatar,
    })
}

#[derive(Deserialize)]
pub struct SignUpRequest {
    pub username: String,
    pub password: String,
    pub display_name: Option<String>,
}

#[command]
pub fn sign_up(state: State<'_, DbState>, req: SignUpRequest) -> Result<AuthInfo, ActaError> {
    let conn = conn(&state)?;
    if queries::get_user_by_username(&conn, &req.username)?.is_some() {
        return Err(ActaError::BadRequest("用户名已存在".into()));
    }
    use argon2::{password_hash::SaltString, PasswordHasher};
    use rand::rngs::OsRng;
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2
        .hash_password(req.password.as_bytes(), &salt)
        .map_err(|e| ActaError::Auth(format!("密码哈希失败: {}", e)))?
        .to_string();
    let id = uuid();
    let user = User {
        id: id.clone(),
        username: req.username.clone(),
        password_hash,
        display_name: req.display_name.clone(),
        avatar: None,
        created_at: now_ms(),
        updated_at: now_ms(),
    };
    queries::create_user(&conn, &user)?;
    Ok(AuthInfo {
        id,
        username: req.username,
        display_name: req.display_name,
        avatar: None,
    })
}

#[command]
pub fn get_profile(state: State<'_, DbState>, user_id: String) -> Result<Option<AuthInfo>, ActaError> {
    let conn = conn(&state)?;
    Ok(queries::get_user_by_id(&conn, &user_id)?.map(|u| AuthInfo {
        id: u.id,
        username: u.username,
        display_name: u.display_name,
        avatar: u.avatar,
    }))
}

// === Settings ===

#[command]
pub fn get_setting(state: State<'_, DbState>, key: String) -> Result<Option<String>, ActaError> {
    let conn = conn(&state)?;
    queries::get_setting(&conn, &key)
}

#[command]
pub fn set_setting(state: State<'_, DbState>, key: String, value: String) -> Result<(), ActaError> {
    let conn = conn(&state)?;
    queries::set_setting(&conn, &key, &value, now_ms())
}

#[command]
pub fn list_settings(state: State<'_, DbState>) -> Result<Vec<(String, String)>, ActaError> {
    let conn = conn(&state)?;
    queries::list_settings(&conn)
}

// === Agents ===

#[command]
pub fn list_agents(state: State<'_, DbState>) -> Result<Vec<Agent>, ActaError> {
    let conn = conn(&state)?;
    queries::list_agents(&conn)
}

#[command]
pub fn get_agent(state: State<'_, DbState>, id: String) -> Result<Option<Agent>, ActaError> {
    let conn = conn(&state)?;
    queries::get_agent(&conn, &id)
}

#[command]
pub fn save_agent(state: State<'_, DbState>, mut agent: Agent) -> Result<Agent, ActaError> {
    let conn = conn(&state)?;
    if agent.id.is_empty() {
        agent.id = uuid();
        agent.created_at = now_ms();
    }
    agent.updated_at = now_ms();
    queries::upsert_agent(&conn, &agent)?;
    Ok(agent)
}

#[command]
pub fn delete_agent(state: State<'_, DbState>, id: String) -> Result<(), ActaError> {
    let conn = conn(&state)?;
    queries::delete_agent(&conn, &id)
}

// === Conversations ===

#[command]
pub fn list_conversations(state: State<'_, DbState>) -> Result<Vec<Conversation>, ActaError> {
    let conn = conn(&state)?;
    queries::list_conversations(&conn)
}

#[command]
pub fn get_conversation(state: State<'_, DbState>, id: String) -> Result<Option<Conversation>, ActaError> {
    let conn = conn(&state)?;
    queries::get_conversation(&conn, &id)
}

#[command]
pub fn save_conversation(state: State<'_, DbState>, mut conv: Conversation) -> Result<Conversation, ActaError> {
    let conn = conn(&state)?;
    if conv.id.is_empty() {
        conv.id = uuid();
        conv.created_at = now_ms();
    }
    conv.updated_at = now_ms();
    queries::upsert_conversation(&conn, &conv)?;
    Ok(conv)
}

#[command]
pub fn delete_conversation(state: State<'_, DbState>, id: String) -> Result<(), ActaError> {
    let conn = conn(&state)?;
    queries::delete_conversation(&conn, &id)
}

// === Messages ===

#[command]
pub fn list_messages(state: State<'_, DbState>, conversation_id: String) -> Result<Vec<Message>, ActaError> {
    let conn = conn(&state)?;
    queries::list_messages(&conn, &conversation_id)
}

#[command]
pub fn save_message(state: State<'_, DbState>, mut msg: Message) -> Result<Message, ActaError> {
    let conn = conn(&state)?;
    if msg.id.is_empty() {
        msg.id = uuid();
    }
    queries::upsert_message(&conn, &msg)?;
    Ok(msg)
}

#[command]
pub fn delete_message(state: State<'_, DbState>, id: String) -> Result<(), ActaError> {
    let conn = conn(&state)?;
    queries::delete_message(&conn, &id)
}

// === Tasks ===

#[command]
pub fn list_tasks(state: State<'_, DbState>) -> Result<Vec<KanbanTask>, ActaError> {
    let conn = conn(&state)?;
    queries::list_tasks(&conn)
}

#[command]
pub fn save_task(state: State<'_, DbState>, mut task: KanbanTask) -> Result<KanbanTask, ActaError> {
    let conn = conn(&state)?;
    if task.id.is_empty() {
        task.id = uuid();
        task.created_at = now_ms();
    }
    task.updated_at = now_ms();
    queries::upsert_task(&conn, &task)?;
    Ok(task)
}

#[command]
pub fn delete_task(state: State<'_, DbState>, id: String) -> Result<(), ActaError> {
    let conn = conn(&state)?;
    queries::delete_task(&conn, &id)
}

// === Workflows ===

#[command]
pub fn list_workflows(state: State<'_, DbState>) -> Result<Vec<WorkflowTemplate>, ActaError> {
    let conn = conn(&state)?;
    queries::list_workflows(&conn)
}

#[command]
pub fn save_workflow(state: State<'_, DbState>, mut wf: WorkflowTemplate) -> Result<WorkflowTemplate, ActaError> {
    let conn = conn(&state)?;
    if wf.id.is_empty() {
        wf.id = uuid();
        wf.created_at = now_ms();
    }
    queries::upsert_workflow(&conn, &wf)?;
    Ok(wf)
}

#[command]
pub fn delete_workflow(state: State<'_, DbState>, id: String) -> Result<(), ActaError> {
    let conn = conn(&state)?;
    queries::delete_workflow(&conn, &id)
}

// === Knowledge ===

#[command]
pub fn list_docs(state: State<'_, DbState>) -> Result<Vec<KnowledgeDoc>, ActaError> {
    let conn = conn(&state)?;
    queries::list_docs(&conn)
}

#[command]
pub fn save_doc(state: State<'_, DbState>, mut doc: KnowledgeDoc) -> Result<KnowledgeDoc, ActaError> {
    let conn = conn(&state)?;
    if doc.id.is_empty() {
        doc.id = uuid();
        doc.created_at = now_ms();
    }
    queries::upsert_doc(&conn, &doc)?;
    Ok(doc)
}

#[command]
pub fn delete_doc(state: State<'_, DbState>, id: String) -> Result<(), ActaError> {
    let conn = conn(&state)?;
    queries::delete_doc(&conn, &id)
}

#[command]
pub fn list_chunks(state: State<'_, DbState>, doc_id: String) -> Result<Vec<DocChunk>, ActaError> {
    let conn = conn(&state)?;
    queries::list_chunks(&conn, &doc_id)
}

#[command]
pub fn save_chunks(state: State<'_, DbState>, chunks: Vec<DocChunk>) -> Result<(), ActaError> {
    let conn = conn(&state)?;
    for chunk in chunks {
        queries::insert_chunk(&conn, &chunk)?;
    }
    Ok(())
}

// === Market Tools ===

#[command]
pub fn list_market_tools(state: State<'_, DbState>) -> Result<Vec<MarketTool>, ActaError> {
    let conn = conn(&state)?;
    queries::list_market_tools(&conn)
}

#[command]
pub fn save_market_tool(state: State<'_, DbState>, mut tool: MarketTool) -> Result<MarketTool, ActaError> {
    let conn = conn(&state)?;
    if tool.id.is_empty() {
        tool.id = uuid();
        tool.created_at = now_ms();
    }
    tool.updated_at = now_ms();
    queries::upsert_market_tool(&conn, &tool)?;
    Ok(tool)
}

// === Teams ===

#[command]
pub fn list_teams(state: State<'_, DbState>) -> Result<Vec<TeamTemplate>, ActaError> {
    let conn = conn(&state)?;
    queries::list_teams(&conn)
}

#[command]
pub fn save_team(state: State<'_, DbState>, mut team: TeamTemplate) -> Result<TeamTemplate, ActaError> {
    let conn = conn(&state)?;
    if team.id.is_empty() {
        team.id = uuid();
        team.created_at = now_ms();
    }
    team.updated_at = now_ms();
    queries::upsert_team(&conn, &team)?;
    Ok(team)
}

#[command]
pub fn delete_team(state: State<'_, DbState>, id: String) -> Result<(), ActaError> {
    let conn = conn(&state)?;
    queries::delete_team(&conn, &id)
}

// === Billing ===

#[command]
pub fn list_billing(state: State<'_, DbState>) -> Result<Vec<BillingRecord>, ActaError> {
    let conn = conn(&state)?;
    queries::list_billing(&conn)
}

#[command]
pub fn record_billing(state: State<'_, DbState>, mut record: BillingRecord) -> Result<BillingRecord, ActaError> {
    let conn = conn(&state)?;
    if record.id.is_empty() {
        record.id = uuid();
        record.created_at = now_ms();
    }
    queries::insert_billing(&conn, &record)?;
    Ok(record)
}

// === Notifications ===

#[command]
pub fn list_notifications(state: State<'_, DbState>) -> Result<Vec<Notification>, ActaError> {
    let conn = conn(&state)?;
    queries::list_notifications(&conn)
}

#[command]
pub fn save_notification(state: State<'_, DbState>, mut n: Notification) -> Result<Notification, ActaError> {
    let conn = conn(&state)?;
    if n.id.is_empty() {
        n.id = uuid();
    }
    queries::upsert_notification(&conn, &n)?;
    Ok(n)
}

#[command]
pub fn mark_notification_read(state: State<'_, DbState>, id: String) -> Result<(), ActaError> {
    let conn = conn(&state)?;
    queries::mark_notification_read(&conn, &id)
}

#[command]
pub fn delete_notification(state: State<'_, DbState>, id: String) -> Result<(), ActaError> {
    let conn = conn(&state)?;
    queries::delete_notification(&conn, &id)
}

// === API Keys (secure) ===

#[derive(Deserialize)]
pub struct ApiKeyPayload {
    pub id: Option<String>,
    pub provider: String,
    pub alias: Option<String>,
    pub secret: String,
}

#[command]
pub fn save_api_key(state: State<'_, DbState>, payload: ApiKeyPayload) -> Result<ApiKeyEntry, ActaError> {
    let conn = conn(&state)?;
    let id = payload.id.unwrap_or_else(uuid);
    let entry = ApiKeyEntry {
        id: id.clone(),
        provider: payload.provider,
        alias: payload.alias,
        created_at: now_ms(),
    };
    secure::set_secret(&secure::api_key_secret_id(&id), &payload.secret)?;
    queries::upsert_api_key(&conn, &entry)?;
    Ok(entry)
}

#[command]
pub fn list_api_keys(state: State<'_, DbState>) -> Result<Vec<ApiKeyEntry>, ActaError> {
    let conn = conn(&state)?;
    queries::list_api_keys(&conn)
}

#[command]
pub fn delete_api_key(state: State<'_, DbState>, id: String) -> Result<(), ActaError> {
    let conn = conn(&state)?;
    secure::delete_secret(&secure::api_key_secret_id(&id)).ok();
    queries::delete_api_key(&conn, &id)
}

#[command]
pub fn get_api_key_secret(state: State<'_, DbState>, id: String) -> Result<Option<String>, ActaError> {
    let _conn = conn(&state)?;
    secure::get_secret(&secure::api_key_secret_id(&id))
}

// === Webhooks ===

#[derive(Deserialize)]
pub struct WebhookPayload {
    pub id: Option<String>,
    pub name: String,
    pub url: String,
    pub secret: Option<String>,
    pub event_types: Vec<String>,
    pub active: bool,
}

#[command]
pub fn save_webhook(state: State<'_, DbState>, payload: WebhookPayload) -> Result<Webhook, ActaError> {
    let conn = conn(&state)?;
    let id = payload.id.unwrap_or_else(uuid);
    if let Some(secret) = payload.secret {
        secure::set_secret(&secure::webhook_secret_id(&id), &secret)?;
    }
    let hook = Webhook {
        id: id.clone(),
        name: payload.name,
        url: payload.url,
        event_types: payload.event_types,
        active: payload.active,
        created_at: now_ms(),
        updated_at: now_ms(),
    };
    queries::upsert_webhook(&conn, &hook)?;
    Ok(hook)
}

#[command]
pub fn list_webhooks(state: State<'_, DbState>) -> Result<Vec<Webhook>, ActaError> {
    let conn = conn(&state)?;
    queries::list_webhooks(&conn)
}

#[command]
pub fn delete_webhook(state: State<'_, DbState>, id: String) -> Result<(), ActaError> {
    let conn = conn(&state)?;
    secure::delete_secret(&secure::webhook_secret_id(&id)).ok();
    queries::delete_webhook(&conn, &id)
}

// === App info ===

#[command]
pub fn get_app_data_dir(app: AppHandle) -> Result<String, ActaError> {
    app.path()
        .app_data_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| ActaError::Config(format!("无法获取数据目录: {}", e)))
}

// === Shell ===

#[derive(Serialize)]
pub struct ShellResult {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: Option<i32>,
}

#[command]
pub async fn run_shell(command: String, args: Vec<String>) -> Result<ShellResult, ActaError> {
    let output = std::process::Command::new(&command)
        .args(&args)
        .output()
        .map_err(|e| ActaError::Io(e))?;
    Ok(ShellResult {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        exit_code: output.status.code(),
    })
}

// === LLM proxy ===

#[derive(Deserialize)]
pub struct LlmChatRequest {
    pub provider: String,
    pub model: String,
    pub api_key_id: String,
    pub messages: Vec<serde_json::Value>,
    pub temperature: Option<f32>,
    pub stream: bool,
}

#[derive(Serialize)]
pub struct LlmChatResponse {
    pub content: String,
    pub usage: Option<serde_json::Value>,
}

#[command]
pub async fn llm_chat(state: State<'_, DbState>, req: LlmChatRequest) -> Result<LlmChatResponse, ActaError> {
    let api_key = {
        let _conn = conn(&state)?;
        secure::get_secret(&secure::api_key_secret_id(&req.api_key_id))?
            .ok_or_else(|| ActaError::Llm("未找到 API Key".into()))?
    };

    let client = reqwest::Client::new();
    let url = match req.provider.as_str() {
        "openai" => "https://api.openai.com/v1/chat/completions",
        "anthropic" => "https://api.anthropic.com/v1/messages",
        _ => return Err(ActaError::Llm(format!("不支持的 provider: {}", req.provider))),
    };

    if req.provider == "anthropic" {
        let body = serde_json::json!({
            "model": req.model,
            "messages": req.messages,
            "max_tokens": 4096,
            "temperature": req.temperature.unwrap_or(0.7),
        });
        let res = client
            .post(url)
            .header("x-api-key", api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| ActaError::Llm(format!("请求失败: {}", e)))?;
        let status = res.status();
        let json: serde_json::Value = res.json().await.map_err(|e| ActaError::Llm(format!("解析失败: {}", e)))?;
        if !status.is_success() {
            return Err(ActaError::Llm(format!("LLM 错误: {}", json)));
        }
        let content = json["content"][0]["text"].as_str().unwrap_or("").to_string();
        let usage = json["usage"].clone();
        Ok(LlmChatResponse { content, usage: Some(usage) })
    } else {
        let body = serde_json::json!({
            "model": req.model,
            "messages": req.messages,
            "temperature": req.temperature.unwrap_or(0.7),
        });
        let res = client
            .post(url)
            .bearer_auth(api_key)
            .json(&body)
            .send()
            .await
            .map_err(|e| ActaError::Llm(format!("请求失败: {}", e)))?;
        let status = res.status();
        let json: serde_json::Value = res.json().await.map_err(|e| ActaError::Llm(format!("解析失败: {}", e)))?;
        if !status.is_success() {
            return Err(ActaError::Llm(format!("LLM 错误: {}", json)));
        }
        let content = json["choices"][0]["message"]["content"].as_str().unwrap_or("").to_string();
        let usage = json["usage"].clone();
        Ok(LlmChatResponse { content, usage: Some(usage) })
    }
}

// === Document parsing ===

#[derive(Serialize)]
pub struct ParsedDoc {
    pub text: String,
    pub pages: usize,
}

#[command]
pub fn parse_document(path: String) -> Result<ParsedDoc, ActaError> {
    let ext = std::path::Path::new(&path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    match ext.as_str() {
        "pdf" => {
            let text = pdf_extract::extract_text(&path)
                .map_err(|e| ActaError::Io(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))?;
            let pages = text.lines().count();
            Ok(ParsedDoc { text, pages })
        }
        "txt" | "md" => {
            let text = std::fs::read_to_string(&path)?;
            Ok(ParsedDoc { text, pages: 1 })
        }
        _ => Err(ActaError::BadRequest(format!("暂不支持的文件格式: {}", ext))),
    }
}
