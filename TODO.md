# OwlOS v1.0 功能 TODO 列表

> 本文档按 6.23 ~ 8.23 的发布里程碑组织待办项。
> 已完成的核心重构见 `ARCHITECT.md` 与 `docs/` 中的 bug/迭代记录。

---

## [2026-06-24] 会话展示修复与团队面板重构

- [x] 修复 assistant-ui optimistic assistant 导致会话出现两条相同 assistant 消息 — Status: `COMPLETED`
- [x] 修复同一角色出现多个 AgentCard，按 `title` 聚合为单张卡片 — Status: `COMPLETED`
- [x] 修复简单消息暴露 reasoning/tool 过程 — Status: `COMPLETED`
- [x] 修复主消息文件范围过宽，改为仅从文本部分提取 — Status: `COMPLETED`
- [x] 创建右侧「执行过程」面板，合并任务流、智能体团队、生成文件 — Status: `COMPLETED`
- [x] 右侧面板使用右侧垂直 Tabs，删除 Gantt 时间视图 — Status: `COMPLETED`
- [x] 主会话框移除 WorkflowPanel，只保留最终结果与本轮文件 — Status: `COMPLETED`
- [x] Header 机器人按钮保留状态摘要，并增加「查看团队过程」入口 — Status: `COMPLETED`
- [x] 扩展 `ChatRuntimeContext` 共享完整执行状态 — Status: `COMPLETED`
- [x] 新增 `execution.*` 多语言 key — Status: `COMPLETED`

---

---

## 里程碑一：6.23 ~ 7.23 — 运行时稳定 & 数据层打通

目标：新 Agent 运行时成为唯一默认路径，会话/消息持久化全链路跑通，前端核心体验可用。

### 运行时收尾

- [ ] **默认启用新运行时并清理旧代码**
  - 删除 `apps/desktop/src/agent-orchestrator/legacy/` 旧 `Owlery`/`SessionRuntime`/`AgentExecutor`
  - 删除 `packages/core/src/owlery/*` 旧会话体系
  - 移除 `SessionSlot` 中的 `useNewRuntime` feature flag

- [x] **统一 provider 管理与 LLM 配置**
  - 已新增 `@owl-os/core` 共享 provider 注册表（`LLM_PROVIDERS`）
  - `AgentFactory` 默认使用 `PiAgentDriver`（pi-ai），`USE_VERCEL_AI=1` 可切换 `VercelAiDriver`
  - 设置页「LLM 配置」新增供应商下拉选项，自动填充默认 Base URL
  - 数据迁移自动为旧模型补全 `provider` 字段

- [ ] **真实 Electron 环境验证 Vercel AI SDK**
  - [ ] openai / deepseek / openrouter 至少一个 provider 的流式输出
  - [ ] 工具调用在 `VercelAiDriver` 下的端到端验证
  - [ ] 多轮对话上下文正确性
  - [ ] 取消（abort）与网络错误处理

- [ ] **Elder 路由与团队招募细节补全**
  - 实现 `recruit_sentinel` / `recruit_workers` 工具的真实 `execute`
  - 接入轻量规则或 LLM 意图分类，替代关键词匹配
  - Elder 评审未通过时启动基于 feedback 的修订轮次

### 数据持久化

- [ ] **会话与消息全链路持久化**
  - 前端 `ChatModule` 调用 `saveConversation` / `saveMessage` / `listMessages`
  - 历史消息正确组装为 `conversationContext` 传入 Elder
  - 刷新页面后恢复当前会话与消息列表

- [ ] **前端默认空状态**
  - 默认 `chatMode='chat'`、`currentConversation=null`
  - 首页渲染 `<EmptyState />`
  - 空状态快捷入口与输入框共用同一 `handleSend` 逻辑

- [ ] **会话列表常驻与删除**
  - 将历史下拉扩展为可固定侧栏
  - 增加删除会话按钮与确认
  - 接入 `deleteConversation` IPC

- [ ] **设置持久化**
  - 主题、强调色、字体大小、语言通过 `getSettings` / `saveSettings` 持久化
  - 刷新后恢复用户偏好

### 对话体验

- [ ] **消息 @ 提及高亮**
  - 在 `MessageFlow` 中解析 `mentions` 数组
  - 被 @ Agent 的名称高亮显示

- [ ] **消息失败重试与编辑**
  - 实现 `onEdit`：回填输入框并重新发送
  - 失败消息支持重试

- [ ] **取消与重新生成**
  - `useOwleryRuntime` 中 `onCancel` 真正调用 Owlery stop
  - `regenerateFromMessage` 清空 output buffer 重新运行

### 知识库

- [ ] **切片规则校验**
  - 固定长度策略必须填写块大小与重叠量
  - 名称不可重复

- [ ] **知识库错误状态**
  - 列表中增加显式 error 状态卡片（红色图标）

