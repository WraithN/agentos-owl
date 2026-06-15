use rusqlite::Connection;

use crate::db::models::*;
use crate::db::queries;
use crate::error::ActaError;

fn now() -> i64 {
    chrono::Utc::now().timestamp_millis()
}

fn days_ago(days: i64) -> i64 {
    now() - days * 24 * 60 * 60 * 1000
}

pub fn seed_if_empty(conn: &Connection) -> Result<(), ActaError> {
    let users: i64 = conn.query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))?;
    if users == 0 {
        seed_default_user(conn)?;
    }

    let agents: i64 = conn.query_row("SELECT COUNT(*) FROM agents", [], |row| row.get(0))?;
    if agents == 0 {
        seed_agents(conn)?;
    }

    let convs: i64 = conn.query_row("SELECT COUNT(*) FROM conversations", [], |row| row.get(0))?;
    if convs == 0 {
        seed_conversations(conn)?;
    }

    let tasks: i64 = conn.query_row("SELECT COUNT(*) FROM kanban_tasks", [], |row| row.get(0))?;
    if tasks == 0 {
        seed_tasks(conn)?;
    }

    let wfs: i64 = conn.query_row("SELECT COUNT(*) FROM workflow_templates", [], |row| row.get(0))?;
    if wfs == 0 {
        seed_workflows(conn)?;
    }

    let docs: i64 = conn.query_row("SELECT COUNT(*) FROM knowledge_docs", [], |row| row.get(0))?;
    if docs == 0 {
        seed_docs(conn)?;
    }

    let tools: i64 = conn.query_row("SELECT COUNT(*) FROM market_tools", [], |row| row.get(0))?;
    if tools == 0 {
        seed_market_tools(conn)?;
    }

    let teams: i64 = conn.query_row("SELECT COUNT(*) FROM team_templates", [], |row| row.get(0))?;
    if teams == 0 {
        seed_teams(conn)?;
    }

    let billing: i64 = conn.query_row("SELECT COUNT(*) FROM billing_records", [], |row| row.get(0))?;
    if billing == 0 {
        seed_billing(conn)?;
    }

    let notifs: i64 = conn.query_row("SELECT COUNT(*) FROM notifications", [], |row| row.get(0))?;
    if notifs == 0 {
        seed_notifications(conn)?;
    }

    Ok(())
}

fn seed_default_user(conn: &Connection) -> Result<(), ActaError> {
    let ph = argon_hash("admin")?;
    queries::create_user(
        conn,
        &User {
            id: "usr-default".into(),
            username: "admin".into(),
            password_hash: ph,
            display_name: Some("管理员".into()),
            avatar: None,
            created_at: now(),
            updated_at: now(),
        },
    )?;
    Ok(())
}

fn argon_hash(password: &str) -> Result<String, ActaError> {
    use argon2::{password_hash::SaltString, Argon2, PasswordHasher};
    use rand::rngs::OsRng;
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    argon2
        .hash_password(password.as_bytes(), &salt)
        .map(|h| h.to_string())
        .map_err(|e| ActaError::Auth(format!("密码哈希失败: {}", e)))
}

