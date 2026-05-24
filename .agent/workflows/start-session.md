---
description: "Orchestrated session bootstrap — detect workspace state, load context pyramid, report health, recommend next task"
---

// turbo-all

## Overview

This workflow is the operational engine behind the `/start-session` command. It orchestrates context loading, health verification, and state reporting as a single atomic boot sequence.

**Difference from `commands/start-session.md`**: The command describes WHAT to do and WHAT to output. This workflow describes HOW to orchestrate it — execution order, parallel steps, error handling, exit conditions.

## Prerequisites

- Workspace root contains `GEMINI.md`
- Agent executing this has read access to `memory/` and project root

## 🚨 ZERO-FREEZE EXECUTION GUARD (BẮT BUỘC)

Trong Antigravity 2.x, mọi cuộc gọi MCP tool (`nmem_*`, `contextplus_*`) có thể bị block do Ollama/server đang khởi động. **AI Agent thực thi workflow này PHẢI tuân thủ nghiêm ngặt:**
1. **Timeout tối đa 5 giây**: Mọi cuộc gọi đến `nmem_recall`, `nmem_session`, `nmem_health`, `get_context_tree` hay `semantic_code_search` PHẢI tự động hết hiệu lực (abort/timeout) nếu sau 5 giây không phản hồi.
2. **Graceful Degradation Override**: Nếu bất kỳ tool nào bị timeout hoặc báo lỗi kết nối:
   * **BỎ QUA ngay lập tức**, không retry vô hạn.
   * Ghi log cảnh báo cụ thể: `[WARN] Neural Memory/Context+ tool failed: [error details]. Falling back to manual degraded mode.`
   * Tiếp tục các bước tiếp theo của boot sequence (đọc memory-bank thủ công), **tuyệt đối không được treo IDE**.
3. **Phát hiện đúng Brain**: Neural Memory server chạy cục bộ phải kết nối đúng brain `edu_manager`. Nếu tool trả về brain `default` hoặc project khác, log warning và tiếp tục chạy thủ công với memory cục bộ của project hiện tại.

## Step 0: Infrastructure Auto-Start + Health Check (V4.4)

Before any session logic, **auto-start** brain infrastructure then verify:

```
STEP 0a — AUTO-START:
  Run if present: powershell -ExecutionPolicy Bypass -File ".\scripts\start-infrastructure.ps1"
  If scripts/start-infrastructure.ps1 is missing, skip auto-start and continue with degraded mode.
  This script:
    ├─ Checks ports 9100 (NM), 11434 (Ollama), 3333 (Dashboard)
    ├─ Starts any service that is not running (as hidden background process)
    ├─ Waits 4s for initialization
    └─ Reports final status

STEP 0b — VERIFY (after script completes):
  PARALLEL CHECK:
    ├─ NM_SERVER = Test-NetConnection 127.0.0.1 -Port 9100
    ├─ OLLAMA = Test-NetConnection 127.0.0.1 -Port 11434
    └─ DASHBOARD = Test-NetConnection 127.0.0.1 -Port 3333

  RESULTS:
    IF NM_SERVER.TcpTestSucceeded == False:
      WARN "⚠️ Neural Memory server failed to start on :9100"
      SUGGEST "Manual: nmem serve -p 9100 --brain edu_manager"
      Continue with degraded mode (NM tools will fail gracefully)

    IF OLLAMA.TcpTestSucceeded == False:
      WARN "⚠️ Ollama failed to start on :11434"
      SUGGEST "Manual: ollama serve"
      Continue with degraded mode (Context+ semantic tools will fail)

    IF DASHBOARD.TcpTestSucceeded == False:
      WARN "⚠️ Dashboard failed to start on :3333"
      SUGGEST "Manual: node tools/brain-dashboard/server.js"
      Continue (dashboard is optional for session)

    IF all passed:
      REPORT "✅ Infrastructure healthy: NM(:9100) + Ollama(:11434) + Dashboard(:3333)"
```

After infrastructure check, also run quick brain health:

```
nmem_health() → grade + purity score
IF grade < 'C':
  SUGGEST "Brain health degraded. Run nmem_consolidate(strategy='all') after session"
```

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

Report: `"🔍 Mode detected: [mode] — Signals: kanban=[T/F], memory=[T/F], handoff=[T/F], session=[T/F]"`

