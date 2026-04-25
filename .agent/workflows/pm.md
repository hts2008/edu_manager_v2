---
description: "PM lifecycle engine — orchestrates intake, planning, dispatch, QA, and delivery across specialist agents"
---

// turbo-all

## Overview

This workflow powers the `/pm` command. It orchestrates the full delivery lifecycle from free-form intake through verified delivery. Unlike the command (which defines WHAT), this workflow defines HOW — execution sequencing, parallel/serial decisions, exit conditions, and failure branches.

**Difference from `commands/pm.md`**: The command is the user-facing contract (invocation, subcommands, output formats). This workflow is the internal execution engine (state machine, branching logic, quality gates, error handling).

## Entry Conditions

| Condition | Check |
|-----------|-------|
| Session active | `/start-session` has been run (or implicit warm-up triggered) |
| KANBAN loaded | Sprint state known |
| Memory loaded | activeContext.md at minimum |
| Request classified | Intake phase must produce: task_type, risk, scope |

## Lifecycle State Machine

```
[INTAKE] → [PLAN] → [DISPATCH] → [QA/QC] → [DELIVER]
                         ↑           |
                         └───────────┘ (gate failure → re-dispatch)
```

### Branch: Subcommand Short-Circuit

If the invocation is a subcommand (`/pm status`, `/pm standup`, etc.), skip the full lifecycle:

```
/pm status    → KANBAN.md read → format dashboard → OUTPUT
/pm standup   → progress.md + KANBAN.md → format standup → OUTPUT
/pm retro     → progress.md + learned-patterns + error-catalog → format retro → OUTPUT
/pm budget    → progress.md + session count → format efficiency → OUTPUT
/pm escalate  → current blockers → format escalation → OUTPUT
```

These are READ-ONLY operations — no dispatch, no QA, no delivery.

### Full Lifecycle (free-form / plan / triage / architecture / release)

#### State 1: INTAKE

```
PARALLEL:
  ├─ Parse request → extract action, target, constraints
  ├─ Load KANBAN → sprint state, blockers
  └─ Load activeContext → current technical state

THEN:
  Classify → task_type, risk, scope
  
  IF scope == XL:
    HALT → "Request too large. Decomposing into sub-stories..."
    Run task decomposition
    Each sub-story enters lifecycle independently
    
  IF task not on KANBAN:
    Add task row: ID, description, agent=TBD, status=PLANNED
```

#### State 2: PLAN

```
Build execution plan:
  1. Problem framing
  2. Success criteria
  3. Hidden requirements extraction (Engine 1, Layer 3)
  4. Task decomposition (if multi-step)
  5. Agent assignment (from manifests/routing.yaml)
  6. Dependency graph
  7. Review mode selection:
     - low risk → self-check
     - medium risk → paired (builder + judge)
     - high risk → adversarial (builder + security-auditor/judge)
  8. Quality gates selection (from manifests/quality-gates.yaml)
  9. Rollback plan

IF risk == high:
  HALT → Present plan to user → Require approval before dispatch
ELSE:
  Proceed to dispatch
```

#### State 3: DISPATCH

```
FOR each task in dependency order:
  
  IF task has unresolved dependency:
    WAIT or SKIP (mark BLOCKED if dependency also blocked)
  
  Assign to specialist agent:
    PROVIDE: task description, acceptance criteria, relevant files, context
    
  Execute:
    CLASSIFY task_type from [coding, qa, ui, other]
    
    IF task_type == "coding" (create, refactor, architecture, implement):
      SPAWN: run_command scripts/cli-spawn.ps1 -CLI claude -TaskType coding -Task $prompt -WorkDir $cwd -TaskId $taskId
      IF exit_code == 2 (quota exhausted):
        LOG "Claude quota exhausted - Antigravity role-switch"
        EXECUTE task inline (Antigravity native) - do NOT delegate to Codex/Gemini
        
    ELSE IF task_type == "qa" (debug, review, test, verify, check):
      SPAWN: run_command scripts/cli-spawn.ps1 -CLI codex -TaskType qa -Task $prompt -WorkDir $cwd -TaskId $taskId
      IF exit_code == 2 (quota exhausted):
        LOG "Codex quota exhausted - Antigravity role-switch"
        EXECUTE task inline (Antigravity native)
        
    ELSE IF task_type == "ui" (ui-ux, frontend, design, css, layout):
      SPAWN: run_command scripts/cli-spawn.ps1 -CLI gemini -TaskType ui -Task $prompt -WorkDir $cwd -TaskId $taskId
      IF exit_code == 2 (quota exhausted):
        LOG "Gemini quota exhausted - Antigravity role-switch"
        EXECUTE task inline (Antigravity native)
        
    ELSE:
      EXECUTE task inline (Antigravity native) - no CLI spawn for miscellaneous tasks
    
    IF exit_code == 0:
      READ log from logs/cli-sessions/ -> extract results
      READ meta.json -> record execution metadata
    ELSE IF exit_code == 3 (timeout):
      DECOMPOSE task -> retry with smaller subtasks
    ELSE IF exit_code == 4 (CLI not found):
      EXECUTE inline - CLI unavailable
    
    STRICT RULE: NEVER cross-CLI fallback. Always Antigravity role-switch.
    
  Collect output:
    Files changed, test results, screenshots, errors
    
  Update tracking:
    KANBAN row → IN PROGRESS → IMPLEMENTED (after verification)
    progress.md → append entry
    
  IF agent reports failure:
    failure_count += 1
    IF failure_count < 3:
      Retry with adjusted approach
    ELSE:
      ESCALATE → Level 2 (re-route) or Level 3 (user input)

PARALLEL tasks: execute any independent tasks simultaneously
```

