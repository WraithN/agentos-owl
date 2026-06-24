# 统一对话入口 + 动态团队招募设计文档

## 1. 背景与目标

当前前端在聊天入口上区分了 `single`、`squad`、`auto` 三种模式，导致：
- 用户需要理解模式概念。
- Squad 模式的团队面板经常出现只有 `boss` 一个 Agent 的情况。
- 会话日志无法反映 Elder Agent 是否真正在招募团队。

本设计目标是：
1. **前端不再区分 single/squad**：所有对话使用统一输入界面。
2. **团队由运行时动态组建**：根据用户选择的团队模板，或 Elder Agent 的智能判断，招募对应 Sentinel 和 Worker。
3. **Sentinel 拥有不同 title 和 prompt**：`planner`、`supervisor`、`coordinator`、`cto`，对应不同协作模式。
4. **Worker title 由 LLM 动态生成**：不再固定为 `operator`。
5. **招募过程可观测**：`recruit_sentinel`、`recruit_workers` 作为工具调用被记录到会话日志并在 UI 展示。

## 2. 现状

- `AppMode` = `'single' | 'squad' | 'auto'`；`TeammateMode` = `'pipeline' | 'brainstorm' | 'supervisor' | 'hierarchy'`。
- `ChatContainer` 根据 `chatMode` 渲染不同侧边栏（TaskBoard / ExecutionLog）。
- `EmptyState` 快捷操作直接指定 `teammateMode`。
- Worker 运行时 `SessionRuntime` 之前只创建并运行 `elder`，忽略 `teammateMode`。
- 当前已修复：SessionRuntime 可在 squad 模式下创建固定 Sentinel + Worker，但 Worker title 固定且 Elder 不参与团队选择。
- `TeamTemplate` 已存在，但前端团队选择未与聊天打通。

## 3. 设计方案

### 3.1 高层流程

```text
用户输入
  │
  ├─ 用户手动选择团队模板？ ──Yes──▶ 按模板 mode 映射 Sentinel title ──▶ recruitSentinel
  │
  └─ No ──▶ Elder Agent 调用 recruit_sentinel 工具选择 Sentinel title ──▶ recruitSentinel
              │
              ▼
        Elder 输出委派提示
              │
              ▼
        Sentinel 接收任务
              │
              ▼
        Sentinel 调用 recruit_workers 工具动态决定 Worker titles
              │
              ▼
        运行时创建 Worker Agents
              │
              ▼
        Sentinel / Worker 执行任务并输出结果
```

### 3.2 前端调整

#### 3.2.1 移除 single/squad 视觉区分

- `ChatContainer` 不再根据 `chatMode` 切换 TaskBoard / ExecutionLog；侧边栏显示条件改为“当前会话是否存在团队”。
- `EmptyState` 快捷操作不再硬编码 `teammateMode`，仅发送 prompt。
- `ConversationList` 不再对 single/squad 使用不同样式/图标。
- `AppMode` 简化为 `'chat' | 'auto'`：
  - `chat`：统一对话入口。
  - `auto`：自动化工作流（保留现有自动化入口）。
  - 旧数据中的 `single/squad` 在 UI 层统一映射为 `chat`。

#### 3.2.2 输入框团队选择按钮

- 在输入框左侧新增团队选择按钮。
- 默认状态："智能选择"。
- 下拉列表读取 `TeamTemplate`；当前数据未打通时可先 mock/留空占位。
- 选择后 conversation 记录 `teamTemplateId`；未选择时由 Elder 智能判断。

### 3.3 运行时架构（Worker `SessionRuntime`）

#### 3.3.1 入口改造

`runChat(userMessage, teamTemplateId?)`：

1. 确保 Elder Agent 存在。
2. 如果 `teamTemplateId` 存在：
   - 查询团队模板 `mode`。
   - 按映射表得到 Sentinel title。
   - 调用 `recruitSentinel(title)`。
3. 如果未选择团队：
   - 给 Elder Agent 注册 `recruit_sentinel` 工具。
   - Elder 调用工具，参数包含选中的 `sentinelTitle`。
   - 运行时拦截工具调用，创建 Sentinel。
   - emit `tool_event` 供日志/UI 展示。
4. Elder 继续输出自然语言委派提示。
5. Sentinel 接收任务后：
   - 拥有 `recruit_workers` 工具。
   - 分析任务并调用工具，参数为 Worker title 数组（如 `["developer", "tester"]`）。
   - 运行时拦截工具调用，创建对应 Worker Agents。
   - emit `tool_event`。
