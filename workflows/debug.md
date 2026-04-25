---
description: Bug debugging — reproduce, isolate, root-cause, fix, verify
version: "4.0"
---

# Workflow: debug

## Overview
Bug debugging — reproduce, isolate, root-cause, fix, verify.

## Steps
1. REPRODUCE: Create reliable reproduction steps`n2. ISOLATE: Narrow down to specific component/line`n3. ROOT CAUSE: Identify actual cause (not symptom)`n4. REGRESSION TEST: Write test that catches this bug`n5. FIX: Apply minimal fix to root cause`n6. VERIFY: All tests pass including regression test`n7. CATALOG: Add to error-catalog.md

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