## Step 2: Execute Mode-Specific Sequence

### FRESH_INIT Path

```
2a. Verify repo structure (12 directories)
    → If missing critical dirs: ABORT with suggestions
2b. Run discovery questionnaire (interactive)
2c. Initialize memory-bank (7 files)
    → PARALLEL: create activeContext, progress, decisionLog, techContext, systemPatterns, projectBrief, productContext
2d. Initialize KANBAN.md (sprint scaffold)
2e. Initialize sessions (current-session, handoff)
2f. Verify routing files (GEMINI.md, registry.yaml, routing.yaml)
2g. Emit ready-to-work report artifact
```

### RESUME Path

```
2a. Load KANBAN.md → extract sprint state, task counts, blockers
2b. PARALLEL load memory:
    ├─ activeContext.md
    ├─ progress.md (last 5 entries)
    ├─ decisionLog.md
    ├─ techContext.md
    └─ systemPatterns.md
2c. PARALLEL load brain:
    ├─ learned-patterns.md
    └─ error-catalog.md
2c-nm. Neural Memory recall (V4.1):
    ├─ nmem_recall("current project context") → cross-session experience
    └─ nmem_session(action="set", feature="...", task="...") → register session
2d. Health check:
    ├─ KANBAN ↔ activeContext sync (sprint name match?)
    ├─ No orphan IN PROGRESS tasks (check progress for recent entry)
    ├─ No stale BLOCKED tasks (> 3 sessions unaddressed)
    └─ nmem_health() → brain health score (V4.1)
2e. Detect active story/phase/task → recommend next action
2f. Emit resume report artifact
```

### WARM_UP Path

```
2a. Load handoff.md → previous session summary
2b. Load current-session.md → stopping point, files touched, pending validations
2c. Load KANBAN.md → current sprint state
2d. PARALLEL load memory (same as RESUME 2b)
2e. Reconstruct working state:
    ├─ Read first 20 lines of each file in current-session.files_touched
    └─ Check if any file has been modified since last session
2f. Environment check:
    ├─ git status (uncommitted changes?)
    ├─ git log -3 --oneline (recent commits)
    └─ build/test readiness (package.json → node_modules?)
2g. Emit context recovery report artifact
```

## Step 3: Validate Session State

After mode execution, verify:

```
□ KANBAN state is loaded and understood
□ Active task is identified (or "no active task" reported)
□ Memory is loaded (at least activeContext + progress)
□ Neural Memory session registered (nmem_session set) — V4.2
□ Neural Memory recall performed (nmem_recall OR nmem_recap) — V4.2
□ Context+ context loaded (get_context_tree OR semantic_code_search) OR graceful degradation logged — V4.2
□ Any blockers are surfaced
□ Next recommended action is stated
□ Report artifact is emitted
```

If any check fails: report `"⚠️ Session start incomplete: [missing items]"` but continue.

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
| FRESH_INIT completed with initialized KANBAN | ✅ Session ready |
| RESUME completed with active task identified | ✅ Session ready |
| WARM_UP completed with context recovered | ✅ Session ready |
| Critical files missing (GEMINI.md, registry.yaml) | ❌ Abort — ask user to run workspace setup |
| KANBAN ↔ memory desync detected | ⚠️ Continue — flag desync for manual reconciliation |

## Integration Points

| System | How this workflow connects |
|--------|--------------------------|
| `manifests/session-governance.yaml` | This workflow IMPLEMENTS the `session_start_checklist` |
| `policies/session-governance.yaml` | This workflow ENFORCES `session_start.required_reads` |
| `manifests/quality-gates.yaml` gate-11 | This workflow SATISFIES `session-hygiene` quality gate |
| `skills/session-management/session-start.md` | This workflow OPERATIONALIZES the skill-level protocol |
| `commands/start-session.md` | This workflow is the ENGINE behind the command |
| `workflows/session-close.md` (if exists) | Symmetric counterpart — close saves state that start loads |
| `neural-memory` MCP server | V4.2: cross-session recall via nmem_recall + nmem_session + heartbeat enforcement |
| `docs/mcp/neural-memory-integration.md` | Full NM setup and tool reference |
| `context-plus` MCP server | V4.2: workspace code context via get_context_tree + semantic_code_search |