fn seed_agents(conn: &Connection) -> Result<(), ActaError> {
    let agents = vec![
        Agent {
            id: "aria".into(),
            name: "Aria".into(),
            role: "aria".into(),
            description: "协调员 · 负责任务拆解与团队调度".into(),
            avatar: "A".into(),
            color: "#a855f7".into(),
            bg_color: "bg-purple-500/20".into(),
            text_color: "text-purple-400".into(),
            border_color: "border-purple-500/40".into(),
            status: "working".into(),
            model: "GPT-4o".into(),
            tools: vec!["web-search".into(), "task-manager".into(), "code-runner".into()],
            capabilities: vec!["任务协调".into(), "自然语言理解".into(), "多Agent调度".into()],
            trigger_rule: "当任务涉及跨领域协作或需要多步骤规划时自动参与".into(),
            enabled: true,
            created_at: now(),
            updated_at: now(),
        },
        Agent {
            id: "coder".into(),
            name: "Coder".into(),
            role: "coder".into(),
            description: "代码专家 · 全栈开发与代码审查".into(),
            avatar: "C".into(),
            color: "#00f2c3".into(),
            bg_color: "bg-cyan-500/20".into(),
            text_color: "text-cyan-400".into(),
            border_color: "border-cyan-500/40".into(),
            status: "working".into(),
            model: "Claude 3.5 Sonnet".into(),
            tools: vec!["code-runner".into(), "github".into(), "terminal".into()],
            capabilities: vec!["代码开发".into(), "代码审查".into(), "架构设计".into(), "调试".into()],
            trigger_rule: "当任务涉及编写、调试或审查代码时自动参与".into(),
            enabled: true,
            created_at: now(),
            updated_at: now(),
        },
        Agent {
            id: "muse".into(),
            name: "Muse".into(),
            role: "muse".into(),
            description: "创意设计师 · UI/UX 与品牌内容".into(),
            avatar: "M".into(),
            color: "#38bdf8".into(),
            bg_color: "bg-blue-500/20".into(),
            text_color: "text-blue-400".into(),
            border_color: "border-blue-500/40".into(),
            status: "idle".into(),
            model: "GPT-4o".into(),
            tools: vec!["figma-plugin".into(), "image-gen".into(), "web-search".into()],
            capabilities: vec!["UI/UX 设计".into(), "品牌设计".into(), "文案创作".into(), "视觉分析".into()],
            trigger_rule: "当任务涉及设计、视觉创意或品牌内容时自动参与".into(),
            enabled: true,
            created_at: now(),
            updated_at: now(),
        },
        Agent {
            id: "analyst".into(),
            name: "Analyst".into(),
            role: "analyst".into(),
            description: "数据分析师 · 数据洞察与商业决策".into(),
            avatar: "An".into(),
            color: "#f59e0b".into(),
            bg_color: "bg-amber-500/20".into(),
            text_color: "text-amber-400".into(),
            border_color: "border-amber-500/40".into(),
            status: "working".into(),
            model: "GPT-4o".into(),
            tools: vec!["python-runner".into(), "sql-query".into(), "chart-gen".into()],
            capabilities: vec!["数据分析".into(), "可视化".into(), "统计建模".into(), "商业智能".into()],
            trigger_rule: "当任务涉及数据处理、统计分析或商业报告时自动参与".into(),
            enabled: true,
            created_at: now(),
            updated_at: now(),
        },
        Agent {
            id: "writer".into(),
            name: "Writer".into(),
            role: "writer".into(),
            description: "资深文案 · 各类文档撰写与内容润色".into(),
            avatar: "W".into(),
            color: "#f43f5e".into(),
            bg_color: "bg-rose-500/20".into(),
            text_color: "text-rose-400".into(),
            border_color: "border-rose-500/40".into(),
            status: "idle".into(),
            model: "Claude 3.5 Sonnet".into(),
            tools: vec!["web-search".into(), "file-reader".into()],
            capabilities: vec!["文案撰写".into(), "内容润色".into(), "翻译".into(), "总结".into()],
            trigger_rule: "当任务涉及写作、翻译或内容创作时自动参与".into(),
            enabled: true,
            created_at: now(),
            updated_at: now(),
        },
        Agent {
            id: "pm".into(),
            name: "PM".into(),
            role: "pm".into(),
            description: "产品经理 · 需求分析与项目规划".into(),
            avatar: "P".into(),
            color: "#8b5cf6".into(),
            bg_color: "bg-violet-500/20".into(),
            text_color: "text-violet-400".into(),
            border_color: "border-violet-500/40".into(),
            status: "working".into(),
            model: "GPT-4o".into(),
            tools: vec!["web-search".into(), "task-manager".into()],
            capabilities: vec!["需求分析".into(), "PRD撰写".into(), "项目规划".into(), "竞品调研".into()],
            trigger_rule: "当任务涉及产品设计、需求分析或项目规划时自动参与".into(),
            enabled: true,
            created_at: now(),
            updated_at: now(),
        },
        Agent {
            id: "ops".into(),
            name: "Ops".into(),
            role: "ops".into(),
            description: "运维专家 · CI/CD 与基础设施管理".into(),
            avatar: "O".into(),
            color: "#10b981".into(),
            bg_color: "bg-emerald-500/20".into(),
            text_color: "text-emerald-400".into(),
            border_color: "border-emerald-500/40".into(),
            status: "idle".into(),
            model: "GPT-4o".into(),
            tools: vec!["terminal".into(), "github".into(), "code-runner".into()],
            capabilities: vec!["CI/CD配置".into(), "Docker".into(), "K8s".into(), "监控告警".into()],
            trigger_rule: "当任务涉及部署、运维或基础设施时自动参与".into(),
            enabled: false,
            created_at: now(),
            updated_at: now(),
        },
        Agent {
            id: "designer".into(),
            name: "Designer".into(),
            role: "designer".into(),
            description: "资深设计师 · UI/UX 与视觉规范".into(),
            avatar: "D".into(),
            color: "#f59e0b".into(),
            bg_color: "bg-amber-500/20".into(),
            text_color: "text-amber-400".into(),
            border_color: "border-amber-500/40".into(),
            status: "idle".into(),
            model: "Claude 3.5 Sonnet".into(),
            tools: vec!["figma-plugin".into(), "image-gen".into()],
            capabilities: vec!["UI设计".into(), "UX优化".into(), "设计规范".into(), "原型评审".into()],
            trigger_rule: "当任务涉及界面设计、视觉规范或用户体验时自动参与".into(),
            enabled: true,
            created_at: now(),
            updated_at: now(),
        },
    ];
    for a in agents {
        queries::upsert_agent(conn, &a)?;
    }
    Ok(())
}

