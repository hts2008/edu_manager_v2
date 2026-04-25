---
description: "Mandatory session close — consolidate brain, save context, update session state"
---

// turbo-all

## Overview

This workflow is the mandatory closing sequence for every session. It ensures brain health is maintained and cross-session context is preserved. When a session ends (user says goodbye, task is complete, or agent is about to lose context), this workflow MUST execute.

**Trigger**: User says "close session", "done for today", "kết thúc", or agent detects session is ending.

## Step 1: Save Session Summary

```
nmem_remember(
  content="Session summary: [brief description of what was accomplished]",
  type="context",
  tags=["session", "summary"],
  priority=6
)
```

## Step 2: Update Session State

```
nmem_session(
  action="end"
)

Update memory/sessions/current-session.md:
  - ended: [timestamp]
  - outcome: [completed/suspended/blocked]
  - files_touched: [list from session]
  - key_decisions: [from decisionLog]
```

## Step 3: Brain Consolidation (Mandatory)

```
nmem_consolidate(strategy="all")

Expected output:
  - Pruned stale synapses
  - Merged overlapping fibers
  - Enriched metadata
  - Deduped near-duplicates
  - Compressed old fibers
```

Report results: `"🧹 Consolidation: [pruned X] [merged Y] [enriched Z]"`

## Step 4: Brain Health Check

```
nmem_health()

IF grade degraded since session start:
  WARN "⚠️ Brain health degraded: [before] → [after]"
  SUGGEST specific remediation
```

## Step 5: Generate Knowledge Surface

```
nmem_surface(action="generate")
```

This updates the `.nm` surface file for the next session's quick context load.

## Step 6: Prepare Handoff

```
Update memory/sessions/handoff.md:
  - session_date: [today]
  - completed_tasks: [task IDs from KANBAN]
  - next_recommended: [next task]
  - unresolved_risks: [list]
  - brain_health: [grade + purity]
```

## Exit Conditions

| Condition | Result |
|-----------|--------|
| All steps completed | ✅ Session closed cleanly |
| nmem_consolidate failed | ⚠️ Warn but continue — brain will recover next session |
| NM server unreachable | ⚠️ Save handoff.md locally, skip NM steps |

## Quality Gate

Session close is **COMPLETE** when:
- [ ] Session summary saved to NM
- [ ] nmem_session ended
- [ ] nmem_consolidate ran (any strategy)
- [ ] Health check performed
- [ ] handoff.md updated
