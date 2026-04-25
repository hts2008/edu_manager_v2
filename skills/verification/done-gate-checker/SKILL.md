---
name: Done Gate Checker
description: Quality gates for task completion: definition of done, gate checklist
---

# Done Gate Checker

## Universal Done Criteria
- Code compiles without errors
- All existing tests still pass (no regressions)
- New code has tests (if applicable)
- KANBAN task updated with evidence
- Memory updated (activeContext, progress)

## Risk-Based Gates

### LOW Risk Tasks
- Lint passes
- No type errors
- Basic smoke check

### MEDIUM Risk Tasks
- All LOW gates plus
- Integration tests pass
- Memory update verified
- KANBAN board current

### HIGH Risk Tasks
- All MEDIUM gates plus
- Security review completed
- Judge agent review passed
- Evidence package complete
- Rollback plan documented

## Gate Failure Protocol
- First failure: fix and rerun
- Second failure: different approach
- Third failure: escalate to user
- Never skip gates to meet deadline