fn seed_conversations(conn: &Connection) -> Result<(), ActaError> {
    let convs = vec![
        Conversation {
            id: "conv-1".into(),
            title: "用户增长方案设计".into(),
            mode: "squad".into(),
            last_message: "Analyst: 已完成 DAU 数据分析...".into(),
            last_time: now() - 1000 * 60 * 8,
            unread: 3,
            agent_ids: vec!["aria".into(), "coder".into(), "muse".into(), "analyst".into()],
            pinned: true,
            created_at: now() - 1000 * 60 * 60 * 24,
            updated_at: now() - 1000 * 60 * 8,
        },
        Conversation {
            id: "conv-2".into(),
            title: "每日竞品监控".into(),
            mode: "auto".into(),
            last_message: "⚡ 正在执行步骤 3/4...".into(),
            last_time: now() - 1000 * 60 * 23,
            unread: 1,
            agent_ids: vec!["analyst".into()],
            pinned: false,
            created_at: now() - 1000 * 60 * 60 * 24,
            updated_at: now() - 1000 * 60 * 23,
        },
        Conversation {
            id: "conv-3".into(),
            title: "帮我写一个 React 拖拽组件".into(),
            mode: "single".into(),
            last_message: "Aria: 这是一个基于 @dnd-kit 的完整拖拽实现...".into(),
            last_time: now() - 1000 * 60 * 60 * 2,
            unread: 0,
            agent_ids: vec!["aria".into()],
            pinned: false,
            created_at: now() - 1000 * 60 * 60 * 3,
            updated_at: now() - 1000 * 60 * 60 * 2,
        },
        Conversation {
            id: "conv-4".into(),
            title: "分析 Q2 销售数据".into(),
            mode: "single".into(),
            last_message: "Q2 整体收入同比增长 18.3%...".into(),
            last_time: now() - 1000 * 60 * 60 * 26,
            unread: 0,
            agent_ids: vec!["analyst".into()],
            pinned: false,
            created_at: now() - 1000 * 60 * 60 * 30,
            updated_at: now() - 1000 * 60 * 60 * 26,
        },
    ];
    for c in convs {
        queries::upsert_conversation(conn, &c)?;
    }

    // Seed messages for conv-1
    let msgs = vec![
        Message {
            id: "msg-1".into(),
            conversation_id: "conv-1".into(),
            msg_type: "user".into(),
            content_type: "text".into(),
            status: "done".into(),
            content: "帮我设计用户增长方案，需要包含数据分析、工程实现和设计规范，目标是 Q3 DAU 提升 30%。".into(),
            agent_id: None,
            timestamp: now() - 1000 * 60 * 40,
            tool_call: None,
            cot_steps: None,
            code_block: None,
            image_url: None,
            image_caption: None,
            card_data: None,
            mentions: None,
            attachments: None,
            meta: None,
        },
        Message {
            id: "msg-sys-1".into(),
            conversation_id: "conv-1".into(),
            msg_type: "system".into(),
            content_type: "text".into(),
            status: "done".into(),
            content: "Aria 已召集 Analyst、Coder、Muse 组成「用户增长攻坚队」...".into(),
            agent_id: None,
            timestamp: now() - 1000 * 60 * 39,
            tool_call: None,
            cot_steps: None,
            code_block: None,
            image_url: None,
            image_caption: None,
            card_data: None,
            mentions: None,
            attachments: None,
            meta: None,
        },
    ];
    for m in msgs {
        queries::upsert_message(conn, &m)?;
    }
    Ok(())
}

