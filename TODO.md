# OwlOS v1.0 功能 TODO 列表

> 基于 PRD（`docs/prd.md`）与当前代码（`apps/web/src/`、`apps/desktop/src/`）review 结果整理。
> 按 **优先级 P0 → P3** 与 **模块** 双重维度分类，P0 为阻塞/核心缺陷，需立即处理。

---

## 架构迁移：Tauri → Electron + Turborepo（已完成）

| 阶段 | 目标 | 状态 | 关键文件 |
|------|------|------|----------|
| **阶段 1** | 搭建 Turborepo 骨架，前端移入 `apps/web/`，创建 `apps/desktop/` Electron 空壳并验证 `pnpm dev` | ✅ 已完成 | `turbo.json`、`pnpm-workspace.yaml`、`apps/desktop/*` |
| **阶段 2** | 迁移 SQLite 到 Electron 主进程（`better-sqlite3`），移植 schema/migrations/queries/seed | ✅ 已完成 | `apps/desktop/src/db/*` |
| **阶段 3** | 迁移 IPC 命令：将 Rust commands 重写为 Node.js IPC handlers | ✅ 已完成 | `apps/desktop/src/ipc/*` |
| **阶段 4** | 前端接入 Electron IPC，替换 Tauri 调用，移除 `@tauri-apps/*` 依赖 | ✅ 已完成 | `apps/web/src/services/electron.ts`、`apps/web/src/contexts/AppContext.tsx`、`apps/web/src/contexts/AuthContext.tsx` |
| **阶段 5** | Electron 生产构建打包，完善 CI | ⏳ 待开始 | `apps/desktop/electron-builder.yml` |

> 当前分支：`feat/electron-migration`。阶段 1 已提交到 `master` 作为基线。

---

## 一、P0 — 阻塞/核心缺陷（立即处理，0.5 ~ 1 周）

### 1.1 全局与工程化

| # | 功能点 | 现状 | 问题/差距 | 预期交付 | 负责文件 |
|---|--------|------|-----------|----------|----------|
| P0-1 | 前端默认状态 | `AppContext` 中 `chatMode = 'squad'`、`currentConversation = conversations[0]` | PRD 验收标准 1 要求「默认展示对话模块空状态」 | 默认 `chatMode='single'`、`currentConversation = null`；刷新后首页渲染 `<EmptyState />` | `apps/web/src/contexts/AppContext.tsx` |
| P0-2 | 后端数据接入 | `AppContext`/`AuthContext` 已切换为 `apps/web/src/services/electron.ts`，但各模块业务仍大量读 mock | 前端未在所有模块使用真实数据 | 将各模块入口切换为 `electron.ts` 对应 API；mock 仅作为 fallback/开发模式 | `apps/web/src/contexts/AppContext.tsx`、各模块入口 |
| P0-3 | 会话持久化 | 当前会话与消息为内存状态，刷新丢失 | 用户发送的消息无法保存 | 通过 `saveConversation`/`saveMessage`/`listMessages` 持久化到 Electron SQLite | `apps/web/src/components/chat/ChatModule.tsx`、`apps/web/src/services/electron.ts` |

### 1.2 对话模块

| # | 功能点 | 现状 | 问题/差距 | 预期交付 | 负责文件 |
|---|--------|------|-----------|----------|----------|
| P0-4 | 模式切换完整链路 | 仅支持关键词触发升级到 `squad`；缺少 `auto` 升级入口 | PRD 4.1 要求单聊→群聊→自动化三种模式自动切换 | 补全 `auto` 升级提示与确认切换；或增加顶部/输入区手动模式切换入口 | `apps/web/src/components/chat/ChatModule.tsx`、`apps/web/src/components/chat/UpgradeBar.tsx` |
| P0-5 | 空状态→首条消息 | 空状态点击示例问题可发送，但首次不会稳定触发 AI 回复 | 需确保空状态快捷入口与输入框发送后都能正常进入流式回复 | 统一 `handleSend` 入口，空状态回调直接调用同一发送逻辑 | `apps/web/src/components/chat/ChatModule.tsx`、`apps/web/src/components/chat/EmptyState.tsx` |
| P0-6 | 消息 @ 提及高亮 | `MessageFlow` 未解析 `mentions` 数组 | PRD 3.3.3 / 4.2 要求群聊@提及消息高亮显示 | 在消息渲染中解析并高亮被 @ Agent | `apps/web/src/components/chat/MessageFlow.tsx` |

