# 设置项持久化到 SQLite 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把外观、通知、API（LLM 管理）三类设置项持久化到 SQLite，启动时统一加载到内存，并按混合策略保存（外观实时保存，通知/API 手动保存）。

**Architecture：** 在 `AppContext` 中维护一份 `settings` 内存缓存，启动时通过现有 `get_settings` IPC 拉取并立即应用外观；外观 setter 先乐观更新 state / DOM，再异步调用 `setSetting` 实时写库；通知/API 页面在本地维护表单状态，点击保存时先更新内存再批量调用 `saveSettingsBatch`。API Key 等敏感字段走 `electron.safeStorage`，不进入 SQLite。

**Tech Stack：** React 18 + TypeScript + Electron IPC + better-sqlite3 + sonner toast

---

## 文件结构

| 文件 | 职责 |
|---|---|
| `apps/web/src/contexts/AppContext.tsx` | 加载全部设置到内存；提供 `settings` / `setSetting` / `saveSettingsBatch`；外观 setter 内部持久化 |
| `apps/web/src/components/settings/AppearanceSettings.tsx` | 无需改动，继续通过 `useApp()` setter 消费 |
| `apps/web/src/components/settings/NotificationSettings.tsx` | 从 `AppContext` 读初始规则/Webhook，新增「保存」按钮批量写库 |
| `apps/web/src/components/settings/ApiSettings.tsx` | 从 `AppContext` 读模型元数据，按需从 safeStorage 读 key；保存时写元数据 + secrets |
| `apps/web/src/services/electron.ts` | 已提供 `getSettings` / `saveSettings` / `getSecret` / `setSecret` / `deleteSecret`，无需改动 |

---

## Task 1: AppContext 统一加载与保存

**Files:**
- Modify: `apps/web/src/contexts/AppContext.tsx`

- [ ] **Step 1: 新增依赖与状态**

  在文件顶部新增导入：

  ```ts
  import { toast } from 'sonner';
  import { getSettings, saveSettings } from '../services/electron';
  ```

  在 `AppContextValue` 接口末尾新增：

  ```ts
  settings: Record<string, unknown>;
  setSetting: (key: string, value: unknown) => Promise<void>;
  saveSettingsBatch: (payload: Record<string, unknown>) => Promise<void>;
  ```

- [ ] **Step 2: 把 DOM 应用逻辑抽成纯函数**

  在 `AppProvider` 内部、所有 `useState` 之后，定义以下只负责更新 DOM 的 helpers（它们不触发保存）：

  ```ts
  const applyDarkMode = useCallback((value: boolean) => {
    if (value) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, []);

  const applyPrimaryColor = useCallback((c: string) => {
    const toHsl = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0;
      const l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };
    try {
      const hsl = toHsl(c);
      document.documentElement.style.setProperty('--aurora-primary-hsl', hsl);
      document.documentElement.style.setProperty('--aurora-from', c);
    } catch { /* ignore */ }
  }, []);

  const applyFontSize = useCallback((s: FontSize) => {
    const sizeMap: Record<FontSize, string> = { sm: '13px', md: '15px', lg: '17px' };
    document.documentElement.style.fontSize = sizeMap[s];
  }, []);

  const applyAnimationLevel = useCallback((v: number) => {
    document.documentElement.style.setProperty('--animation-speed', `${1 + (100 - v) / 100}`);
    document.documentElement.style.setProperty('--animation-opacity', `${v / 100}`);
  }, []);

  const applyLanguage = useCallback((l: Language) => {
    document.documentElement.lang = l;
  }, []);
  ```

- [ ] **Step 3: 新增 settings state 与保存方法**

  在 `AppProvider` 内新增：

  ```ts
  const [settings, setSettingsState] = useState<Record<string, unknown>>({});

  const setSetting = useCallback(async (key: string, value: unknown) => {
    setSettingsState(prev => ({ ...prev, [key]: value }));
    try {
      await saveSettings({ [key]: value });
    } catch (error) {
      console.error(`保存设置 ${key} 失败:`, error);
      toast.error('设置保存失败，请重试');
    }
  }, []);

  const saveSettingsBatch = useCallback(async (payload: Record<string, unknown>) => {
    setSettingsState(prev => ({ ...prev, ...payload }));
    try {
      await saveSettings(payload);
    } catch (error) {
      console.error('批量保存设置失败:', error);
      toast.error('设置保存失败，请重试');
    }
  }, []);
  ```