fn seed_tasks(conn: &Connection) -> Result<(), ActaError> {
    let tasks = vec![
        KanbanTask { id: "task-1".into(), title: "用户漏斗数据分析报告".into(), assignee_id: "analyst".into(), status: "done".into(), priority: "P0".into(), due_date: Some("2026-06-10".into()), description: None, created_at: days_ago(14), updated_at: days_ago(5) },
        KanbanTask { id: "task-2".into(), title: "竞品 UI 调研报告".into(), assignee_id: "muse".into(), status: "done".into(), priority: "P1".into(), due_date: Some("2026-06-11".into()), description: None, created_at: days_ago(14), updated_at: days_ago(4) },
        KanbanTask { id: "task-3".into(), title: "手机验证优化方案".into(), assignee_id: "coder".into(), status: "in-progress".into(), priority: "P0".into(), due_date: Some("2026-06-14".into()), description: None, created_at: days_ago(10), updated_at: days_ago(1) },
        KanbanTask { id: "task-4".into(), title: "渐进式注册原型设计".into(), assignee_id: "muse".into(), status: "in-progress".into(), priority: "P1".into(), due_date: Some("2026-06-18".into()), description: None, created_at: days_ago(8), updated_at: days_ago(2) },
        KanbanTask { id: "task-5".into(), title: "项目总结文档".into(), assignee_id: "aria".into(), status: "review".into(), priority: "P1".into(), due_date: Some("2026-06-20".into()), description: None, created_at: days_ago(7), updated_at: days_ago(1) },
        KanbanTask { id: "task-6".into(), title: "Push 通知策略优化".into(), assignee_id: "analyst".into(), status: "todo".into(), priority: "P2".into(), due_date: Some("2026-07-05".into()), description: None, created_at: days_ago(3), updated_at: days_ago(3) },
    ];
    for t in tasks {
        queries::upsert_task(conn, &t)?;
    }
    Ok(())
}

