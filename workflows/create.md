---
description: Feature creation — design to implementation with TDD
version: "4.0"
---

# Workflow: create

## Overview
Feature creation — design to implementation with TDD.

## Steps
1. ANALYZE: Understand requirements, identify hidden requirements`n2. DESIGN: Architecture, data model, API contract`n3. TEST FIRST: Write failing tests (unit + integration)`n4. IMPLEMENT: Make tests pass, progressive refinement V1-V6`n5. VERIFY: Run all quality gates`n6. DOCUMENT: Update docs if API/architecture changed`n7. COMMIT: Conventional commit with evidence links

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