- [ ] **Step 4: 重构外观 setter，使其内部调用 setSetting**

  替换现有 setter 实现为：

  ```ts
  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => {
      const next = !prev;
      applyDarkMode(next);
      setSetting('darkMode', next).catch(() => {});
      return next;
    });
  }, [applyDarkMode, setSetting]);

  const setPrimaryColor = useCallback((c: string) => {
    setPrimaryColorState(c);
    applyPrimaryColor(c);
    setSetting('primaryColor', c).catch(() => {});
  }, [applyPrimaryColor, setSetting]);

  const setFontSize = useCallback((s: FontSize) => {
    setFontSizeState(s);
    applyFontSize(s);
    setSetting('fontSize', s).catch(() => {});
  }, [applyFontSize, setSetting]);

  const setAnimationLevel = useCallback((v: number) => {
    setAnimationLevelState(v);
    applyAnimationLevel(v);
    setSetting('animationLevel', v).catch(() => {});
  }, [applyAnimationLevel, setSetting]);

  const setLanguage = useCallback((l: Language) => {
    setLanguageState(l);
    applyLanguage(l);
    setSetting('language', l).catch(() => {});
  }, [applyLanguage, setSetting]);
  ```

- [ ] **Step 5: 启动时加载 settings 并应用外观**

  新增一个专门用于启动加载的 effect（放在所有 apply helpers 之后）：

  ```ts
  useEffect(() => {
    getSettings()
      .then(data => {
        setSettingsState(data);

        const dark = typeof data.darkMode === 'boolean' ? data.darkMode : false;
        setDarkMode(dark);
        applyDarkMode(dark);

        const color = typeof data.primaryColor === 'string' ? data.primaryColor : '#00b89a';
        setPrimaryColorState(color);
        applyPrimaryColor(color);

        const validFontSizes: FontSize[] = ['sm', 'md', 'lg'];
        const size = validFontSizes.includes(data.fontSize as FontSize) ? (data.fontSize as FontSize) : 'md';
        setFontSizeState(size);
        applyFontSize(size);

        const level = typeof data.animationLevel === 'number' ? data.animationLevel : 80;
        setAnimationLevelState(level);
        applyAnimationLevel(level);

        const validLanguages: Language[] = ['zh', 'en', 'ja', 'ko'];
        const lang = validLanguages.includes(data.language as Language) ? (data.language as Language) : 'zh';
        setLanguageState(lang);
        applyLanguage(lang);
      })
      .catch(error => {
        console.error('加载设置失败:', error);
      });
  }, [applyDarkMode, applyPrimaryColor, applyFontSize, applyAnimationLevel, applyLanguage]);
  ```

  删除或注释掉原来仅用于设置 `--aurora-from` 的启动 effect：

  ```ts
  // 删除这段
  React.useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.style.setProperty('--aurora-from', primaryColor);
  }, []);
  ```

- [ ] **Step 6: 更新 DEV 模式下的 `useApp` Proxy stub**

  在 `useApp` 的 DEV fallback Proxy 中补充新字段，避免 HMR 时消费 `settings` / `setSetting` / `saveSettingsBatch` 的组件报错：

  ```ts
  if (prop === 'settings') return {};
  if (prop === 'setSetting' || prop === 'saveSettingsBatch' || prop === 'refreshConversations' || prop === 'refreshNotifications' || prop === 'markNotificationRead') {
    return async () => {};
  }
  ```

- [ ] **Step 7: 把新方法暴露到 Provider value**

  在 `AppContext.Provider` 的 value 对象中加入：

  ```ts
  settings, setSetting, saveSettingsBatch,
  ```

- [ ] **Step 8: 验证编译**

  运行：

  ```bash
  cd /home/nan/agentos-owl && pnpm --filter @owl-os/web typecheck
  ```

  预期：无类型错误。

- [ ] **Step 9: Commit**

  ```bash
  git add apps/web/src/contexts/AppContext.tsx
  git commit -m "feat(settings): load settings from SQLite on startup and persist appearance changes"
  ```

---

## Task 2: 确认 AppearanceSettings 无需改动

**Files:**
- 无需修改：`apps/web/src/components/settings/AppearanceSettings.tsx`

- [ ] **Step 1: 确认组件仍通过 `useApp()` setter 消费**

  该文件已使用 `toggleDarkMode`、`setPrimaryColor`、`setFontSize`、`setAnimationLevel`、`setLanguage`，这些 setter 在 Task 1 中已接入持久化。