fn seed_workflows(conn: &Connection) -> Result<(), ActaError> {
    let nodes = vec![
        serde_json::json!({"id":"node-1","name":"定时触发","type":"trigger","status":"done","duration":12,"output":"触发时间: 2026-06-12 09:00:00"}),
        serde_json::json!({"id":"node-2","name":"抓取竞品页面","type":"tool","status":"done","duration":8420,"input":"目标站点...","output":"成功抓取 3 个站点..."}),
        serde_json::json!({"id":"node-3","name":"AI 对比分析","type":"llm","status":"running","input":"分析维度：定价/功能/UX/营销文案"}),
        serde_json::json!({"id":"node-4","name":"生成并推送报告","type":"end","status":"pending"}),
    ];
    queries::upsert_workflow(conn, &WorkflowTemplate {
        id: "wf-1".into(),
        name: "每日竞品监控".into(),
        description: "每天 9:00 自动抓取竞品动态，AI 分析后推送摘要报告".into(),
        nodes,
        created_at: days_ago(45),
        last_run: Some(now() - 1000 * 60 * 23),
    })?;
    Ok(())
}

fn seed_docs(conn: &Connection) -> Result<(), ActaError> {
    let docs = vec![
        KnowledgeDoc { id: "doc-1".into(), name: "Q2 用户增长策略报告.pdf".into(), size: "2.4 MB".into(), status: "ready".into(), error_msg: None, chunks: 48, created_at: days_ago(14), doc_type: "pdf".into(), file_path: None },
        KnowledgeDoc { id: "doc-2".into(), name: "产品技术架构文档.md".into(), size: "156 KB".into(), status: "ready".into(), error_msg: None, chunks: 23, created_at: days_ago(18), doc_type: "md".into(), file_path: None },
        KnowledgeDoc { id: "doc-3".into(), name: "竞品分析数据集.csv".into(), size: "890 KB".into(), status: "processing".into(), error_msg: None, chunks: 0, created_at: days_ago(3), doc_type: "csv".into(), file_path: None },
        KnowledgeDoc { id: "doc-4".into(), name: "用户调研访谈记录.docx".into(), size: "3.1 MB".into(), status: "ready".into(), error_msg: None, chunks: 67, created_at: days_ago(30), doc_type: "docx".into(), file_path: None },
        KnowledgeDoc { id: "doc-5".into(), name: "2025 年度财务报告.pdf".into(), size: "8.7 MB".into(), status: "error".into(), error_msg: Some("文件解析失败：PDF 版本不兼容...".into()), chunks: 0, created_at: days_ago(5), doc_type: "pdf".into(), file_path: None },
    ];
    for d in docs {
        queries::upsert_doc(conn, &d)?;
    }

    let chunks = vec![
        DocChunk { id: "chunk-1".into(), doc_id: "doc-1".into(), idx: 0, content: "## 用户增长现状分析\n\nQ2 整体 DAU 为 124,800...".into(), tokens: 128 },
        DocChunk { id: "chunk-2".into(), doc_id: "doc-1".into(), idx: 1, content: "## 关键漏斗分析\n\n注册流程分析显示...".into(), tokens: 142 },
        DocChunk { id: "chunk-3".into(), doc_id: "doc-1".into(), idx: 2, content: "## 增长实验建议\n\n基于数据分析...".into(), tokens: 168 },
    ];
    for c in chunks {
        queries::insert_chunk(conn, &c)?;
    }
    Ok(())
}