### 1.3 知识库

| # | 功能点 | 现状 | 问题/差距 | 预期交付 | 负责文件 |
|---|--------|------|-----------|----------|----------|
| P0-7 | 切片规则校验 | 新建/编辑仅校验名称非空 | PRD 4.7 要求：固定长度策略必须填写块大小/重叠量；名称不可重复 | 增加策略相关必填校验与名称重复校验 | `apps/web/src/components/knowledge/KnowledgeModule.tsx` |
| P0-8 | 知识库错误状态 | 列表中无显式 error 状态卡片 | PRD 3.6.1 要求「1 个知识库显示错误状态（红色图标）」 | 在 mock 数据或 UI 中增加错误状态展示 | `apps/web/src/components/knowledge/KnowledgeModule.tsx` |

---

## 二、P1 — 核心功能补全（1 ~ 2 周）

### 2.1 对话模块

| # | 功能点 | 现状 | 问题/差距 | 预期交付 | 负责文件 |
|---|--------|------|-----------|----------|----------|
| P1-1 | 会话列表常驻与删除 | 会话列表在下拉浮层中，仅支持切换/新建 | PRD 3.3.2 要求会话列表常驻或可打开，支持删除会话 | 将历史下拉扩展为可固定侧栏；增加删除会话按钮与确认；调用 `deleteConversation` | `apps/web/src/components/chat/ChatModule.tsx`、`apps/web/src/components/chat/ConversationList.tsx` |
| P1-2 | 消息失败重试与编辑 | `MessageFlow` 已提供 `onRetry/onEdit` props，但 `ChatModule` 中 `onEdit` 未实现 | 用户无法编辑已发送消息 | 实现 `onEdit`：回填输入框并重新发送；失败消息支持重试 | `apps/web/src/components/chat/ChatModule.tsx` |
| P1-3 | 真实 AI 回复接入 | 当前为本地 `buildMockReply` 关键词匹配 + `streamText` 模拟流式 | PRD 要求系统返回 Agent 回复消息 | 接入 LLM API（通过 `apps/web/src/services/`），保留流式输出与错误处理 | `apps/web/src/services/llm.ts`、`apps/web/src/components/chat/ChatModule.tsx` |

### 2.2 群聊模式

| # | 功能点 | 现状 | 问题/差距 | 预期交付 | 负责文件 |
|---|--------|------|-----------|----------|----------|
| P1-4 | 团队面板 | 已有 `TeamPanel` 展示 Agent 列表与状态 | PRD 3.4.1 要求 4 个特定 Agent（Aria/Coder/Muse/Analyst），当前展示全部 Agent | 限制为 PRD 要求的 4 个 Agent；确保颜色/状态与 PRD 一致 | `apps/web/src/components/squad/TeamPanel.tsx` |
| P1-5 | 任务看板拖拽 | 看板为静态展示 | PRD 4.3 要求任务卡片可在待办/进行中/已完成三列间拖拽移动 | 引入 `@dnd-kit` 或原生 HTML5 DnD，实现列内/跨列拖拽并更新状态；持久化到后端 | `apps/web/src/components/squad/TaskBoard.tsx` |
| P1-6 | 群聊消息流 | `ChatModule` 在 `squad` 模式下展示 `MESSAGES_SQUAD` 静态数据 | 缺少真实多 Agent 协作消息生成逻辑 | 根据任务与 Agent 状态动态生成群聊消息；支持 @ 提及与回复 | `apps/web/src/components/chat/ChatModule.tsx`、`apps/web/src/components/chat/MessageFlow.tsx` |

### 2.3 自动化模式

