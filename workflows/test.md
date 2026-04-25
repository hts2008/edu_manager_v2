---
description: Testing — strategy, write tests, run, report coverage
version: "4.0"
---

# Workflow: test

## Overview
Testing — strategy, write tests, run, report coverage.

## Steps
1. STRATEGY: Define test pyramid for the feature`n2. UNIT TESTS: Write unit tests for business logic`n3. INTEGRATION TESTS: Write API/service integration tests`n4. E2E TESTS: Write critical path E2E tests`n5. COVERAGE: Measure and report coverage`n6. CI INTEGRATION: Ensure tests run in pipeline`n7. DOCUMENT: Test strategy and coverage report

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