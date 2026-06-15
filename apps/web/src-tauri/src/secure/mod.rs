use keyring::Entry;

use crate::error::ActaError;

const APP_SERVICE: &str = "com.owl.os";

fn entry(key: &str) -> Result<Entry, ActaError> {
    Entry::new(APP_SERVICE, key).map_err(|e| ActaError::Secure(format!("无法创建密钥条目: {}", e)))
}

pub fn set_secret(key: &str, value: &str) -> Result<(), ActaError> {
    entry(key)?.set_password(value).map_err(|e| ActaError::Secure(format!("保存密钥失败: {}", e)))
}

pub fn get_secret(key: &str) -> Result<Option<String>, ActaError> {
    match entry(key)?.get_password() {
        Ok(v) => Ok(Some(v)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(ActaError::Secure(format!("读取密钥失败: {}", e))),
    }
}

pub fn delete_secret(key: &str) -> Result<(), ActaError> {
    entry(key)?.delete_credential().map_err(|e| ActaError::Secure(format!("删除密钥失败: {}", e)))
}

pub fn api_key_secret_id(key_id: &str) -> String {
    format!("api_key/{}", key_id)
}

pub fn webhook_secret_id(webhook_id: &str) -> String {
    format!("webhook/{}", webhook_id)
}
