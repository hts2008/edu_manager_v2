---
description: Documentation — generate API docs, guides, architecture diagrams
version: "4.0"
---

# Workflow: document

## Overview
Documentation — generate API docs, guides, architecture diagrams.

## Steps
1. INVENTORY: What needs documentation?`n2. API DOCS: Generate from code annotations`n3. ARCHITECTURE: Diagrams and explanations`n4. SETUP GUIDE: From zero to running`n5. USER GUIDE: How to use features`n6. DECISION LOG: Update decisionLog.md`n7. HANDOFF: Package for new developer onboarding

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