| # | 功能点 | 现状 | 问题/差距 | 预期交付 | 负责文件 |
|---|--------|------|-----------|----------|----------|
| P1-7 | 自动化模板入口 | `ToolsModule` 只有 skills/prompts/tools 三 tab | PRD 3.7.2 要求「自动化模板」独立区域 | 新增「自动化模板」子页面或 tab，展示名称/描述/使用次数/一键创建工作流 | `apps/web/src/components/tools/ToolsModule.tsx`、`apps/web/src/components/settings/WorkflowSettings.tsx` |
| P1-8 | 工作流执行引擎 | `ExecutionLog` / `WorkflowSettings` 中「运行」仅切换状态 | PRD 4.4 要求按节点顺序执行、失败暂停、手动重试 | 实现本地/远端执行器：节点顺序执行、日志输出、失败重试 | `apps/web/src/services/workflowEngine.ts`、`apps/web/src/components/automation/ExecutionLog.tsx`、`apps/web/src/components/settings/WorkflowSettings.tsx` |

### 2.4 知识库

| # | 功能点 | 现状 | 问题/差距 | 预期交付 | 负责文件 |
|---|--------|------|-----------|----------|----------|
| P1-9 | 文件上传真实流程 | 输入区与知识库拖拽上传均为本地状态/占位 | PRD 异常处理要求上传失败提示 | 接入后端上传接口；显示进度、错误、处理中状态；与 Electron 后端 `saveDoc`/`saveChunks` 联动 | `apps/web/src/components/chat/InputArea.tsx`、`apps/web/src/components/knowledge/KBUploadDialog.tsx` |
| P1-10 | 向量检索真实化 | `KBSearchPage` 使用固定 mock chunks | PRD 4.5 要求按相似度排序、展示来源文档与得分 | 对接 Embedding/向量库搜索 API；前端展示得分与来源 | `apps/web/src/components/knowledge/KnowledgeModule.tsx` |

### 2.5 设置

| # | 功能点 | 现状 | 问题/差距 | 预期交付 | 负责文件 |
|---|--------|------|-----------|----------|----------|
| P1-11 | 主题/样式一致性 | `WorkflowSettings` 画布背景为硬编码浅色渐变；多处组件在深色模式下使用 `text-slate-100` 但未适配 | 深色/浅色切换后部分页面视觉不一致 | 统一使用 CSS 变量或 Tailwind `dark:`；画布背景随主题切换 | `apps/web/src/components/settings/WorkflowSettings.tsx`、`apps/web/src/index.css` |
| P1-12 | 设置持久化 | 外观设置仅在内存中修改 CSS 变量 | 刷新后恢复默认 | 通过 `getSettings`/`saveSettings` 持久化主题、强调色、字体大小、语言等 | `apps/web/src/contexts/AppContext.tsx`、`apps/web/src/components/settings/AppearanceSettings.tsx` |

---

## 三、P2 — 体验优化与数据层（2 ~ 3 周）

### 3.1 架构与数据层

| # | 功能点 | 现状 | 问题/差距 | 预期交付 | 负责文件 |
|---|--------|------|-----------|----------|----------|
| P2-1 | Orchestrator 真实复杂度判断 | 当前为关键词匹配（`增长/方案/分析...`） | PRD 4.1 要求「系统内置 Orchestrator 判断任务复杂度」 | 设计轻量规则引擎或调用 LLM 进行意图分类，返回建议模式与置信度 | `apps/web/src/services/orchestrator.ts`、`apps/web/src/components/chat/ChatModule.tsx` |
| P2-2 | 通用 API 层 | 无统一网络请求层 | 异常处理、重试、错误码无法统一 | 抽象 API 层（ky/axios），定义错误码与重试策略；支持 mock/真实接口切换 | `apps/web/src/services/api.ts`、`apps/web/src/hooks/*.ts` |
| P2-3 | 状态持久化 | 主题语言仅存 localStorage，会话/工作流等状态为内存 | 刷新页面数据丢失 | 关键配置持久化；会话/工作流/任务考虑 SQLite/IndexedDB 存储快照 | `apps/web/src/contexts/AppContext.tsx`、各模块 |

### 3.2 全局组件

| # | 功能点 | 现状 | 问题/差距 | 预期交付 | 负责文件 |
|---|--------|------|-----------|----------|----------|
| P2-4 | 通知中心实时性 | `NotificationPanel` 展示静态 mock 通知 | 需与任务完成、工作流、系统事件联动 | 建立事件总线或 WebSocket 连接，推送真实通知；持久化已读状态 | `apps/web/src/components/global/NotificationPanel.tsx`、`apps/web/src/contexts/AppContext.tsx` |
| P2-5 | 命令面板功能 | `CommandPalette` 可打开，但执行多为占位 | 需真正跳转/触发操作 | 绑定到各模块操作：切换模块、打开设置、新建会话等 | `apps/web/src/components/global/CommandPalette.tsx` |

