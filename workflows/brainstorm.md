---
description: Rapid ideation — diverge then converge on best approaches
version: "4.0"
---

# Workflow: brainstorm

## Overview
Rapid ideation — diverge then converge on best approaches.

## Steps
1. DIVERGE: Generate 10+ ideas without filtering`n2. CLUSTER: Group related ideas into themes`n3. EVALUATE: Score each cluster (feasibility, impact, effort)`n4. CONVERGE: Select top 3 approaches`n5. DOCUMENT: Write up selected approaches with pros/cons`n6. DECIDE: User picks approach or requests another round

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