fn seed_market_tools(conn: &Connection) -> Result<(), ActaError> {
    let tools = vec![
        MarketTool { id: "tool-1".into(), name: "Web 搜索".into(), description: "实时检索全网信息...".into(), category: "搜索".into(), tool_type: "mcp".into(), icon: "Search".into(), icon_bg: "from-cyan-500/30 to-blue-500/30".into(), version: "2.1.0".into(), developer: "OwlOS 官方".into(), rating: 4.9, installs: 128500, tags: vec!["已安装".into(), "官方".into()], installed: true, needs_api_key: false, official: true, created_at: days_ago(90), updated_at: days_ago(10) },
        MarketTool { id: "tool-2".into(), name: "Python 运行器".into(), description: "沙箱环境中执行 Python 代码...".into(), category: "代码".into(), tool_type: "cli".into(), icon: "Code2".into(), icon_bg: "from-emerald-500/30 to-cyan-500/30".into(), version: "1.5.2".into(), developer: "OwlOS 官方".into(), rating: 4.8, installs: 98200, tags: vec!["已安装".into(), "官方".into()], installed: true, needs_api_key: false, official: true, created_at: days_ago(90), updated_at: days_ago(10) },
        MarketTool { id: "tool-3".into(), name: "GitHub 集成".into(), description: "读写 GitHub 仓库...".into(), category: "代码".into(), tool_type: "mcp".into(), icon: "GitBranch".into(), icon_bg: "from-purple-500/30 to-pink-500/30".into(), version: "3.0.1".into(), developer: "OwlOS 官方".into(), rating: 4.7, installs: 76300, tags: vec!["已安装".into(), "官方".into(), "需 API Key".into()], installed: true, needs_api_key: true, official: true, created_at: days_ago(90), updated_at: days_ago(10) },
        MarketTool { id: "tool-4".into(), name: "图表生成".into(), description: "根据数据自动生成多种可视化图表...".into(), category: "数据分析".into(), tool_type: "skill".into(), icon: "BarChart3".into(), icon_bg: "from-amber-500/30 to-orange-500/30".into(), version: "1.2.0".into(), developer: "OwlOS 官方".into(), rating: 4.6, installs: 54100, tags: vec!["已安装".into(), "官方".into()], installed: true, needs_api_key: false, official: true, created_at: days_ago(90), updated_at: days_ago(10) },
        MarketTool { id: "tool-5".into(), name: "Slack 通知".into(), description: "向 Slack 频道发送消息...".into(), category: "通信".into(), tool_type: "mcp".into(), icon: "MessageSquare".into(), icon_bg: "from-rose-500/30 to-pink-500/30".into(), version: "2.0.4".into(), developer: "Slack Inc.".into(), rating: 4.5, installs: 43200, tags: vec!["需 API Key".into()], installed: false, needs_api_key: true, official: false, created_at: days_ago(90), updated_at: days_ago(10) },
        MarketTool { id: "tool-6".into(), name: "PDF 解析器".into(), description: "高精度解析 PDF 文档内容...".into(), category: "文档".into(), tool_type: "skill".into(), icon: "FileText".into(), icon_bg: "from-red-500/30 to-rose-500/30".into(), version: "1.8.0".into(), developer: "DocAI Labs".into(), rating: 4.4, installs: 31800, tags: vec![], installed: false, needs_api_key: false, official: false, created_at: days_ago(90), updated_at: days_ago(10) },
        MarketTool { id: "tool-7".into(), name: "SQL 查询".into(), description: "连接主流数据库执行 SQL...".into(), category: "数据分析".into(), tool_type: "cli".into(), icon: "Database".into(), icon_bg: "from-blue-500/30 to-indigo-500/30".into(), version: "2.3.1".into(), developer: "DataFlow".into(), rating: 4.7, installs: 28900, tags: vec!["需 API Key".into()], installed: false, needs_api_key: true, official: false, created_at: days_ago(90), updated_at: days_ago(10) },
        MarketTool { id: "tool-8".into(), name: "邮件发送".into(), description: "使用 SMTP 或 SendGrid 发送邮件...".into(), category: "通信".into(), tool_type: "skill".into(), icon: "Mail".into(), icon_bg: "from-teal-500/30 to-cyan-500/30".into(), version: "1.1.2".into(), developer: "MailForge".into(), rating: 4.3, installs: 22400, tags: vec!["需 API Key".into()], installed: false, needs_api_key: true, official: false, created_at: days_ago(90), updated_at: days_ago(10) },
        MarketTool { id: "tool-9".into(), name: "Shell 执行器".into(), description: "在隔离环境中执行 Shell 脚本...".into(), category: "通用".into(), tool_type: "cli".into(), icon: "Code2".into(), icon_bg: "from-slate-500/30 to-gray-500/30".into(), version: "1.0.3".into(), developer: "OwlOS 官方".into(), rating: 4.5, installs: 19800, tags: vec!["官方".into()], installed: false, needs_api_key: false, official: true, created_at: days_ago(90), updated_at: days_ago(10) },
        MarketTool { id: "tool-10".into(), name: "Browser Use".into(), description: "通过 MCP 协议控制浏览器...".into(), category: "通用".into(), tool_type: "mcp".into(), icon: "Shield".into(), icon_bg: "from-violet-500/30 to-indigo-500/30".into(), version: "0.9.1".into(), developer: "BrowserAI".into(), rating: 4.6, installs: 17300, tags: vec![], installed: false, needs_api_key: false, official: false, created_at: days_ago(90), updated_at: days_ago(10) },
        MarketTool { id: "tool-11".into(), name: "知识召回".into(), description: "从本地知识库中语义检索相关片段...".into(), category: "搜索".into(), tool_type: "skill".into(), icon: "Search".into(), icon_bg: "from-cyan-500/30 to-emerald-500/30".into(), version: "2.0.0".into(), developer: "OwlOS 官方".into(), rating: 4.8, installs: 15600, tags: vec!["官方".into()], installed: false, needs_api_key: false, official: true, created_at: days_ago(90), updated_at: days_ago(10) },
    ];
    for t in tools {
        queries::upsert_market_tool(conn, &t)?;
    }
    Ok(())
}