### 3.3 工具市场

| # | 功能点 | 现状 | 问题/差距 | 预期交付 | 负责文件 |
|---|--------|------|-----------|----------|----------|
| P2-6 | 工具安装/卸载持久化 | 工具 market 状态为本地 useState | 刷新后恢复初始状态 | 与后端 `saveMarketTool` 联动；安装状态持久化 | `apps/web/src/components/tools/ToolsModule.tsx`、`apps/web/src/services/electron.ts` |
| P2-7 | 技能与提示词管理 | 技能/提示词市场为静态列表，支持本地新建/删除 | 缺少后端同步 | 将用户自定义技能/提示词持久化；支持编辑 | `apps/web/src/components/tools/ToolsModule.tsx` |

### 3.4 设置

| # | 功能点 | 现状 | 问题/差距 | 预期交付 | 负责文件 |
|---|--------|------|-----------|----------|----------|
| P2-8 | 安全审计日志 | `SecuritySettings` 展示静态 mock 日志 | PRD 3.8.7 要求操作日志列表、筛选、导出 | 接入后端审计日志查询；支持筛选与导出 | `apps/web/src/components/settings/SecuritySettings.tsx`、`apps/web/src/services/electron.ts` |
| P2-9 | API 开发者管理 | `ApiSettings` 为静态展示 | PRD 3.8.9 要求 API 密钥管理、调用统计 | 实现密钥生成/删除/复制；展示真实调用统计 | `apps/web/src/components/settings/ApiSettings.tsx` |
| P2-10 | 通知集成配置 | `NotificationSettings` 为静态表单 | PRD 3.8.6 要求配置通知渠道与规则 | 表单校验与持久化；测试连接 | `apps/web/src/components/settings/NotificationSettings.tsx` |

---

## 四、P3 — 扩展与打磨（3 ~ 4 周及以后）

### 4.1 工程与质量

| # | 功能点 | 现状 | 问题/差距 | 预期交付 | 负责文件 |
|---|--------|------|-----------|----------|----------|
| P3-1 | 多语言完整覆盖 | 已有 `useT`/`lib/i18n.ts`，但大量文案仍为硬编码中文 | PRD 本期不实现，但需长期规划 | 提取所有文案到 i18n 字典；完成 zh/en 覆盖 | `apps/web/src/lib/i18n.ts`、各组件 |
| P3-2 | E2E 测试 | 无测试文件 | 关键路径缺乏回归保障 | 增加 Playwright/Cypress 关键路径测试 | `tests/` |
| P3-3 | 大列表虚拟滚动 | 消息流、知识库列表、日志列表未做虚拟化 | 数据量大时性能下降 | 引入虚拟滚动 | 各长列表组件 |

### 4.2 工作流画布

| # | 功能点 | 现状 | 问题/差距 | 预期交付 | 负责文件 |
|---|--------|------|-----------|----------|----------|
| P3-4 | 撤销/重做 | PRD 明确本期不实现 | 长期规划：画布操作历史栈 | 实现 undo/redo | `apps/web/src/components/settings/WorkflowSettings.tsx` |
| P3-5 | 节点分组与快捷键 | PRD 明确本期不实现 | 长期规划 | 实现框选、分组、快捷键 | `apps/web/src/components/settings/WorkflowSettings.tsx` |
| P3-6 | 循环检测 | PRD 5 提到节点连线形成循环需阻止 | 当前未实现 | 创建连线时检测循环并提示 | `apps/web/src/components/settings/WorkflowSettings.tsx` |

### 4.3 移动端与高级功能

| # | 功能点 | 现状 | 问题/差距 | 预期交付 | 负责文件 |
|---|--------|------|-----------|----------|----------|
| P3-7 | 移动端适配 | PRD 明确本期不实现 | 长期规划：侧边栏响应式、触控优化 | 设计并实施移动端布局 | 全局 |
| P3-8 | 数据导出/备份 | PRD 明确本期不实现 | 长期规划 | 支持工作流/知识库/设置导出 | 各模块 |
| P3-9 | 高级权限与角色 | PRD 明确本期不实现 | 长期规划 | RBAC 设计 | `apps/web/src/components/settings/SecuritySettings.tsx` |

