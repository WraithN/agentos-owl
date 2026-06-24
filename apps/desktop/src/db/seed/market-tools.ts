import type Database from "better-sqlite3";
import * as queries from "../queries/index.js";
import type { MarketTool } from "../types.js";
import { daysAgo } from "../../utils/time.js";

export function seedMarketTools(db: Database.Database): void {
  const count = db.prepare("SELECT COUNT(*) FROM market_tools").pluck().get() as number;
  if (count > 0) return;

  const tools: MarketTool[] = [
    { id: "tool-1", name: "Web 搜索", description: "实时检索全网信息...", category: "搜索", toolType: "mcp", icon: "Search", iconBg: "from-cyan-500/30 to-blue-500/30", version: "2.1.0", developer: "OwlOS 官方", rating: 4.9, installs: 128500, tags: ["已安装", "官方"], installed: true, needsApiKey: false, official: true, createdAt: daysAgo(90), updatedAt: daysAgo(10) },
    { id: "tool-2", name: "Python 运行器", description: "沙箱环境中执行 Python 代码...", category: "代码", toolType: "cli", icon: "Code2", iconBg: "from-emerald-500/30 to-cyan-500/30", version: "1.5.2", developer: "OwlOS 官方", rating: 4.8, installs: 98200, tags: ["已安装", "官方"], installed: true, needsApiKey: false, official: true, createdAt: daysAgo(90), updatedAt: daysAgo(10) },
    { id: "tool-3", name: "GitHub 集成", description: "读写 GitHub 仓库...", category: "代码", toolType: "mcp", icon: "GitBranch", iconBg: "from-purple-500/30 to-pink-500/30", version: "3.0.1", developer: "OwlOS 官方", rating: 4.7, installs: 76300, tags: ["已安装", "官方", "需 API Key"], installed: true, needsApiKey: true, official: true, createdAt: daysAgo(90), updatedAt: daysAgo(10) },
    { id: "tool-4", name: "图表生成", description: "根据数据自动生成多种可视化图表...", category: "数据分析", toolType: "cli", icon: "BarChart3", iconBg: "from-amber-500/30 to-orange-500/30", version: "1.2.0", developer: "OwlOS 官方", rating: 4.6, installs: 54100, tags: ["已安装", "官方"], installed: true, needsApiKey: false, official: true, createdAt: daysAgo(90), updatedAt: daysAgo(10) },
    { id: "tool-5", name: "Slack 通知", description: "向 Slack 频道发送消息...", category: "通信", toolType: "mcp", icon: "MessageSquare", iconBg: "from-rose-500/30 to-pink-500/30", version: "2.0.4", developer: "Slack Inc.", rating: 4.5, installs: 43200, tags: ["需 API Key"], installed: false, needsApiKey: true, official: false, createdAt: daysAgo(90), updatedAt: daysAgo(10) },
    { id: "tool-6", name: "PDF 解析器", description: "高精度解析 PDF 文档内容...", category: "文档", toolType: "cli", icon: "FileText", iconBg: "from-red-500/30 to-rose-500/30", version: "1.8.0", developer: "DocAI Labs", rating: 4.4, installs: 31800, tags: [], installed: false, needsApiKey: false, official: false, createdAt: daysAgo(90), updatedAt: daysAgo(10) },
    { id: "tool-7", name: "SQL 查询", description: "连接主流数据库执行 SQL...", category: "数据分析", toolType: "cli", icon: "Database", iconBg: "from-blue-500/30 to-indigo-500/30", version: "2.3.1", developer: "DataFlow", rating: 4.7, installs: 28900, tags: ["需 API Key"], installed: false, needsApiKey: true, official: false, createdAt: daysAgo(90), updatedAt: daysAgo(10) },
    { id: "tool-8", name: "邮件发送", description: "使用 SMTP 或 SendGrid 发送邮件...", category: "通信", toolType: "cli", icon: "Mail", iconBg: "from-teal-500/30 to-cyan-500/30", version: "1.1.2", developer: "MailForge", rating: 4.3, installs: 22400, tags: ["需 API Key"], installed: false, needsApiKey: true, official: false, createdAt: daysAgo(90), updatedAt: daysAgo(10) },
    { id: "tool-9", name: "Shell 执行器", description: "在隔离环境中执行 Shell 脚本...", category: "通用", toolType: "cli", icon: "Code2", iconBg: "from-slate-500/30 to-gray-500/30", version: "1.0.3", developer: "OwlOS 官方", rating: 4.5, installs: 19800, tags: ["官方"], installed: false, needsApiKey: false, official: true, createdAt: daysAgo(90), updatedAt: daysAgo(10) },
    { id: "tool-10", name: "Browser Use", description: "通过 MCP 协议控制浏览器...", category: "通用", toolType: "mcp", icon: "Shield", iconBg: "from-violet-500/30 to-indigo-500/30", version: "0.9.1", developer: "BrowserAI", rating: 4.6, installs: 17300, tags: [], installed: false, needsApiKey: false, official: false, createdAt: daysAgo(90), updatedAt: daysAgo(10) },
    { id: "tool-11", name: "知识召回", description: "从本地知识库中语义检索相关片段...", category: "搜索", toolType: "cli", icon: "Search", iconBg: "from-cyan-500/30 to-emerald-500/30", version: "2.0.0", developer: "OwlOS 官方", rating: 4.8, installs: 15600, tags: ["官方"], installed: false, needsApiKey: false, official: true, createdAt: daysAgo(90), updatedAt: daysAgo(10) },
  ];

  for (const tool of tools) {
    queries.upsertMarketTool(db, tool);
  }
}
