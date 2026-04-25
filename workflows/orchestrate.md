---
description: Multi-agent orchestration — decompose, route, coordinate, collect
version: "4.0"
---

# Workflow: orchestrate

## Overview
Multi-agent orchestration — decompose, route, coordinate, collect.

## Steps
1. RECEIVE: Accept task from user`n2. CLASSIFY: Task type per routing matrix`n3. DECOMPOSE: Break into subtasks if needed`n4. ROUTE: Assign agents per routing matrix`n5. SPAWN: CLI subagents if needed per routing matrix`n6. MONITOR: Track progress across agents`n7. COLLECT: Gather outputs, verify quality gates`n8. REPORT: Consolidated status

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