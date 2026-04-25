---
description: Safe refactoring — analyze, safety net, incremental changes, verify
version: "4.0"
---

# Workflow: refactor

## Overview
Safe refactoring — analyze, safety net, incremental changes, verify.

## Steps
1. JUSTIFY: Why refactor? What improves?`n2. SAFETY NET: Ensure tests exist (write if missing)`n3. BASELINE: All tests pass before changes`n4. INCREMENTAL: Small, verifiable changes`n5. VERIFY: Tests pass after each change`n6. FINAL CHECK: All tests pass, no behavior change`n7. REVIEW: Code review of refactored code

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