---

## 五、本期建议排期（4 周迭代）

| 周次 | 目标 | 主要任务 |
|------|------|----------|
| **第 1 周** | 打通数据层 + 修复核心体验 | P0-1（默认空状态）、P0-2（后端接入）、P0-3（会话持久化）、P0-5（空状态发送）、P0-7/P0-8（KB 校验与错误状态） |
| **第 2 周** | 补全 PRD 验收核心功能 | P0-4/P0-6（模式切换与@高亮）、P1-1（会话列表删除）、P1-4（团队面板）、P1-5（看板拖拽） |
| **第 3 周** | AI 与执行引擎 | P1-3（LLM 接入）、P2-1（Orchestrator）、P1-8（工作流执行引擎）、P1-7（自动化模板） |
| **第 4 周** | 上传/检索/设置持久化 | P1-9（文件上传）、P1-10（向量检索）、P1-12（设置持久化）、P2-4（通知中心）、P1-11（主题一致性收尾） |

---

## 六、已实现功能清单（无需再开发）

| 模块 | 已实现功能 |
|------|-----------|
| **全局架构** | 侧边栏折叠/展开、顶部全局栏、自定义标题栏、主题切换、命令面板浮层、通知中心浮层、Framer Motion 转场动画 |
| **对话模块** | 空状态引导、消息流（text/code/image/card/tool_call）、流式回复模拟、升级提示条、底部输入区（附件/技能/提示词/团队选择/快捷按钮） |
| **群聊模式** | 团队面板（全部 Agent 展示）、任务看板（看板视图 + 甘特图视图）、群聊消息静态展示 |
| **自动化模式** | 执行日志面板（节点状态、展开日志、进度条、播放控制占位） |
| **知识库** | 列表页（搜索/筛选/排序/新建/编辑/删除）、切片规则 CRUD、知识库编辑页（文档列表/知识块展示）、AI 检索对话页（静态 mock） |
| **工具市场** | 技能市场、提示词市场、工具市场（网格/详情/安装/卸载/新建工具弹窗） |
| **设置** | 外观主题（深浅/强调色/字体大小/动画等级）、智能体配置、智能体团队、工作流画布（节点/连线/配置/自动布局/fit-to-view）、计费中心（图表+明细）、通知设置表单、安全审计展示、API 开发者展示 |
| **Electron 后端** | SQLite 数据库、Auth（注册/登录/Profile）、Setting/Agent/Conversation/Message/Task/Workflow/Knowledge/MarketTool/Team/Notification 等 CRUD 接口 |

---

## 七、关键未接入后端接口清单

`AppContext`/`AuthContext` 已接入 Electron IPC，以下接口仍需按优先级在各业务模块逐步接入：

- `list_conversations` / `save_conversation` / `delete_conversation`
- `list_messages` / `save_message` / `delete_message`
- `list_tasks` / `save_task` / `delete_task`
- `list_workflows` / `save_workflow` / `delete_workflow`
- `list_knowledge_docs` / `save_knowledge_doc` / `delete_knowledge_doc` / `list_doc_chunks` / `save_doc_chunks`
- `list_market_tools` / `save_market_tool`
- `get_settings` / `save_settings`
- `list_notifications` / `mark_notification_read` / `save_notification`
- `list_api_keys` / `save_api_key` / `delete_api_key`
- `list_webhooks` / `save_webhook` / `delete_webhook`
- `list_workflow_templates` / `get_workflow_template` / `save_workflow_template` / `delete_workflow_template`（含 nodes/edges/viewport）
- `llm_chat` / `parse_document` / `run_shell`

---

## 八、[2026-06-17] 工作流持久化

- [x] 工作流画布 ↔ SQLite 打通：DB schema 增量迁移 (`edges_json` / `viewport_json` / `updated_at`)、IPC channel 改名为 `*_template`、`packages/workflow` 暴露 `WorkflowStore` 注入接口、`apps/web` 注入 Electron 实现、保存/加载/删除/dirty 离开拦截/viewport 持久化全部接通 — 状态：`COMPLETED`
- [ ] 工作流自动保存（去抖 1.5s + 状态指示） — 状态：`PENDING`
- [ ] 工作流 JSON 导入/导出（走 Electron `dialog`） — 状态：`PENDING`
- [ ] 工作流历史版本表 `workflow_versions` 与回滚 UI — 状态：`PENDING`
- [ ] 工作流保存前静态校验（孤立节点 / 环路 / 必填配置） — 状态：`PENDING`

