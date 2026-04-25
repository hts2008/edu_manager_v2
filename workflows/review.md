---
description: Code review — multi-perspective quality assessment
version: "4.0"
---

# Workflow: review

## Overview
Code review — multi-perspective quality assessment.

## Steps
1. CONTEXT: Read code changes, understand intent`n2. CORRECTNESS: Logic errors, edge cases, race conditions`n3. SECURITY: OWASP checks, input validation, auth`n4. QUALITY: Code style, naming, complexity, duplication`n5. TESTING: Coverage, test quality, missing scenarios`n6. PERFORMANCE: N+1 queries, memory leaks, complexity`n7. VERDICT: APPROVED, NEEDS_CHANGES, or REJECTED with specifics

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