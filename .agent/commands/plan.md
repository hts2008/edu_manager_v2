---
name: plan
description: "Create project plan — decompose, dependencies, sprint layout"
version: "4.0"
---

# /plan

## Purpose
Create project plan — decompose, dependencies, sprint layout.

## Pre-Conditions
1. KANBAN.md read — sprint state known
2. activeContext.md read — technical context loaded
3. decisionLog.md reviewed — no contradictions
4. Task classified per manifests/routing.yaml

## Steps

### 1. Context Loading
- Read KANBAN.md, activeContext.md, decisionLog.md
- Load relevant rules/ for this task type
- Check memory/sessions/current-session.md

### 2. Task Classification
- Classify per manifests/routing.yaml
- Determine risk, review mode, quality gates
- Check CLI subagent need per routing matrix

### 3. Execution
- Follow TDD where applicable
- Progressive refinement V1-V6
- Run tests after each round
- No mock data, no placeholders

### 4. Verification
- Run all applicable quality gates
- Collect evidence (test results, screenshots, logs)
- Adversarial review if high risk

### 5. Record and Update
- Update KANBAN.md with evidence links
- Update activeContext.md
- Append progress.md
- Update decisionLog.md if decisions made
- Update current-session.md
- Emit receipt

### 6. Report
- Summarize what was done
- List files touched
- List tests/checks passed
- Identify remaining risks
- Recommend next step

## Quality Gates
See manifests/quality-gates.yaml. Gates vary by risk:
- Low: lint, memory-update, project-control, session-hygiene
- Medium: + type-check, unit-tests
- High: + integration, security, adversarial-review

## Error Handling
- Gate failure -> fix and re-run
- 3 failures -> escalate
- Unknown error -> search docs, update error-catalog

## V4 Governance
- KANBAN: task must exist on board
- Session: current-session.md updated
- Artifacts: medium/high risk need review package
- Evidence: no done without evidence