6. Worker 执行子任务，结果由 Sentinel 汇总或直接透传。

#### 3.3.2 Sentinel title 映射

> 注：设置页 `CollabMode` 使用 `brainstorming`，运行时 `TeammateMode` 使用 `brainstorm`，二者等价。

| 团队模板模式（CollabMode） | 运行时模式（TeammateMode） | Sentinel title |
|---|---|---|
| pipeline | pipeline | planner |
| supervisor | supervisor | supervisor |
| brainstorming | brainstorm | coordinator |
| swarm / hierarchy | hierarchy | cto |

#### 3.3.3 Worker 动态生成

- Worker title 由 Sentinel 的 LLM 完全动态决定（如 `developer`、`tester`、`designer`）。
- 运行时根据 title 创建 Worker Agent，ID 格式：`{sessionId}:worker:{sanitizedTitle}`，其中 `sanitizedTitle` 为 title 的小写/连字符化版本，避免空格或特殊字符。
- Worker 加载对应 title 的 prompt 文件（当前先留空）。

#### 3.3.4 工具调用拦截机制

- `recruit_sentinel` 和 `recruit_workers` 是**逻辑工具**，其 execute 函数不真正创建 Agent，而是把参数写入一个 Worker 内的注册表/队列。
- `SessionRuntime` 在每轮 Agent stream 后检查该队列，执行实际的 Agent 创建，并向前端发送 `tool_event` chunk。
- 这样既能让 pi-agent-core 正常生成工具调用事件，又能让运行时控制 Agent 生命周期。

### 3.4 Prompt 文件

#### 3.4.1 更新

- `apps/desktop/prompt/elder_boss.md`：
  - 增加 `recruit_sentinel` 工具说明。
  - 要求 Elder 根据任务类型从 `{planner, supervisor, coordinator, cto}` 中选择最合适的 Sentinel title。
  - 明确：选择完成后仍需输出自然语言委派提示，不要在回复中暴露内部 JSON。

#### 3.4.2 新建占位文件

- `apps/desktop/prompt/sentinel_planner.md`
- `apps/desktop/prompt/sentinel_supervisor.md`
- `apps/desktop/prompt/sentinel_coordinator.md`
- `apps/desktop/prompt/sentinel_cto.md`

每个文件先留空，仅包含文件头注释说明其角色，后续按 title 填充具体提示词。

### 3.5 数据模型与类型

- `Conversation`：
  - 新增 `teamTemplateId?: string`。
  - `teammateMode` 标记为 deprecated，逐步移除或由 `teamTemplateId` 推断。
  - `mode` 改为 `'chat' | 'auto'`。
- `TeammateStatus.members`：
  - 包含 Sentinel 和动态 Worker，title 为字符串。
- `AgentTitle`：
  - 从固定枚举扩展为允许动态字符串，或新增 `custom` 枚举项。

### 3.6 日志与状态

- `recruit_sentinel` / `recruit_workers` 工具调用触发 `tool_event` chunk。
- 主线程 Owlery 将 `tool_event` 记录到 `session_logs`（`event = tool.call`）。
- CrystalBall 实时更新 Sentinel/Worker 状态，Teammate 面板展示完整团队。

## 4. 验收标准

- [ ] 前端聊天界面不再显示 single/squad 区分。
- [ ] 输入框出现团队选择按钮（mock 数据即可）。
- [ ] 未选择团队时，Elder Agent 能调用 `recruit_sentinel` 工具选择 Sentinel title。
- [ ] Sentinel 能调用 `recruit_workers` 工具动态创建 Worker。
- [ ] Teammate 面板显示 boss + sentinel + 动态 worker。
- [ ] 会话日志中出现 `message.send`、`agent.invoke`、`tool.call`（含 `recruit_sentinel`、`recruit_workers`）。
- [ ] 新建 4 个 sentinel prompt 占位文件。
- [ ] `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build` 全部通过。

## 5. 风险与待决策

1. **工具调用拦截复杂度**：需要让运行时感知 pi-agent-core 的工具调用并执行副作用，可能需要调整 `PiAgentDriver` 或 Agent 创建流程。
2. **动态 title 类型安全**：`AgentTitle` 扩展后，前端状态展示需要兼容非预定义 title。
3. **Worker 结果汇总策略**：是由 Sentinel 统一汇总，还是直接并行透传 Worker 输出，实现阶段需再细化。
4. **团队模板数据打通**：当前 `TeamTemplate` 与聊天未打通，手动选择功能先预留接口。