- [ ] **文件上传真实流程**
  - 接入后端上传接口（输入区与知识库拖拽上传）
  - 显示上传进度、错误、处理中状态
  - 与 Electron `saveDoc` / `saveChunks` 联动

---

## 里程碑二：7.23 ~ 8.23 — 完整功能 & 上线准备

目标：自动化/工作流模块可运行，监控/执行日志展示真实数据，全局组件与设置全部可用。

### 运行时与日志

- [ ] **Monitor / TaskBoard / ExecutionLog 真实数据**
  - `Monitor` 接入 `getTeammateStatus`
  - `ExecutionLog` 接入工作流运行事件

- [ ] **单会话消息队列与暂停会话**
  - 单会话内实现用户消息队列，避免并发请求冲突
  - 支持暂停/恢复当前会话运行（`SessionSlot.stop` / 重新 `start`）
  - 前端展示暂停状态与恢复入口

- [ ] **会话日志与操作日志**
  - 接入 `session_logs` 真实数据，展示会话内关键事件
  - 接入 `audit_logs` 真实数据，支持操作日志筛选与导出

- [ ] **语音接入**
  - 输入区支持语音输入（STT）并转为文本发送
  - 支持 Agent 语音回复（TTS）播放
  - 配置语音模型与 provider

- [ ] **计费统计**
  - 接入真实 token 消耗与费用统计
  - 按会话 / 模型 / 时间维度展示计费图表与明细

### 自动化模式

- [ ] **自动化模板入口**
  - 在工具/自动化模块新增「自动化模板」子页面或 tab
  - 展示名称、描述、使用次数、一键创建工作流

- [ ] **工作流执行引擎**
  - 按节点顺序执行
  - 失败暂停、手动重试
  - 日志输出与状态回传

- [ ] **工作流画布增强**
  - [ ] 自动保存（去抖 1.5s + 状态指示）
  - [ ] JSON 导入/导出（走 Electron `dialog`）
  - [ ] 历史版本表 `workflow_versions` 与回滚 UI
  - [ ] 保存前静态校验（孤立节点 / 环路 / 必填配置）

### 知识库与检索

- [ ] **向量检索真实化**
  - 对接 Embedding / 向量库搜索 API
  - 前端按相似度排序展示来源文档与得分

### 设置与全局

- [ ] **主题/样式一致性**
  - 工作流画布背景随主题切换，不再硬编码浅色渐变
  - 统一使用 CSS 变量或 `dark:` 修饰

- [ ] **通知中心实时性**
  - 与任务完成、工作流、系统事件联动
  - 持久化已读状态

- [ ] **命令面板功能**
  - 绑定到真实操作：切换模块、打开设置、新建会话等

- [ ] **工具市场持久化**
  - 安装/卸载状态与后端 `saveMarketTool` 联动
  - 用户自定义技能/提示词持久化并支持编辑

- [ ] **安全审计日志**
  - 接入后端审计日志查询
  - 支持筛选与导出

- [ ] **API 开发者管理**
  - 实现 API 密钥生成/删除/复制
  - 展示真实调用统计

- [ ] **通知集成配置**
  - 表单校验与持久化
  - 测试连接

### 质量与工程

- [ ] **多语言完整覆盖**
  - 将剩余硬编码中文文案提取到 `lib/i18n.ts`
  - 完成 zh/en 覆盖，ja/ko 逐步补齐

- [ ] **E2E / 关键路径测试**
  - 引入 Playwright 或 Cypress
  - 覆盖登录、新建会话、发送消息、切换模块

- [ ] **大列表虚拟滚动**
  - 消息流、知识库列表、日志列表引入虚拟化

- [ ] **通用 API 层**
  - 抽象统一网络/IPC 请求层
  - 定义错误码与重试策略

---

## 长期规划（P3 以后）

> 以下功能 PRD 明确本期不实现，作为后续方向记录。

- [ ] 移动端适配（侧边栏响应式、触控优化）
- [ ] 数据导出/备份（工作流、知识库、设置）
- [ ] 高级权限与 RBAC
- [ ] 工作流画布撤销/重做、节点分组、快捷键
- [ ] 自定义节点开发
- [ ] 实时协作
- [ ] 视频通话
- [ ] 第三方应用集成、离线模式

---

## 备注

1. **质量门**：任何功能完成后需通过 `pnpm lint && pnpm typecheck && pnpm test`。
2. **缺陷记录**：修复缺陷时按 `AGENTS.user.md` Rule 4 写入 `docs/bugs/YYYY-MM-DD-<brief>.md`。
3. **待办记录**：新增遗留项同步追加到本文件对应里程碑下。
4. **接口清单**：尚未全面接入前端的 Electron IPC 接口见 `ARCHITECT.md` 第 7 节与 `apps/web/src/services/electron.ts`。
