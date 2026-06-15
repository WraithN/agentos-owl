use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ErrorPayload {
    pub message: String,
}

#[derive(Debug, thiserror::Error)]
pub enum ActaError {
    #[error("数据库错误: {0}")]
    Db(String),
    #[error("配置错误: {0}")]
    Config(String),
    #[error("认证错误: {0}")]
    Auth(String),
    #[error("未找到: {0}")]
    NotFound(String),
    #[error("参数错误: {0}")]
    BadRequest(String),
    #[error("安全存储错误: {0}")]
    Secure(String),
    #[error("LLM 错误: {0}")]
    Llm(String),
    #[error("IO 错误: {0}")]
    Io(#[from] std::io::Error),
    #[error("JSON 错误: {0}")]
    Json(#[from] serde_json::Error),
    #[error("SQLite 错误: {0}")]
    Rusqlite(#[from] rusqlite::Error),
    #[error("未知错误: {0}")]
    Unknown(String),
}

impl serde::Serialize for ActaError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

impl From<ActaError> for ErrorPayload {
    fn from(e: ActaError) -> Self {
        Self { message: e.to_string() }
    }
}