---

## 九、备注

1. **PRD 明确本期不实现的功能**：移动端适配、完整多语言、语音输入/回复、视频通话、第三方应用集成、离线模式、数据导出/备份、高级权限 RBAC、自定义节点开发、实时协作、工作流撤销重做/分组/快捷键、知识块内容编辑、切片规则批量导入导出。这些已归入 P3 或暂不排期。

2. **当前工作区存在大量 `.skills/` 删除记录**，建议在开始功能开发前先处理这些未跟踪/已删除文件，避免提交时混入无关变更。


## 十、[2026-06-19] Owlery 会话/状态链路 Review 后续

> 本次 review 覆盖 `webui → Elder → … → teammate` 会话链路、`teammate → CrystalBall → webui` 状态链路以及前端 `ChatModule` 信息流处理。以下问题需在后续迭代中跟进。

### 10.1 模式与入口（P0 / P1）

| # | 功能点 | 现状 | 问题/差距 | 预期交付 | 负责文件 |
|---|--------|------|-----------|----------|----------|
| P0-9 | 前端模式 → 后端 TeammateMode 映射 | `AppMode='single\|squad\|auto'`，后端 `TeammateMode='pipeline\|brainstorm\|supervisor\|hierarchy'`，映射未定义 | 模式切换后 Owlery 无法按预期选择协作模式 | 在 `startOwleryChat` / `saveConversation` 中传递模式，并在 desktop 侧完成映射 | `apps/web/src/services/electron.ts`、`apps/desktop/src/ipc/owlery.ts`、`packages/core/src/owlery/Owlery.ts` |
| P1-13 | 新建会话跟随当前模式 | `handleNewConv` 写死 `mode: 'single'`、`agentIds: ['boss_agent']` | 用户在 squad/auto 下新建会话仍被切回 single | 按当前 `chatMode` 创建会话，并允许传入团队模板 | `apps/web/src/components/chat/ChatContainer.tsx` |

### 10.2 招募与 Agent 调度（P1）

| # | 功能点 | 现状 | 问题/差距 | 预期交付 | 负责文件 |
|---|--------|------|-----------|----------|----------|
| P1-14 | recruit 工具真实执行 | `toolFactory` 仅返回 `{ name: 'recruit', description }`，无 `execute` | Primary Sentinel 无法根据任务上下文招募 Worker/SubSentinel | 实现 `execute`：调用 LLM 评估任务并返回 `RecruitAgentSpec[]`，由 Owlery 创建 Agent | `apps/desktop/src/agent/owleryRuntime.ts`、`packages/core/src/owlery/Owlery.ts` |
| P1-15 | modeEvaluator 真实实现 | `modeEvaluator` 恒返回 `"supervisor"` | 无法根据用户输入自动切换 brainstorm/pipeline/hierarchy | 接入规则引擎或 LLM 进行意图分类，返回建议模式与置信度 | `packages/core/src/owlery/Owlery.ts` |
| P1-16 | 非 brainstorm 模式任务分发 | 普通模式下 Elder 直接流式回复，Primary Sentinel/Workers 闲置 | 团队未真正协作 | 实现 `TeammateManager.dispatch`（非 brainstorm）：由 Primary Sentinel 拆解任务并调度 Workers | `packages/core/src/owlery/TeammateManager.ts` |
| P2-11 | MessageBox 持久化 | `MessageBox` 为纯内存队列 | 应用重启后 Agent 间消息丢失 | 将会话内 Agent 间消息持久化到 SQLite，重启后可恢复 | `packages/core/src/owlery/MessageBox.ts`、`apps/desktop/src/db/schema.sql` |
| P2-12 | Agent 间消息消费 | `receiveFromSentinel` 返回 `AsyncIterable`，但 Elder 端未消费 | Agent 协作消息无法闭环 | 补全 Elder / Sentinel / Worker 间的消息消费与回复逻辑 | `packages/core/src/owlery/*` |