fn seed_teams(conn: &Connection) -> Result<(), ActaError> {
    let teams = vec![
        TeamTemplate { id: "team-1".into(), name: "用户增长攻坚队".into(), description: "处理用户增长相关的数据分析、工程优化与设计改版".into(), member_ids: vec!["aria".into(), "analyst".into(), "coder".into(), "muse".into()], coordinator_id: "aria".into(), trigger_rule: "当用户提到增长、留存、DAU、转化率等关键词时自动召集".into(), mode: "parallel".into(), enabled: true, created_at: days_ago(60), updated_at: days_ago(10) },
        TeamTemplate { id: "team-2".into(), name: "技术方案评审组".into(), description: "对复杂技术方案进行多维度评审".into(), member_ids: vec!["aria".into(), "coder".into(), "analyst".into()], coordinator_id: "coder".into(), trigger_rule: "当用户提到技术方案、架构设计、代码评审时自动召集".into(), mode: "sequential".into(), enabled: false, created_at: days_ago(60), updated_at: days_ago(10) },
        TeamTemplate { id: "team-3".into(), name: "内容创作工作室".into(), description: "负责文案撰写、品牌内容与设计素材产出".into(), member_ids: vec!["muse".into(), "writer".into(), "designer".into()], coordinator_id: "muse".into(), trigger_rule: "当用户提到文案、品牌、海报、内容营销时自动召集".into(), mode: "parallel".into(), enabled: true, created_at: days_ago(60), updated_at: days_ago(10) },
        TeamTemplate { id: "team-4".into(), name: "产品开发全栈组".into(), description: "端到端产品交付：需求 → 设计 → 开发 → 部署".into(), member_ids: vec!["pm".into(), "designer".into(), "coder".into(), "ops".into()], coordinator_id: "pm".into(), trigger_rule: "当用户提到产品、上线、迭代、全栈时自动召集".into(), mode: "pipeline".into(), enabled: true, created_at: days_ago(60), updated_at: days_ago(10) },
        TeamTemplate { id: "team-5".into(), name: "运维保障小分队".into(), description: "监控、告警、故障排查与自动化运维".into(), member_ids: vec!["ops".into(), "coder".into(), "analyst".into()], coordinator_id: "ops".into(), trigger_rule: "当用户提到故障、告警、监控、部署时自动召集".into(), mode: "supervisor".into(), enabled: false, created_at: days_ago(60), updated_at: days_ago(10) },
        TeamTemplate { id: "team-6".into(), name: "数据分析洞察组".into(), description: "多维度数据分析、报告撰写与商业洞察".into(), member_ids: vec!["analyst".into(), "writer".into(), "pm".into()], coordinator_id: "analyst".into(), trigger_rule: "当用户提到报表、分析、洞察、KPI时自动召集".into(), mode: "brainstorming".into(), enabled: true, created_at: days_ago(60), updated_at: days_ago(10) },
        TeamTemplate { id: "team-7".into(), name: "创意头脑风暴群".into(), description: "快速创意发散，收集想法并筛选最优方案".into(), member_ids: vec!["muse".into(), "writer".into(), "pm".into(), "designer".into()], coordinator_id: "".into(), trigger_rule: "当用户提到创意、头脑风暴、方案、灵感时自动召集".into(), mode: "swarm".into(), enabled: false, created_at: days_ago(60), updated_at: days_ago(10) },
        TeamTemplate { id: "team-8".into(), name: "代码质量监控站".into(), description: "代码审查、性能分析与重构建议".into(), member_ids: vec!["coder".into(), "ops".into(), "aria".into()], coordinator_id: "coder".into(), trigger_rule: "当用户提到性能、重构、Bug、质量时自动召集".into(), mode: "pipeline".into(), enabled: true, created_at: days_ago(60), updated_at: days_ago(10) },
    ];
    for t in teams {
        queries::upsert_team(conn, &t)?;
    }
    Ok(())
}