#### State 4: QA/QC

```
Run quality gates based on task risk:

LOW risk:
  ├─ lint
  ├─ type-check
  └─ unit tests

MEDIUM risk:
  ├─ All LOW gates
  ├─ integration tests
  ├─ memory-update check
  └─ project-control check (KANBAN updated)

HIGH risk:
  ├─ All MEDIUM gates
  ├─ security scan
  ├─ judge-agent review
  ├─ browser/UI verification (if applicable)
  └─ session-hygiene check

IF gate failure:
  Route back to DISPATCH for fix
  Re-run failed gate
  IF 3 consecutive failures on same gate:
    ESCALATE to user with error context

THEN: verify evidence exists
  - Test output captured
  - Screenshots/recordings if UI
  - Diff summary available
```

#### State 5: DELIVER

```
1. Compile PM report:
   - Request summary
   - Deliverables (files changed, tests, evidence)
   - Quality gates passed
   - KANBAN state after update
   - Risks remaining
   - Next recommended actions

2. Update all state:
   PARALLEL:
     ├─ KANBAN.md → task status = IMPLEMENTED + evidence links
     ├─ activeContext.md → reflect new state
     ├─ progress.md → append delivery entry
     └─ current-session.md → update touched files

3. Check context health:
   IF estimated context usage > 80%:
     Trigger handoff preparation
     Suggest new chat with /start-session

4. Emit receipt to receipts/
```

## Failure Branches

| Failure | Recovery |
|---------|----------|
| Agent returns empty output | Retry with more specific prompt |
| Gate fails after fix attempt | Try different approach, then escalate |
| Dependency task is BLOCKED | Skip or request user unblock decision |
| Context window exhaustion | Save state → handoff.md → suggest new session |
| CLI subagent quota exhausted | Antigravity role-switch (NEVER cross-CLI fallback) |
| CLI subagent timeout | Decompose task into smaller subtasks, retry |
| CLI binary not found | Execute inline in Antigravity |
| User rejects plan | Return to PLAN with user feedback |
| Scope creep detected | HALT → re-classify → split or get approval |

## Agent Assignment Matrix

| Task Type | Primary Agent | QA Agent | Review Mode |
|-----------|--------------|----------|-------------|
| Create UI | frontend-specialist | test-engineer | paired |
| Create API | backend-specialist | test-engineer | paired |
| Schema change | database-architect | security-auditor | adversarial |
| Bug fix | debugger | test-engineer | self-check |
| Security audit | security-auditor | penetration-tester | adversarial |
| Performance | performance-optimizer | — | self-check |
| Deploy | devops-engineer | release-manager | paired |
| Docs | documentation-writer | — | self-check |
| Plan | project-planner | — | self-check |
| Refactor | code-archaeologist | test-engineer | paired |
| Release | release-manager | security-auditor | adversarial |

## Exit Conditions

| Condition | Result |
|-----------|--------|
| All subtasks IMPLEMENTED + gates passed + evidence attached | ✅ Delivery complete |
| User explicitly cancels | ⏹ Halt — save partial state to handoff.md |
| Context exhaustion before completion | ⏸ Pause — write handoff, recommend /start-session |
| Unresolvable blocker after all escalation levels | 🚫 Blocked — document in KANBAN + handoff |

## Context+ Integration

When Context+ is available (`.mcp.json` defines `context-plus`):

| PM Phase | Context+ Tool | Purpose |
|----------|--------------|---------|
| **INTAKE** | `get_context_tree` | Understand project scope for classification |
| **PLAN** | `semantic_code_search` | Find existing patterns before planning new code |
| **PLAN** | `get_blast_radius` | Assess impact for risk classification |
| **PLAN** | `get_feature_hub` | Map feature dependencies for decomposition |
| **DISPATCH** | `get_blast_radius` | Pass to specialist for pre-edit verification |
| **QA/QC** | `run_static_analysis` | Quality gate verification |

**Mandatory**: For MEDIUM+ risk, `get_blast_radius` must run during PLAN before DISPATCH.

**Fallback**: If Context+ unavailable → proceed with file tree + grep; log degradation.