### 10.3 状态链路（P1 / P2）

| # | 功能点 | 现状 | 问题/差距 | 预期交付 | 负责文件 |
|---|--------|------|-----------|----------|----------|
| P1-17 | CrystalBall 子 Agent 状态更新 | Primary Sentinel / Workers 注册后始终 `not_started` | Bot 状态面板无法展示真实团队协作状态 | 在 Agent 启动、运行、完成、失败时调用 `CrystalBall.updateStatus` | `packages/core/src/owlery/TeammateManager.ts`、`packages/core/src/owlery/AgentPool.ts` |
| P1-18 | 工具/任务级状态 | CrystalBall 仅感知 Agent 级状态 | 工具执行过程无法展示 | 扩展 `AgentWorkSnapshot` 或在 CrystalBall 中增加 tool/task 状态 | `packages/core/src/owlery/CrystalBall.ts` |
| P2-13 | Session 级运行状态暴露 | `SessionSlot.runStatus` 未通过 IPC 暴露 | 前端无法精确知道会话是否运行中 | 在 `getTeammateStatus` 或新增通道中返回 `runStatus` | `packages/core/src/owlery/Owlery.ts`、`apps/desktop/src/ipc/owlery.ts` |

### 10.4 前端信息流（P1 / P2）

| # | 功能点 | 现状 | 问题/差距 | 预期交付 | 负责文件 |
|---|--------|------|-----------|----------|----------|
| P1-19 | 拆分 SingleAgentChat | `MessageFlow`/`MessageItem`/`InputArea` 不存在，功能全部内联在 `SingleAgentChat.tsx`（已超 600 行） | 可维护性差，不符合代码规范 | 拆分为独立组件/文件，按职责分离 UI 渲染与运行时适配 | `apps/web/src/components/chat/*` |
| P1-20 | 取消与重新生成 | `useOwleryRuntime` 中 `onCancel` / `regenerateFromMessage` 仅 toast | 用户无法停止生成或重新生成 | 实现真正的取消（Owlery stop）与重新生成（清空 output buffer 重新运行） | `apps/web/src/components/chat/useOwleryRuntime.ts`、`packages/core/src/owlery/Owlery.ts` |
| P1-21 | 输入区真实能力 | 附件、录音、命令、技能、团队选择仅修改输入框文本 | 这些入口未接入真实能力 | 分别接入文件上传、语音识别、快捷命令、技能选择、团队模板选择 | `apps/web/src/components/chat/SingleAgentChat.tsx` |
| P1-22 | Monitor/TaskBoard/ExecutionLog 接真实数据 | 这些组件仍直接读取 `mockData.ts` | 用户看到的运行监控、任务看板、执行日志与真实会话无关 | 接入 `getTeammateStatus` / `listTasks` / 工作流运行事件等真实数据 | `apps/web/src/components/monitor/*`、`apps/web/src/components/squad/*`、`apps/web/src/components/automation/*` |
| P2-14 | 历史消息进入 Elder prompt | `runSession` 中 `conversationContext` 恒为 `{ messages: [] }` | Elder 无法获得完整上下文，影响多轮对话质量 | 将 `listMessages` 恢复的历史消息按角色组装后传入 `conversationContext` | `packages/core/src/owlery/Owlery.ts`、`apps/desktop/src/agent/owleryRuntime.ts` |

### 10.5 类型/模型一致性（P1）

| # | 功能点 | 现状 | 问题/差距 | 预期交付 | 负责文件 |
|---|--------|------|-----------|----------|----------|
| P1-23 | 团队模板 mode 枚举统一 | 前端 `TeamTemplate.mode` 包含 `'brainstorming'`，后端为 `'brainstorm'` | 保存/加载团队模板时可能不一致 | 统一前后端枚举命名 | `apps/web/src/types/index.ts`、`packages/core/src/owlery/types.ts` |
| P1-24 | Agent 角色模型对齐 | `AgentTitle` 硬编码 `boss\|cto\|planner\|supervisor\|operator` | 与 UI 中丰富的角色模型不同步 | 统一角色/职称定义，或增加 UI 到 core 的映射层 | `packages/core/src/agent/types.ts`、`apps/web/src/types/index.ts` |