fn seed_billing(conn: &Connection) -> Result<(), ActaError> {
    let records = vec![
        BillingRecord { id: "b-1".into(), record_date: "06-06".into(), tokens: 18240, cost: 1.28, model: "GPT-4o".into(), created_at: days_ago(9) },
        BillingRecord { id: "b-2".into(), record_date: "06-07".into(), tokens: 24560, cost: 1.92, model: "GPT-4o".into(), created_at: days_ago(8) },
        BillingRecord { id: "b-3".into(), record_date: "06-08".into(), tokens: 12380, cost: 0.87, model: "Claude 3.5".into(), created_at: days_ago(7) },
        BillingRecord { id: "b-4".into(), record_date: "06-09".into(), tokens: 31200, cost: 2.45, model: "GPT-4o".into(), created_at: days_ago(6) },
        BillingRecord { id: "b-5".into(), record_date: "06-10".into(), tokens: 28900, cost: 2.13, model: "GPT-4o".into(), created_at: days_ago(5) },
        BillingRecord { id: "b-6".into(), record_date: "06-11".into(), tokens: 19650, cost: 1.47, model: "Claude 3.5".into(), created_at: days_ago(4) },
        BillingRecord { id: "b-7".into(), record_date: "06-12".into(), tokens: 16800, cost: 1.40, model: "GPT-4o".into(), created_at: days_ago(3) },
    ];
    for r in records {
        queries::insert_billing(conn, &r)?;
    }
    Ok(())
}

fn seed_notifications(conn: &Connection) -> Result<(), ActaError> {
    let notifs = vec![
        Notification { id: "notif-1".into(), title: "任务完成".into(), content: "「用户增长方案」项目看板任务「竞品 UI 调研报告」已完成".into(), notif_type: "success".into(), read: false, timestamp: now() - 1000 * 60 * 5 },
        Notification { id: "notif-2".into(), title: "需要审批".into(), content: "Aria 已提交用户增长方案优先级确认，请审阅并通过".into(), notif_type: "warning".into(), read: false, timestamp: now() - 1000 * 60 * 10 },
        Notification { id: "notif-3".into(), title: "工作流执行中".into(), content: "「每日竞品监控」工作流正在执行步骤 3/4".into(), notif_type: "info".into(), read: true, timestamp: now() - 1000 * 60 * 23 },
        Notification { id: "notif-4".into(), title: "文档上传失败".into(), content: "「2025 年度财务报告.pdf」解析失败，请检查文件格式后重新上传".into(), notif_type: "error".into(), read: true, timestamp: now() - 1000 * 60 * 60 * 2 },
    ];
    for n in notifs {
        queries::upsert_notification(conn, &n)?;
    }
    Ok(())
}
