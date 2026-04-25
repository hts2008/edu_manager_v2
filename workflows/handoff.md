---
description: Release handoff — changelog, rollback plan, sign-off
version: "4.0"
---

# Workflow: handoff

## Overview
Release handoff — changelog, rollback plan, sign-off.

## Steps
1. READINESS CHECK: All quality gates pass`n2. CHANGELOG: Generate from commits since last release`n3. RELEASE NOTES: User-facing summary of changes`n4. ROLLBACK PLAN: Step-by-step rollback procedure`n5. DEPLOYMENT: Execute deploy workflow`n6. VERIFICATION: Post-deploy smoke tests`n7. SIGN-OFF: Release manager approval with evidence

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