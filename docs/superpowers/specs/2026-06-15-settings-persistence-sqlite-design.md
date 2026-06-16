# 设置项持久化到 SQLite 设计文档

## 背景与目标

目前 OwlOS 的设置页中：
- **外观主题**仅在 `AppContext` 内存中维护，刷新后恢复默认。
- **通知设置**与 **API（LLM 管理）设置**使用本地 state + mock 预设，退出即丢失。

本设计目标：把这三大类设置项持久化到 Electron 主进程的 SQLite，启动时统一加载到内存，并遵循用户指定的保存策略：
- **外观**：实时自动保存。
- **通知 / API**：每页手动保存。
- **API Key 等敏感信息**：走 `electron.safeStorage` 加密，不存 SQLite。

## 范围

涉及的设置页：

1. `apps/web/src/components/settings/AppearanceSettings.tsx`
2. `apps/web/src/components/settings/NotificationSettings.tsx`
3. `apps/web/src/components/settings/ApiSettings.tsx`

不涉及的设置页：
- `LlmAgentSettings`（Pi Agent LLM）：已实现 `safeStorage` + SQLite 持久化，不在本次改动范围。
- 其他设置页（Agent、Team、Workflow、Billing、Security 等）保持现状。

## 存储策略

### SQLite settings 表键值规划

沿用现有 `get_settings` / `save_settings` IPC 的 key-value 结构。

| 设置页 | key | 值类型 | 说明 |
|---|---|---|---|
| 外观 | `darkMode` | `"true"` / `"false"` | 深色模式开关 |
| 外观 | `primaryColor` | string | 极光主色 hex，如 `#00b89a` |
| 外观 | `fontSize` | string | `sm` / `md` / `lg` |
| 外观 | `animationLevel` | string | 数字字符串 `0` ~ `100` |
| 外观 | `language` | string | `zh` / `en` / `ja` / `ko` |
| 通知 | `notificationRules` | JSON string | `NotifRule[]` |
| 通知 | `webhooks` | JSON string | `WebhookEntry[]`（URL 一并存放） |
| API | `llmModels` | JSON string | `LLMModel[]` 元数据，**不含 `apiKey`** |

### 敏感信息安全存储

- API 设置中每个 LLM 模型的 `apiKey` 使用 `electron.safeStorage` 加密。
- Secret key 命名：`llm_model_key/{modelId}`。
- 新增/更新模型时：先写 SQLite 元数据，再写 secret。
- 删除模型时：同步调用 `delete_secret` 删除对应 secret。
- 前端 `ApiSettings` 从 `AppContext` 拿到模型列表后，需再调用 `getSecret('llm_model_key/{id}')` 回填每个模型的 key；列表渲染时允许编辑 key。

## 架构设计

采用**集中式 flat settings map**：

1. `AppContext` 在应用启动时调用 `getSettings()`，把所有设置读到内存 `settings: Record<string, unknown>`。
2. 设置页从 `AppContext` 读取初始值；外观改动实时写回 SQLite，通知/API 改动在点击「保存」后批量写回。
3. `AppContext` 同时负责把外观设置应用到 DOM（class / CSS 变量 / fontSize）。

### 为什么不用每页独立加载

- 用户明确要求“启动时从 SQLite 加载配置到内存”。
- 集中加载避免每个设置页单独请求，减少 IPC 往返。
- 外观设置必须在应用启动时立即生效，否则会出现闪屏。

## 数据流

```
启动
  AppProvider mount
    → getSettings() (IPC get_settings)
    → set settings state
    → applyAppearance(settings) // 写 DOM

外观设置改动
  AppearanceSettings
    → setPrimaryColor(c) (AppContext)
      → update local state
      → update CSS
      → saveSettings({ primaryColor: c })

通知/API 设置改动
  NotificationSettings / ApiSettings
    → 维护本地 form state
    → 用户点击「保存」
      → saveSettingsBatch({ notificationRules: [...], webhooks: [...] })
      → 更新 AppContext settings state
      → ApiSettings 额外调用 setSecret / deleteSecret
```

## AppContext 改动

新增字段与方法：

