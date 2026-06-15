pub mod commands;
pub mod db;
pub mod error;
pub mod secure;

use db::{init_db, seed::seed_if_empty, DbState};
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            let conn = init_db(app.handle())?;
            seed_if_empty(&conn)?;
            app.manage(DbState(Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::sign_in,
            commands::sign_up,
            commands::get_profile,
            commands::get_setting,
            commands::set_setting,
            commands::list_settings,
            commands::list_agents,
            commands::get_agent,
            commands::save_agent,
            commands::delete_agent,
            commands::list_conversations,
            commands::get_conversation,
            commands::save_conversation,
            commands::delete_conversation,
            commands::list_messages,
            commands::save_message,
            commands::delete_message,
            commands::list_tasks,
            commands::save_task,
            commands::delete_task,
            commands::list_workflows,
            commands::save_workflow,
            commands::delete_workflow,
            commands::list_docs,
            commands::save_doc,
            commands::delete_doc,
            commands::list_chunks,
            commands::save_chunks,
            commands::list_market_tools,
            commands::save_market_tool,
            commands::list_teams,
            commands::save_team,
            commands::delete_team,
            commands::list_billing,
            commands::record_billing,
            commands::list_notifications,
            commands::save_notification,
            commands::mark_notification_read,
            commands::delete_notification,
            commands::save_api_key,
            commands::list_api_keys,
            commands::delete_api_key,
            commands::get_api_key_secret,
            commands::save_webhook,
            commands::list_webhooks,
            commands::delete_webhook,
            commands::get_app_data_dir,
            commands::run_shell,
            commands::llm_chat,
            commands::parse_document,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
