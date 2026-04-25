---
name: pm-orchestrator
description: "Central PM hub — product management, project coordination, delivery governance, quality control"
---

# PM Orchestrator Skill

## Quick Reference

### When to Invoke
- `/pm <request>` — any development request
- `/pm status` | `standup` | `retro` | `plan` | `triage` | `architecture` | `release` | `budget` | `escalate`
- `/orchestrate` — legacy alias, redirects to /pm
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
Goal → Stories → Phases (P0→P1→P2) → Work Packages → Tasks
Each task: 1 agent, 1 session, 1 commit, ≤ 1 day
```

### 5-Phase Lifecycle
```
INTAKE → PLAN → DISPATCH → QA/QC → DELIVER
```

### Sprint Cadence
1. Sprint Planning: decompose, assign, estimate
2. Daily: check KANBAN, unblock tasks
3. Sprint Review: verify evidence for IMPLEMENTED tasks
4. Sprint Retro: update learned-patterns.md

## Sub-Skills
- `task-decomposition.md` — Breaking goals into atomic tasks
- `agent-routing.md` — Matching tasks to specialist agents
- `sprint-management.md` — KANBAN board management
- `bug-intake-and-dispatch.md` — Bug triage, severity, routing
- `release-governance.md` — Release readiness, go/no-go
- `architecture-decision-facilitation.md` — ADR process
- `qa-qc-governance.md` — Quality gates, evidence requirements
- `stakeholder-communication.md` — Report templates, escalation
- `roadmap-triage.md` — Priority, capacity, backlog grooming