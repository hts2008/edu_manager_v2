---
name: Parallel Agents
description: Multi-agent parallel execution: task splitting, conflict avoidance, result merging
---

# Parallel Agents

## When To Parallelize
- Independent file scopes (no shared files between agents)
- Different technology domains (frontend vs backend vs database)
- Read-heavy tasks (code review, analysis, documentation)

## Task Splitting Rules
- One agent per file or module boundary
- Assign clear ownership: agent X owns files A, B, C
- Define merge order before dispatch
- Never assign same file to two agents

## Conflict Avoidance
- Lock shared resources (database schema, config files)
- Define file ownership map before parallel dispatch
- Use feature branches for each agent if using git

## Result Merging
- Collect outputs from all agents
- Run integration check after merge
- Resolve conflicts manually if detected
- Run full test suite after all merges

## Anti-Patterns
- Two agents editing same file simultaneously
- No integration check after parallel work
- Unclear ownership leading to merge conflicts
