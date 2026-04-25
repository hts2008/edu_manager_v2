---
description: Deployment — pre-checks, build, deploy, smoke test, rollback ready
version: "4.0"
---

# Workflow: deploy

## Overview
Deployment — pre-checks, build, deploy, smoke test, rollback ready.

## Steps
1. PRE-CHECK: All quality gates pass, secrets configured`n2. BUILD: Production build, Docker image if applicable`n3. DEPLOY: Deploy to target environment`n4. SMOKE TEST: Health check, critical path verification`n5. MONITOR: Check logs, error rates, response times`n6. ROLLBACK READY: Verify rollback procedure works`n7. SIGN-OFF: Record deployment receipt

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