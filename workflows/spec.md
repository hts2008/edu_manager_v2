---
description: Specification — requirements, schema, API contract, ADR
version: "4.0"
---

# Workflow: spec

## Overview
Specification — requirements, schema, API contract, ADR.

## Steps
1. REQUIREMENTS: Gather from user/stakeholder`n2. DOMAIN MODEL: Entities, relationships, constraints`n3. SCHEMA: Database table design with indexes`n4. API CONTRACT: Endpoints, request/response shapes`n5. ADR: Architecture Decision Records`n6. ACCEPTANCE CRITERIA: Testable conditions for done`n7. REVIEW: Technical review of specification

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