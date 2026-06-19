# Pi Agent 底层驱动文档

## 概述

OwlOS 当前默认聊天入口已经迁移到 Owlery / Teammate 架构。`@earendil-works/pi-agent-core` 不再通过旧的 `agent:create / agent:prompt / agent:stop / agent:event` IPC 直接暴露给前端，而是作为 Owlery 内部可选的底层模型运行时，由 `PiAgentDriver` 适配为 core `AgentDriverChunk`。

```text
Renderer
  -> owlery:* IPC
    -> Owlery runtime
      -> AgentFactory
        -> PiAgentDriver
          -> pi-agent-core Agent
```

## 核心模块

### 1. `agent.ts` — 底层 Agent 构造能力

**位置**: `src/agent/agent.ts`

核心职责：

| 功能 | 说明 |
|------|------|
| **LLM 解析** | 从数据库读取用户配置的模型，自动推断 Provider |
| **System Prompt 加载** | 从外部 `.md` 文件加载角色提示词，支持开发/打包两种路径 |
| **工具注入** | 将会话关联的工具集注入底层 Agent |
| **Plain Agent 创建** | 为 Owlery 的 AgentDriver 创建底层 pi-agent-core Agent |

### 2. `PiAgentDriver.ts` — Owlery 驱动适配器

**位置**: `src/agent/drivers/PiAgentDriver.ts`

`PiAgentDriver` 负责把 pi-agent-core 的事件流转换为 Owlery 统一的 `AgentDriverChunk`：

| pi-agent 事件 | Owlery chunk |
|--------------|--------------|
| `message_update` text | `text_delta` |
| `message_update` thinking | `reasoning_delta` |
| `tool_execution_*` | `tool_event` |
| `agent_end` | `done` |
| 异常 | `error` |

### 3. `owleryRuntime.ts` — 默认运行时装配

**位置**: `src/agent/owleryRuntime.ts`

该模块创建全局 Owlery 实例，并为 `AgentFactory` 注入 driverFactory：

```text
Owlery
  -> AgentFactory
    -> createPlainAgent
    -> PiAgentDriver
```

## 工具集

**位置**: `src/agent/tools.ts`

向底层 Agent 注入核心工具，使其具备自主操控文件系统和执行命令的能力：

| 工具 | 描述 | 参数 |
|------|------|------|
| `read_file` | 读取文件内容 | `path: string` |
| `write_file` | 写入文件（自动创建父目录） | `path: string`, `content: string` |
| `list_directory` | 列出目录内容 | `path: string` |
| `execute_command` | 执行 Shell 命令（30s 超时） | `command: string`, `cwd?: string` |

所有工具通过 `@earendil-works/pi-ai` 的 `Type` 系统定义参数 schema，返回统一的 `AgentToolResult` 格式。

## 当前 IPC 边界

前端只通过 Owlery IPC 进入新架构：

| IPC Channel | 方向 | 作用 |
|-------------|------|------|
| `owlery:activate_session` | Renderer → Main | 激活 Owlery 会话 |
| `owlery:start_chat` | Renderer → Main | 向 Owlery 会话发送用户消息 |
| `owlery:get_buffered_output` | Renderer → Main | 获取会话输出缓冲 |
| `owlery:get_teammate_status` | Renderer → Main | 获取 Teammate 状态 |
| `owlery:chunk` | Main → Renderer | 推送统一流式 chunk |
| `agent:status` | Main → Renderer | 推送 TeammateStatus，事件名仅兼容保留 |

## 安全与密钥管理

**位置**: `src/secure.ts`

- API Key 存储在 Electron `safeStorage` 中。
- 前端通过 Owlery IPC 间接触发模型调用，不直接访问密钥或文件系统。
- 底层工具执行由桌面主进程控制。

## 目录结构

```text
src/agent/
├── agent.ts                 # LLM 解析、Prompt 加载、Plain Agent 创建
├── owleryRuntime.ts         # Owlery 默认运行时装配
├── drivers/PiAgentDriver.ts # pi-agent-core 到 AgentDriverChunk 的适配
├── tools.ts                 # 工具集定义

src/ipc/
├── owlery.ts                # Owlery IPC 通道
├── teammateStatus.ts        # TeammateStatus 推送缓存
├── agents.ts                # Agent 配置 CRUD
├── conversations.ts         # 对话管理
├── messages.ts              # 消息管理
```
