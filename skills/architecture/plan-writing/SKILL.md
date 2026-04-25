---
name: Plan Writing
description: Technical planning: RFC, ADR, implementation plans, task decomposition
---

# Plan Writing

## RFC Structure
- Problem statement (what and why)
- Proposed solution (how)
- Alternatives considered (why not others)
- Migration plan (incremental steps)
- Rollback plan (if it goes wrong)

## ADR Format
- Title: short decision description
- Status: proposed/accepted/deprecated
- Context: what forces led to this decision
- Decision: what was decided
- Consequences: positive, negative, neutral

## Task Decomposition
- Break into tasks completable in under 4 hours
- Each task has clear input and output
- Dependencies explicitly stated
- Acceptance criteria per task

## Implementation Plan
- Dependency graph visualization
- Risk assessment per component
- Rollout phases: canary > staged > full
