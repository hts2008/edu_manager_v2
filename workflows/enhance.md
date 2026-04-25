---
description: Enhancement — profile, optimize, benchmark existing features
version: "4.0"
---

# Workflow: enhance

## Overview
Enhancement — profile, optimize, benchmark existing features.

## Steps
1. PROFILE: Identify bottleneck with measurements`n2. BASELINE: Record current performance metrics`n3. ANALYZE: Root cause of performance issue`n4. OPTIMIZE: Apply targeted optimization`n5. BENCHMARK: Measure improvement vs baseline`n6. VERIFY: Ensure no regressions`n7. DOCUMENT: Record optimization with before/after

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