---
description: "Mandatory session close — consolidate brain, save context, update session state"
---

// turbo-all

## Overview

This workflow powers the `/session-close` command. It ensures every session ends cleanly with memory consolidation, state persistence, and handoff documentation. The BRAIN MAINTENANCE step is MANDATORY — no session should end without it.

**Critical Rule**: Session-close is the symmetric counterpart to start-session. What start-session loads, session-close saves. What session-close writes, start-session reads next time.

## Prerequisites

| Condition | Check |
|-----------|-------|
| Session active | Memory + KANBAN have been loaded |
| Tasks tracked | At least 1 task was worked on |
| NM available | Neural Memory MCP server is connected |

## Step 1: Evidence Verification

Before closing, verify all completed tasks have evidence:

```
FOR each task marked IMPLEMENTED this session:
  CHECK:
    □ Evidence links exist in KANBAN.md
    □ Test results captured (if applicable)
    □ Screenshots/recordings attached (if UI)
    
  IF evidence missing:
    FLAG: "⚠️ Task [ID] missing evidence — add before close"
    CONTINUE (don't block close, but warn)
```

## Step 2: State Persistence

Save all session state to files:

```
PARALLEL:
  ├─ KANBAN.md → verify all task statuses current
  ├─ activeContext.md → update with final state
  ├─ progress.md → APPEND (never overwrite) session summary
  ├─ decisionLog.md → if any decisions made
  └─ current-session.md → update with final metrics
```

## Step 3: BRAIN MAINTENANCE (MANDATORY — §22.2)

This step is NON-NEGOTIABLE. Every session close runs full consolidation:

```
SEQUENTIAL:
  1. nmem_remember(type=context, content="Session summary: [tasks done, decisions, next steps]")
     → Capture session-level learning
     
  2. nmem_consolidate(strategy="all", compact=true)
     → Full consolidation pipeline
     → Orient → Gather → Consolidate → Report
     
  3. nmem_health(compact=true)
     → Final health check
     → Record: grade, purity, neuron count
     
  4. nmem_tool_stats(action="summary", compact=true)
     → Usage report for this session
     → Record: tool call counts, success rates

IF NM unavailable:
  LOG: "⚠️ NM unavailable at session close — consolidation skipped"
  WRITE to activeContext.md: "PENDING: consolidation deferred to next session"
  CONTINUE (don't block close)

IF consolidation timeout (>30s):
  ABORT consolidation
  LOG partial results
  CONTINUE to handoff
```

## Step 4: Handoff Documentation

Prepare handoff for next session:

```
Update memory/sessions/handoff.md:
  - session_id: [timestamp]
  - what_was_done: [list of completed tasks with IDs]
  - what_is_partial: [IN PROGRESS tasks with current state]
  - what_is_blocked: [BLOCKED tasks with reasons]
  - what_should_be_next: [recommended next task]
  - what_must_not_forget: [critical context for next session]
  - brain_health: [grade, purity, consolidation results]
  - tool_usage: [NM calls: X, C+ calls: Y, total: Z]

Update memory/sessions/current-session.md:
  - completed: [timestamp]
  - duration: [calculated]
  - tasks_completed: [count]
  - brain_grade_start: [from start-session]
  - brain_grade_end: [from step 3]
  - tool_calls: {nm: X, cp: Y}
```

## Step 5: Session Event Logging

```
APPEND to memory/sessions/session-events.jsonl:
{
  "event": "session_close",
  "timestamp": "[ISO]",
  "tasks_completed": [count],
  "tasks_blocked": [count],
  "brain_grade": "[A/B/C/D/F]",
  "consolidation_ran": true/false,
  "nm_tool_calls": [count],
  "cp_tool_calls": [count],
  "decisions_made": [count]
}

Update Neural Memory session:
  nmem_session(action="end")
```

## Step 6: Final Report

Output session close report:

```
📋 SESSION CLOSE REPORT
═══════════════════════

⏱️ Session duration: [Xh Ym]
📦 Tasks completed: [N]
🚧 Tasks in progress: [N]
🚫 Tasks blocked: [N]

🧠 Brain Status:
  Grade: [C→B]
  Purity: [72%→78%]
  Consolidation: ✅ ran (merged X, pruned Y, linked Z)

📊 MCP Tool Usage:
  Neural Memory: [X] calls
  Context+: [Y] calls
  Total: [Z] calls

📝 Key Decisions:
  - [decision 1]
  - [decision 2]

➡️ Next Session Should:
  1. [next task]
  2. [unresolved item]
  3. [blocked item to unblock]

⚠️ Warnings:
  - [any issues]
```

## Failure Branches

| Failure | Recovery |
|---------|----------|
| NM server unreachable | Skip brain maintenance, persist state to files, flag for next session |
| KANBAN write fails | Retry once, then log manually |
| Handoff write fails | Critical — output handoff content inline for user to save |
| Consolidation error | Log error, continue with close |
| Evidence missing | Warn but don't block close |

## Integration Points

| System | How this workflow connects |
|--------|--------------------------|
| `workflows/start-session.md` | Start-session reads what this writes (handoff, current-session) |
| `workflows/consolidate.md` | This workflow calls the consolidation pipeline |
| `commands/session-close.md` | This workflow is the ENGINE behind the command |
| `manifests/session-governance.yaml` | Implements `session_close_checklist` |
| `GEMINI.md §22` | Enforces Proactive Intelligence Protocol |
| `neural-memory` MCP server | Consolidation + session management |

## Exit Conditions

| Condition | Result |
|-----------|--------|
| All state saved + consolidation complete + handoff written | ✅ Clean close |
| State saved but NM unavailable | ⚠️ Partial close — pending consolidation |
| Critical write failure | ❌ Dirty close — output all state inline |
