# OwlOS Personal Site — User Acquisition Report

## Overview

This report analyzes how OwlOS acquires, manages, and tracks users based on the current codebase. OwlOS is an Electron desktop application with a local-first architecture — user data lives in a SQLite database on the user's machine. There is no cloud sign-up, no telemetry, and no external user acquisition pipeline at this stage.

---

## 1. User Onboarding Flow

### 1.1 First Launch — Auto-Created Default User

On first launch, the system automatically provisions a default user account via `src/db/seed/users.ts`. No sign-up form is shown:

- **Username**: `"admin"`
- **Password**: `"admin"` (hashed with Argon2)
- **Display Name**: `"管理员"`

This is a zero-friction onboarding model — the user lands directly in the app without any registration step.

### 1.2 Sign-Up / Sign-In (If Accessed)

The IPC handlers in `src/ipc/auth.ts` expose three endpoints:

| IPC Channel | Behavior |
|---|---|
| `sign_up` | Creates a new user with Argon2-hashed password. Rejects if username exists. |
| `sign_in` | Verifies username + password against the database. |
| `get_profile` | Returns user profile by ID. |

However, the renderer currently shows only a minimal auth flow — most sessions operate as the default `admin` user.

### 1.3 Users Table Schema

```sql
users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  avatar TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
)
```

---

## 2. User Identity & Session Tracking

### 2.1 Audit Logger (`src/services/AuditLogger.ts`)

A singleton `AuditLogger` records every user action into two log tables:

| Table | Purpose | Retention |
|---|---|---|
| `audit_logs` | User-level actions (LLM config changes, agent CRUD, team CRUD, knowledge base uploads, extension management, settings changes, log clears) | **Permanent** (no automatic purge) |
| `session_logs` | Conversation/session runtime events (conversation creation, message send, agent invoke start/complete/fail, tool calls) | **7-day rolling window** (purged on list and at startup) |

All entries include:
- `user_name` (audit logs) / `agent_name` (session logs)
- `timestamp`
- `ip` (hardcoded to `127.0.0.1` — local-only)
- `result` (success/failed/running)

### 2.2 Conversation Detail Persistence

`src/services/ConversationDetailStore.ts` stores full conversation transcripts as JSONL files in `~/.config/owl-os/conversation-details/`. Each conversation gets its own `.jsonl` file. Files older than 7 days are automatically purged at startup.

---

## 3. How the Renderer Gets User Data

The renderer (frontend) communicates with the main process exclusively through Electron IPC. There is **no external HTTP API for user data**. Key IPC channels for user-related data:

| Channel | Direction | Purpose |
|---|---|---|
| `sign_in` | Renderer → Main | Authenticate |
| `sign_up` | Renderer → Main | Register new user |
| `get_profile` | Renderer → Main | Fetch user profile |
| `get_settings` | Renderer → Main | Read all settings |
| `save_settings` | Renderer → Main | Persist settings changes |
| `get_audit_logs` | Renderer → Main | Read audit trail |
| `list_conversations` | Renderer → Main | Read conversation list |

---

## 4. LLM / Agent Usage as Proxy for User Engagement

The clearest signals of user engagement come from the AI usage layer:

### 4.1 Session Runtime (`src/runtime/SessionRuntime.ts`)

Each user message triggers the full multi-agent pipeline:

1. **Elder Agent** (boss) — receives user message, decides whether to recruit a Sentinel
2. **Sentinel Agent** (supervisor/planner/coordinator/CTO) — receives the task, decides whether to recruit Workers
3. **Worker Agents** — execute sub-tasks

The runtime emits status events (`TeammateStatus`) for the frontend to display agent work states.

### 4.2 Billing / Token Tracking

The `billing_records` table tracks token consumption and cost per model per day. This is the closest signal to "user activity volume":

```sql
billing_records (
  id TEXT PRIMARY KEY,
  record_date TEXT NOT NULL,
  tokens INTEGER NOT NULL DEFAULT 0,
  cost REAL NOT NULL DEFAULT 0,
  model TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
)
```

### 4.3 LLM Config Auto-Import

At startup, the migration system (`src/db/migrations.ts`) automatically imports DeepSeek LLM configuration from the user's existing `opencode` config files (`~/.config/opencode/opencode.json` or `~/.opencode.json`). This is a smart onboarding touch — if the user already has AI provider credentials, OwlOS picks them up automatically.

---

## 5. What's NOT Tracked (Telemetry Gaps)

OwlOS currently has **zero telemetry or analytics**. The following are not collected:

- ❌ App launch events
- ❌ Feature usage (which tools/skills/agents are used)
- ❌ Session duration
- ❌ User OS / hardware info
- ❌ Crash reports (beyond Electron's built-in)
- ❌ Referral source
- ❌ Conversion funnels

This is by design — as a local-first desktop app, OwlOS intentionally avoids phoning home.

---

## 6. Summary: User Lifecycle

```
┌─────────────┐
│ First Launch │──► Auto-provision "admin" user
└─────────────┘
       │
       ▼
┌─────────────────┐
│ LLM Config Check│──► Auto-import from opencode if available
└─────────────────┘
       │
       ▼
┌─────────────┐
│ User Chat    │──► SessionRuntime kicks off Elder→Sentinel→Worker pipeline
└─────────────┘
       │
       ▼
┌──────────────────┐
│ Logging & Billing│──► audit_logs (permanent) + session_logs (7-day) + billing_records
└──────────────────┘
```

---

## 7. Gaps & Recommendations

| Gap | Recommendation |
|---|---|
| No user analytics | If user acquisition metrics are needed, add optional, privacy-respecting telemetry behind a consent toggle |
| Only one "site" (local) | OwlOS is a desktop app, not a website — there is no concept of "sites" or "visitors". To get site visitors, the app would need a companion web service or a built-in web server analytics module |
| No referral tracking | No mechanism exists to attribute users to acquisition channels |
| Billing data underutilized | `billing_records` could be queried to produce engagement dashboards — add a reporting IPC handler |
| Audit logs never pruned | `audit_logs` could grow unbounded; consider adding a retention policy (e.g., 90 days) |
| Hardcoded user_name | The `AuditLogger` uses a hardcoded `"当前用户"` user name; it should pull the actual logged-in user's name |