- [ ] **Step 2: 手动验证实时保存**

  启动桌面端后：
  1. 进入「设置 → 外观与主题」，切换深色/浅色、改主色、调字号。
  2. 关闭并重启应用，确认主题恢复为上次选择。

---

## Task 3: NotificationSettings 接入 SQLite

**Files:**
- Modify: `apps/web/src/components/settings/NotificationSettings.tsx`

- [ ] **Step 1: 新增依赖与导入**

  在文件顶部新增：

  ```ts
  import { useApp } from '@/contexts/AppContext';
  import { toast } from 'sonner';
  ```

- [ ] **Step 2: 从 AppContext 读取初始值**

  在 `NotificationSettings` 组件开头（紧接 `export default function NotificationSettings() {`）加入：

  ```ts
  const { settings, saveSettingsBatch } = useApp();

  const initialRules: NotifRule[] = Array.isArray(settings.notificationRules)
    ? (settings.notificationRules as NotifRule[])
    : PRESET_RULES;

  const initialWebhooks: WebhookEntry[] = Array.isArray(settings.webhooks)
    ? (settings.webhooks as WebhookEntry[])
    : PRESET_WEBHOOKS;
  ```

  把现有的：

  ```ts
  const [rules, setRules] = useState<NotifRule[]>(PRESET_RULES);
  const [webhooks, setWebhooks] = useState<WebhookEntry[]>(PRESET_WEBHOOKS);
  ```

  改为：

  ```ts
  const [rules, setRules] = useState<NotifRule[]>(initialRules);
  const [webhooks, setWebhooks] = useState<WebhookEntry[]>(initialWebhooks);
  ```

- [ ] **Step 3: 增加保存按钮与保存逻辑**

  在组件内部新增保存函数：

  ```ts
  async function handleSave() {
    try {
      await saveSettingsBatch({ notificationRules: rules, webhooks });
      toast.success('通知设置已保存');
    } catch {
      toast.error('保存失败，请重试');
    }
  }
  ```

  在页面标题区域（`<h1>通知与集成设置</h1>` 旁边）添加保存按钮：

  ```tsx
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-lg font-semibold text-slate-100">通知与集成设置</h1>
      <p className="text-sm text-slate-400 mt-1">配置通知规则与 Webhook 集成</p>
    </div>
    <button
      onClick={handleSave}
      className={cn(btnPrimary, 'shrink-0')}
    >
      保存
    </button>
  </div>
  ```

  需要确保 `btnPrimary` 与 `cn` 已在作用域内（文件已导入）。

- [ ] **Step 4: 验证编译**

  运行：

  ```bash
  cd /home/nan/agentos-owl && pnpm --filter @owl-os/web typecheck
  ```

  预期：无类型错误。

- [ ] **Step 5: Commit**

  ```bash
  git add apps/web/src/components/settings/NotificationSettings.tsx
  git commit -m "feat(settings): persist notification rules and webhooks to SQLite"
  ```

---

## Task 4: ApiSettings 接入 SQLite + safeStorage

**Files:**
- Modify: `apps/web/src/components/settings/ApiSettings.tsx`

- [ ] **Step 1: 新增依赖与导入**

  在文件顶部新增：

  ```ts
  import { useEffect, useCallback } from 'react';
  import { useApp } from '@/contexts/AppContext';
  import { getSecret, setSecret, deleteSecret } from '@/services/electron';
  import { toast } from 'sonner';
  ```

- [ ] **Step 2: 新增 key 生成 helper**

  在文件顶部、类型定义之后添加：

  ```ts
  function modelKeySecretId(id: string): string {
    return `llm_model_key/${id}`;
  }
  ```

- [ ] **Step 3: 从 AppContext 读取初始模型列表并回填 key**

  在 `ApiSettings` 组件开头：

  ```ts
  const { settings, saveSettingsBatch } = useApp();

  const initialModels: LLMModel[] = Array.isArray(settings.llmModels)
    ? (settings.llmModels as LLMModel[])
    : PRESET_MODELS;

  const [models, setModels] = useState<LLMModel[]>(initialModels);
  ```

  新增 effect 回填每个模型的 apiKey：

  ```ts
  useEffect(() => {
    let cancelled = false;
    async function loadKeys() {
      const withKeys = await Promise.all(
        models.map(async (m) => {
          try {
            const key = await getSecret(modelKeySecretId(m.id));
            return { ...m, apiKey: key ?? '' };
          } catch {
            return { ...m, apiKey: '' };
          }
        })
      );
      if (!cancelled) setModels(withKeys);
    }
    loadKeys();
    return () => { cancelled = true; };
  }, []);
  ```

