---
description: Status check — sprint summary, blockers, health, next actions
version: "4.0"
---

# Workflow: status

## Overview
Status check — sprint summary, blockers, health, next actions.

## Steps
1. READ KANBAN: Current sprint, task counts`n2. TASK STATUS: In progress, blocked, done`n3. BLOCKERS: List and proposed unblock paths`n4. HEALTH: Memory size, context usage, stale entries`n5. NEXT ACTIONS: Recommended tasks based on dependencies`n6. REPORT: Formatted status to user

## Quality Gates
Apply gates per manifests/quality-gates.yaml based on task risk level.

## Memory Updates
After completion:
- Update activeContext.md
- Append progress.md
- Update KANBAN.md
- Update current-session.md
- Emit receipt

## Error Protocol
- Gate failure: fix and re-run
- 3 failures: escalate to orchestrator
- Unknown error: search, catalog, escalate