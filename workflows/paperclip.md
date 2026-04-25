---
description: "Paperclip integration — receive tasks, execute with UAIC doctrine, report back"
---

// turbo-all

## Overview

This workflow is the operational engine behind the `/paperclip` command and heartbeat-driven execution. It orchestrates the bridge between Paperclip's control plane and UAIC's execution plane.

**Difference from `commands/paperclip.md`**: The command describes WHAT subcommands exist and WHAT output to show. This workflow describes HOW to orchestrate each interaction — API calls, error handling, state updates, and fallback logic.

## Prerequisites

- Paperclip server running at `localhost:3100` (or graceful degradation)
- UAIC workspace with GEMINI.md §XXIII configured
- MCP servers (Neural Memory + Context+) available

## Step 1: Connection Check

```
ATTEMPT: GET http://localhost:3100/api/health
  TIMEOUT: 3 seconds

IF success:
  paperclip_mode = ACTIVE
  Log: "📎 Paperclip: connected (server healthy)"
ELSE:
  paperclip_mode = OFFLINE
  Log: "📎 Paperclip: offline — KANBAN mode"
  EXIT with fallback to KANBAN workflow
```

## Step 2: Agent Identity Resolution

```
agent_id = env.PAPERCLIP_AGENT_ID
company_id = env.PAPERCLIP_COMPANY_ID

IF agent_id is empty:
  Log: "⚠️ PAPERCLIP_AGENT_ID not set. Run /paperclip setup"
  EXIT

IF company_id is empty:
  GET /api/companies → use first company
  Log: "Auto-detected company: [name]"
```

## Step 3: Task Fetch & Assignment

```
GET /api/companies/:companyId/issues?assignee=:agentId&status=open
  → tasks = response.issues

IF tasks is empty:
  Log: "No assigned tasks. Agent idle."
  POST /api/agents/:agentId/heartbeat { status: "idle" }
  EXIT

SORT tasks by priority: critical > high > medium > low
selected_task = tasks[0]

Log: "📋 Selected task: [title] (priority: [priority])"
```

## Step 4: Atomic Checkout

```
POST /api/issues/:selectedTask.id/checkout

IF 201:
  checkout_success = true
  Log: "🔒 Task checked out: [title]"
ELIF 409:
  Log: "⚠️ Task already checked out. Trying next..."
  RETRY with tasks[1], tasks[2], ...
  IF all tasks checked out:
    Log: "All assigned tasks locked. Agent idle."
    EXIT
ELSE:
  Log: "❌ Checkout failed: [error]"
  EXIT
```

## Step 5: Execute with UAIC Doctrine

```
INVOKE UAIC Execution Model (GEMINI.md PHẦN IV):

1. LOAD OPERATIONAL TRUTH
   → task = Paperclip issue (title, description, parent chain)
   → budget_limit = issue.budget_limit_cents

2. LOAD COGNITIVE TRUTH
   → Read memory (activeContext, progress, decisionLog)

3. LOAD DUAL-BRAIN
   PARALLEL:
     ├─ nmem_recall(task.title + task.description)
     ├─ nmem_session(action="set", task=task.title)
     └─ get_context_tree() if code change needed

4. UNDERSTAND → INSPECT → CLASSIFY → ROUTE
   → Classify task type, risk level, agent assignment

5. EXECUTE
   → Run with UAIC skills, rules, quality gates
   → Track tokens used for cost reporting

6. VERIFY
   → Run quality gates (lint, type-check, tests, etc.)
   → Capture evidence (test output, diffs, screenshots)

7. RECORD
   → nmem_remember(type=appropriate, content=...)
   → Update activeContext, progress
```

## Step 6: Report to Paperclip

```
evidence = compile_evidence(files_changed, tests, screenshots)

POST /api/issues/:taskId/comments
  { content: evidence_summary }

PATCH /api/issues/:taskId
  { status: "done" }

POST /api/companies/:companyId/cost-events
  {
    agent_id: agentId,
    amount_cents: calculated_cost,
    description: "Task [title] execution",
    metadata: { tokens_used, model, quality_gates_passed }
  }

POST /api/issues/:taskId/release
  → Unlock atomic checkout
```

## Step 7: Post-Task State Update

```
PARALLEL:
  ├─ KANBAN.md → sync task status (if Paperclip-KANBAN bridge active)
  ├─ activeContext.md → update current state
  ├─ progress.md → append entry
  └─ nmem_remember(type=decision|insight) → store learnings

POST /api/agents/:agentId/heartbeat
  {
    status: "idle",
    last_task: taskId,
    tasks_completed: count,
    budget_spent_cents: total_cost
  }
```

## Error Handling

| Error | Recovery |
|-------|----------|
| Paperclip server down mid-task | Complete task locally, queue Paperclip report for next heartbeat |
| Budget exceeded during execution | Stop gracefully, report partial progress, release task |
| Checkout lost (timeout) | Re-checkout before reporting, or report without release |
| Task already completed by another agent | Discard work, pick next task |
| Network timeout on API call | Retry once, then fallback to local state |

## Exit Conditions

| Condition | Result |
|-----------|--------|
| All assigned tasks completed | ✅ Agent reports idle, waits for next heartbeat |
| Budget hard-stop reached | ⏹ Agent halts, reports budget exhaustion |
| Paperclip server goes offline mid-session | ⏸ Switch to KANBAN mode, continue locally |
| 3 consecutive task failures | 🚫 Escalate to reporting manager in org chart |

## Metrics & Observability

After each heartbeat cycle, emit:
```
📎 Paperclip Heartbeat Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tasks completed: [N]
Cost reported: $[X.XX]
Budget remaining: $[Y.YY]
Quality gates passed: [N]/[N]
Brain health: [grade]
NM calls: [N], C+ calls: [M]
```