```ts
interface AppContextValue {
  // ... existing fields

  // 全部设置内存缓存
  settings: Record<string, unknown>;

  // 单个 key 实时保存（外观用）
  setSetting: (key: string, value: unknown) => Promise<void>;

  // 批量保存（通知/API 手动保存用）
  saveSettingsBatch: (payload: Record<string, unknown>) => Promise<void>;
}
```

实现要点：
- `useEffect` 启动时调用 `getSettings()`，失败则使用默认值。
- `setSetting` 先乐观更新本地 `settings` state，再异步调用 `saveSettings`；失败时 toast 提示。
- `saveSettingsBatch` 同样先更新本地 state，再批量写入；失败时保留表单状态供用户重试。
- 外观相关 setter（`setPrimaryColor`、`setFontSize`、`setAnimationLevel`、`setLanguage`、`toggleDarkMode`）内部调用 `setSetting`。

## 组件改动

### AppearanceSettings

- 继续使用 `useApp()` 中的 setter。
- 不需要新增保存按钮，改动即保存。
- 启动时由 `AppProvider` 应用外观。

### NotificationSettings

- 从 `useApp().settings` 读取初始值：
  - `notificationRules`：解析为 `NotifRule[]`，缺省使用 `PRESET_RULES`。
  - `webhooks`：解析为 `WebhookEntry[]`，缺省使用 `PRESET_WEBHOOKS`。
- 页面内用 `useState` 维护表单状态。
- 底部或顶部增加「保存」按钮。
- 点击保存：调用 `saveSettingsBatch({ notificationRules, webhooks })`。

### ApiSettings

- 从 `useApp().settings` 读取 `llmModels`：
  - 解析为 `LLMModel[]`（不含 `apiKey`），缺省使用 `PRESET_MODELS`。
- 页面加载后，对每个模型调用 `getSecret('llm_model_key/{id}')` 回填 `apiKey`。
- 页面内用 `useState` 维护模型列表。
- 新增/编辑/删除模型时更新本地列表。
- 点击「保存」：
  1. 调用 `saveSettingsBatch({ llmModels: modelsWithoutApiKey })`。
  2. 对每个模型调用 `setSecret('llm_model_key/{id}', apiKey)` 或 `deleteSecret`。
- 注意：编辑模型时如果 id 不变，secret key 不变；如果将来支持改 id，需要迁移 secret。

## 序列化约定

- 简单值（bool/number/string）直接以字符串存入 SQLite。
- 对象/数组统一用 `JSON.stringify` 后存入对应 key。
- 读取时解析失败回退到默认值，并在 console 输出警告。

## 错误处理

| 场景 | 行为 |
|---|---|
| 启动加载失败 | console.error，使用页面内置默认值，不阻塞应用启动 |
| 外观实时保存失败 | toast 提示用户；可保持当前 UI 状态，下次启动时若仍未写入则回退 |
| 通知/API 手动保存失败 | toast 提示；保留当前表单，允许重试 |
| secret 读写失败 | 单独 toast 提示；不影响 SQLite 元数据保存 |

## 安全与隐私

- API Key 不进入 SQLite、不进入 `settings` state 明文缓存（回填时按需读取 secret）。
- Webhook URL 属于业务配置，按用户要求存 SQLite。
- safeStorage 不可用时参考现有降级方案（base64，仅开发环境）。

## 验证与测试

- `pnpm typecheck` 通过。
- `pnpm lint` 通过。
- `pnpm --filter @owl-os/web build` 通过。
- `pnpm --filter @owl-os/desktop build` 通过。
- 手动验证：
  1. 修改外观主题，关闭并重启应用，确认主题恢复。
  2. 修改通知规则/Webhook，点击保存，重启后确认恢复。
  3. 添加 LLM 模型（含 API Key），保存后重启，确认模型列表与 key 恢复；删除模型后确认 key 也被清理。

## 后续可扩展

- 当设置项继续增加时，可在 `AppContext` 之上封装类型化的 `useSetting<T>(key, defaultValue)` hook。
- 可将 `settings` state 按页面拆分成独立 slice，但仍由 AppContext 统一加载。
