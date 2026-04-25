---
description: "Orchestrated session bootstrap â€” detect workspace state, load context pyramid, report health, recommend next task"
---

// turbo-all

## Overview

This workflow is the operational engine behind the `/start-session` command. It orchestrates context loading, health verification, and state reporting as a single atomic boot sequence.

**Difference from `commands/start-session.md`**: The command describes WHAT to do and WHAT to output. This workflow describes HOW to orchestrate it â€” execution order, parallel steps, error handling, exit conditions.

## Prerequisites

- Workspace root contains `GEMINI.md`
- Agent executing this has read access to `memory/` and project root

## Step 1: Detect Mode

Determine workspace state by checking file existence signals:

```
signal_kanban    = exists(KANBAN.md)
signal_memory    = exists(memory/memory-bank/activeContext.md)
signal_handoff   = exists(memory/sessions/handoff.md) AND is_non_empty(memory/sessions/handoff.md)
signal_session   = exists(memory/sessions/current-session.md) AND is_non_empty(memory/sessions/current-session.md)

IF NOT signal_kanban OR NOT signal_memory:
  mode = "FRESH_INIT"
ELIF signal_handoff AND signal_session:
  mode = "WARM_UP"
ELSE:
  mode = "RESUME"
```

Report: `"ðŸ” Mode detected: [mode] â€” Signals: kanban=[T/F], memory=[T/F], handoff=[T/F], session=[T/F]"`

## Step 2: Execute Mode-Specific Sequence

### FRESH_INIT Path

```
2a. Verify repo structure (12 directories)
    â†’ If missing critical dirs: ABORT with suggestions
2b. Run discovery questionnaire (interactive)
2c. Initialize memory-bank (7 files)
    â†’ PARALLEL: create activeContext, progress, decisionLog, techContext, systemPatterns, projectBrief, productContext
2d. Initialize KANBAN.md (sprint scaffold)
2e. Initialize sessions (current-session, handoff)
2f. Verify routing files (GEMINI.md, registry.yaml, routing.yaml)
2g. Emit ready-to-work report artifact
```

### RESUME Path

```
2a. Load KANBAN.md â†’ extract sprint state, task counts, blockers
2b. PARALLEL load memory:
    â”œâ”€ activeContext.md
    â”œâ”€ progress.md (last 5 entries)
    ├─ activeContext.md
    ├─ progress.md (last 5 entries)
    ├─ decisionLog.md
    ├─ techContext.md
    └─ systemPatterns.md
2c. PARALLEL load brain:
    ├─ learned-patterns.md
    └─ error-catalog.md
2c-nm. DUAL-BRAIN HEARTBEAT (V4.5 — §22.1 MANDATORY):
    PARALLEL:
      ├─ nmem_recall("current project context") → cross-session experience
      ├─ nmem_session(action="set", feature="...", task="...") → register session
      ├─ nmem_health(compact=true) → brain grade + purity
      └─ get_context_tree() → code structure awareness
    IF brain_grade < B OR purity < 75%:
      AUTO-TRIGGER: /consolidate --force
      Log: "⚠️ Brain grade below B — auto-consolidation triggered"
2d. Health check:
    ├─ KANBAN ↔ activeContext sync (sprint name match?)
    ├─ No orphan IN PROGRESS tasks (check progress for recent entry)
    ├─ No stale BLOCKED tasks (> 3 sessions unaddressed)
    └─ Brain health from 2c-nm (already loaded)
2d-ppc. PAPERCLIP HEALTH CHECK (§XXIII — optional):
     ATTEMPT: GET http://localhost:3100/api/health (timeout 3s)
     IF success:
       paperclip_mode = ACTIVE
       GET /api/companies/:cid/issues?assignee=:aid&status=open → assigned tasks
       Log: "📎 Paperclip: active — [N] tasks assigned"
     ELSE:
       paperclip_mode = OFFLINE
       Log: "📎 Paperclip: offline — KANBAN mode"
2e. Detect active story/phase/task → recommend next action
     IF paperclip_mode == ACTIVE:
       Primary task source = Paperclip assigned issues
     ELSE:
       Primary task source = KANBAN.md IN PROGRESS tasks
2f. Emit resume report artifact (MUST include: NM call count, C+ call count, health grade)
```

### WARM_UP Path

```
2b. Load current-session.md â†’ stopping point, files touched, pending validations
2c. Load KANBAN.md â†’ current sprint state
2d. PARALLEL load memory (same as RESUME 2b)
2e. Reconstruct working state:
    â”œâ”€ Read first 20 lines of each file in current-session.files_touched
    â””â”€ Check if any file has been modified since last session
2f. Environment check:
    â”œâ”€ git status (uncommitted changes?)
    â”œâ”€ git log -3 --oneline (recent commits)
    â””â”€ build/test readiness (package.json â†’ node_modules?)
2g. Emit context recovery report artifact
```

## Step 3: Validate Session State

After mode execution, verify:

```
â–¡ KANBAN state is loaded and understood
â–¡ Active task is identified (or "no active task" reported)
â–¡ Memory is loaded (at least activeContext + progress)
â–¡ Any blockers are surfaced
â–¡ Next recommended action is stated
â–¡ Report artifact is emitted
```

If any check fails: report `"âš ï¸ Session start incomplete: [missing items]"` but continue.

## Step 4: Update Session Tracking

```
Update memory/sessions/current-session.md:
  - started: [timestamp]
  - objective: [from detected mode + active task]
  - active_task_id: [from KANBAN]
  - files_touched: []  (empty, will fill during session)
  - pending_validations: []
  - unresolved_risks: [from previous handoff]

Update Neural Memory session (V4.1):
  - nmem_session(action="set", feature="[project]", task="[active task]", progress=0)
  - nmem_eternal(action="save", project_name="[project]") if FRESH_INIT
```

## Exit Conditions

| Condition | Result |
|-----------|--------|
| FRESH_INIT completed with initialized KANBAN | âœ… Session ready |
| RESUME completed with active task identified | âœ… Session ready |
| WARM_UP completed with context recovered | âœ… Session ready |
| Critical files missing (GEMINI.md, registry.yaml) | âŒ Abort â€” ask user to run workspace setup |
| KANBAN â†” memory desync detected | âš ï¸ Continue â€” flag desync for manual reconciliation |

## Integration Points

| System | How this workflow connects |
|--------|--------------------------|
| `manifests/session-governance.yaml` | This workflow IMPLEMENTS the `session_start_checklist` |
| `policies/session-governance.yaml` | This workflow ENFORCES `session_start.required_reads` |
| `manifests/quality-gates.yaml` gate-11 | This workflow SATISFIES `session-hygiene` quality gate |
| `skills/memory/summary-compaction/session-start.md` | This workflow OPERATIONALIZES the skill-level protocol |
| `commands/start-session.md` | This workflow is the ENGINE behind the command |
| `workflows/session-close.md` (if exists) | Symmetric counterpart â€” close saves state that start loads |
| `neural-memory` MCP server | V4.1: cross-session recall via nmem_recall + nmem_session |
| `docs/mcp/neural-memory-integration.md` | Full NM setup and tool reference |
| Paperclip server (localhost:3100) | V4.6: optional control plane connectivity check |
| `skills/paperclip-orchestration/SKILL.md` | Paperclip heartbeat protocol and API reference |
| `workflows/paperclip.md` | Paperclip execution workflow (post-session-start) |
