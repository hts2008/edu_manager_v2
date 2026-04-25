---
description: Planning workflow — decompose goals into atomic tasks
version: "4.0"
---

# Workflow: plan

## Overview
Planning workflow — decompose goals into atomic tasks.

## Steps
1. UNDERSTAND: Read PRD/requirements, identify scope`n2. DECOMPOSE: Break into stories, then tasks (atomic, <=1 feature)`n3. DEPENDENCY MAP: Identify task dependencies`n4. ESTIMATE: Effort estimation per task`n5. SPRINT LAYOUT: Organize into sprint with KANBAN rows`n6. RISK ASSESSMENT: Identify risks and mitigation`n7. APPROVAL: Present plan for user review

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