- [ ] **Step 4: 保存时写元数据到 SQLite，key 到 safeStorage**

  在 `ApiSettings` 组件内新增：

  ```ts
  const handleSave = useCallback(async () => {
    try {
      const metadata = models.map(({ apiKey, ...rest }) => rest);
      await saveSettingsBatch({ llmModels: metadata });

      await Promise.all(
        models.map(async (m) => {
          const secretId = modelKeySecretId(m.id);
          if (m.apiKey.trim()) {
            await setSecret(secretId, m.apiKey.trim());
          } else {
            await deleteSecret(secretId);
          }
        })
      );

      toast.success('模型配置已保存');
    } catch {
      toast.error('保存失败，请重试');
    }
  }, [models, saveSettingsBatch]);
  ```

- [ ] **Step 5: 删除模型时同步删除 secret**

  修改 `deleteModel`：

  ```ts
  function deleteModel(id: string) {
    setModels(prev => prev.filter(m => m.id !== id));
    deleteSecret(modelKeySecretId(id)).catch((err: unknown) => {
      console.error('删除模型密钥失败:', err);
    });
  }
  ```

- [ ] **Step 6: 页面添加保存按钮**

  把标题区改为：

  ```tsx
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-lg font-semibold text-slate-100">LLM 管理</h1>
      <p className="text-sm text-slate-400 mt-1">配置对话、Embedding 及语音模型，点击列表项可编辑</p>
    </div>
    <button onClick={handleSave} className={cn(btnPrimary, 'shrink-0')}>保存</button>
  </div>
  ```

  注意：`handleSave` 已经用 `useCallback` 包裹，作为 `onClick` 直接传递即可。

- [ ] **Step 7: 验证编译**

  运行：

  ```bash
  cd /home/nan/agentos-owl && pnpm --filter @owl-os/web typecheck
  ```

  预期：无类型错误。

- [ ] **Step 8: Commit**

  ```bash
  git add apps/web/src/components/settings/ApiSettings.tsx
  git commit -m "feat(settings): persist LLM models to SQLite and API keys to safeStorage"
  ```

---

## Task 5: 集成验证

**Files:**
- 无需修改文件，仅运行命令。

- [ ] **Step 1: 类型检查与静态检查**

  ```bash
  cd /home/nan/agentos-owl && pnpm typecheck && pnpm lint
  ```

  预期：`typecheck` 4 个包全部成功，`lint` web + desktop 全部成功。

- [ ] **Step 2: 生产构建验证**

  ```bash
  cd /home/nan/agentos-owl && pnpm --filter @owl-os/web build && pnpm --filter @owl-os/desktop build
  ```

  预期：web 与 desktop 构建均成功（web 可能出现 chunk 大小警告，可忽略）。

- [ ] **Step 3: 手动功能验收**

  1. 启动桌面端，进入「设置 → 外观与主题」：
     - 切换深色模式、改主色、调字号、改动效。
     - 完全关闭应用后重启，确认主题恢复。
  2. 进入「设置 → 通知与集成」：
     - 修改某条规则开关、增删 Webhook。
     - 点击「保存」，重启应用，确认改动保留。
  3. 进入「设置 → API 与开发者（LLM 管理）」：
     - 新增一个模型，填写 name/baseUrl/apiKey，点击「保存」。
     - 重启应用，确认模型列表与 apiKey 都恢复（可点击显示 eye 查看）。
     - 删除该模型，重启应用，确认模型与 key 都不再出现。

- [ ] **Step 4: Commit 验证结果（仅当发现修复时）**

  如果手动测试中发现并修复了问题，单独 commit 修复；否则无需额外 commit。

---

## 自我审查

| Spec 要求 | 对应任务 |
|---|---|
| 启动时从 SQLite 加载所有配置到内存 | Task 1 Step 5 |
| 外观实时自动保存 | Task 1 Step 4 |
| 通知手动保存 | Task 3 Step 3 |
| API 设置手动保存 | Task 4 Step 4 / Step 6 |
| API Key 走 safeStorage | Task 4 Step 3 / Step 4 / Step 5 |
| 删除模型时清理 secret | Task 4 Step 5 |

**Placeholder 检查：** 无 TBD/TODO/"实现 later"；每个步骤包含具体代码与命令。

**类型一致性检查：**
- `setSetting` / `saveSettingsBatch` 签名在 Task 1 定义，后续任务一致使用。
- `modelKeySecretId` 在 Task 4 中统一用于 key 读写删。
