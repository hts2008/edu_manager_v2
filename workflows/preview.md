---
description: Preview — local build, serve, visual verification
version: "4.0"
---

# Workflow: preview

## Overview
Preview — local build, serve, visual verification.

## Steps
1. BUILD: Run development build`n2. SERVE: Start local dev server`n3. VERIFY: Check UI states (loading, empty, error, success)`n4. RESPONSIVE: Check mobile, tablet, desktop`n5. ACCESSIBLE: Basic a11y check`n6. REPORT: Screenshot/recording if needed

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