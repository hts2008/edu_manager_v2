---
name: pm-orchestrator
description: "Central PM hub â€” product management, project coordination, delivery governance, quality control"
---

# PM Orchestrator Skill

## Quick Reference

### When to Invoke
- `/pm <request>` â€” any development request
- `/pm status` | `standup` | `retro` | `plan` | `triage` | `architecture` | `release` | `budget` | `escalate`
- `/orchestrate` â€” legacy alias, redirects to /pm
- Free-form request that spans multiple domains

### Agent Selection Matrix
| Task Domain | Agent | Risk | Review |
|-------------|-------|------|--------|
| UI/Web | frontend-specialist | medium | paired |
| API/Services | backend-specialist | medium | paired |
| Schema/Migrations | database-architect | high | adversarial |
| Security | security-auditor | high | adversarial |
| Deployment | devops-engineer | high | paired |
| Testing | test-engineer | medium | self-check |
| Legacy/Refactor | code-archaeologist | medium | paired |
| Docs | documentation-writer | low | self-check |
| Performance | performance-optimizer | medium | paired |
| Bugs | debugger | medium | self-check |
| Release | release-manager | high | adversarial |

### Task Decomposition
```
Goal â†’ Stories â†’ Phases (P0â†’P1â†’P2) â†’ Work Packages â†’ Tasks
Each task: 1 agent, 1 session, 1 commit, â‰¤ 1 day
```

### 5-Phase Lifecycle
```
INTAKE â†’ PLAN â†’ DISPATCH â†’ QA/QC â†’ DELIVER
```

### Sprint Cadence
1. Sprint Planning: decompose, assign, estimate
2. Daily: check KANBAN, unblock tasks
3. Sprint Review: verify evidence for IMPLEMENTED tasks
4. Sprint Retro: update learned-patterns.md

## Sub-Skills
- `task-decomposition.md` â€” Breaking goals into atomic tasks
- `agent-routing.md` â€” Matching tasks to specialist agents
- `sprint-management.md` â€” KANBAN board management
- `bug-intake-and-dispatch.md` â€” Bug triage, severity, routing
- `release-governance.md` â€” Release readiness, go/no-go
- `architecture-decision-facilitation.md` â€” ADR process
- `qa-qc-governance.md` â€” Quality gates, evidence requirements
- `stakeholder-communication.md` â€” Report templates, escalation
- `roadmap-triage.md` â€” Priority, capacity, backlog grooming
