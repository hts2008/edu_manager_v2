---
name: Task to Agent Routing
description: Mapping tasks to specialist agents: routing table, context passing
---

# Task to Agent Routing

## Routing Table
- UI/frontend work: frontend-specialist
- API/backend logic: backend-specialist
- Database/schema: database-architect
- CI/CD/deploy: devops-engineer
- Security issues: security-auditor
- Performance: performance-optimizer
- Test strategy: test-engineer
- E2E/automation: qa-automation-engineer
- Bug investigation: debugger
- Documentation: documentation-writer
- Planning: project-planner
- Requirements: product-manager

## Context Passing
- Task description with acceptance criteria
- Relevant file paths and line ranges
- Related decision log entries
- Known constraints and risks
- Previous attempts and failures

## Multi-Agent Coordination
- One lead agent per task (owns output)
- Support agents provide input but dont own files
- Judge agent for independent review
- Orchestrator coordinates handoffs
