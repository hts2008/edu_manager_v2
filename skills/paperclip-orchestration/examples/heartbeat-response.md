# Heartbeat Response Pattern

> Example: How a UAIC agent responds to a Paperclip heartbeat invocation.

## Scenario

Paperclip invokes a `gemini-local` agent (CTO role) via heartbeat.
The agent checks for assigned issues, checksout the highest-priority task, executes with UAIC doctrine, and reports back.

## Step-by-Step Flow

### 1. Agent Receives Heartbeat

Paperclip spawns the agent with context:
```
Company: "TechStartup Alpha"
Goal: "Build AI-powered note-taking app, $1M MRR in 3 months"
Agent Role: CTO
Budget Remaining: $450.00
Heartbeat Interval: 5 minutes
```

### 2. Agent Checks Assigned Tasks

```http
GET http://localhost:3100/api/companies/comp_abc123/issues?assignee=agent_cto_01&status=open
```

Response:
```json
[
  {
    "id": "issue_789",
    "title": "Design database schema for note storage",
    "priority": "high",
    "parent_id": "issue_456",
    "parent_title": "Build core note-taking backend",
    "status": "open",
    "budget_limit_cents": 5000
  },
  {
    "id": "issue_790",
    "title": "Review frontend team's React component PR",
    "priority": "medium",
    "status": "open"
  }
]
```

### 3. Agent Checkouts Highest-Priority Task

```http
POST http://localhost:3100/api/issues/issue_789/checkout
```

Response: `201 Created` — atomic lock acquired.

If `409 Conflict` → skip, pick next task.

### 4. Agent Executes with UAIC Doctrine

The agent now follows the standard UAIC execution model (GEMINI.md PHẦN IV):

```
1. LOAD OPERATIONAL TRUTH
   → Task: "Design database schema for note storage"
   → Parent chain: note storage → core backend → $1M MRR app
   → Budget limit: $50.00

2. LOAD COGNITIVE TRUTH
   → activeContext.md: current technical state
   → decisionLog.md: past schema decisions

3. LOAD DUAL-BRAIN
   → nmem_recall("database schema patterns note-taking app")
   → get_context_tree() → project structure

4. UNDERSTAND → INSPECT → CLASSIFY
   → Task type: schema design
   → Risk: HIGH (database changes)
   → Agent: database-architect
   → Review mode: adversarial

5. EXECUTE
   → Design schema with tables: notes, folders, tags, note_tags
   → Include: indexes, FK constraints, timestamps, migration script
   → Follow UAIC rules/database.md

6. VERIFY
   → Run migration dry-run
   → Type-check schema types
   → Security review (injection vectors)

7. RECORD
   → nmem_remember(type=decision, content="Schema uses JSONB for note content...")
   → activeContext.md → update
   → receipt → emit
```

### 5. Agent Reports Results to Paperclip

Post completion comment:
```http
POST http://localhost:3100/api/issues/issue_789/comments
Content-Type: application/json

{
  "content": "Schema designed and migration created.\n\nTables: notes, folders, tags, note_tags\nIndexes: 4 (title, created_at, folder_id, full-text)\nMigration: 001_create_notes_schema.sql\n\nEvidence: Migration dry-run passed, type-check clean."
}
```

Update issue status:
```http
PATCH http://localhost:3100/api/issues/issue_789
Content-Type: application/json

{
  "status": "done"
}
```

### 6. Agent Reports Cost

```http
POST http://localhost:3100/api/companies/comp_abc123/cost-events
Content-Type: application/json

{
  "agent_id": "agent_cto_01",
  "amount_cents": 1250,
  "description": "Database schema design for note storage",
  "metadata": {
    "tokens_input": 15000,
    "tokens_output": 8000,
    "model": "gemini-2.5-pro",
    "task_id": "issue_789",
    "quality_gates_passed": ["type-check", "migration-dry-run", "security-review"]
  }
}
```

### 7. Agent Releases Task Lock

```http
POST http://localhost:3100/api/issues/issue_789/release
```

### 8. Agent Checks Next Task or Sleeps

If more tasks in queue → repeat from step 3.
If no more tasks → report heartbeat status and sleep until next invocation.

```http
POST http://localhost:3100/api/agents/agent_cto_01/heartbeat
Content-Type: application/json

{
  "status": "idle",
  "last_task": "issue_789",
  "tasks_completed": 1,
  "budget_spent_cents": 1250,
  "next_heartbeat": "2026-04-01T17:05:00Z"
}
```

## Key Integration Rules

1. **Always checkout before work** — prevents duplicate effort
2. **Always report cost** — budget tracking is Paperclip's core value
3. **Always follow UAIC quality gates** — regardless of Paperclip's deadline pressure
4. **Always release tasks** — even on failure, release the lock
5. **Respect budget limits** — if `budget_remaining < estimated_cost`, report and skip
6. **Post evidence as comments** — Paperclip's activity log is the audit trail
