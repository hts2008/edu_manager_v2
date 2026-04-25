---
name: Intelligent Routing
description: Task-to-agent routing: classification, specialization matching, fallback
---

# Intelligent Routing

## Routing Algorithm
1. Classify task: type, domain, risk, scope
2. Match to primary specialist agent
3. Assign QA agent based on risk level
4. Select review mode: self-check, paired, adversarial

## Classification Dimensions
- Type: create, debug, refactor, review, test, deploy
- Domain: frontend, backend, database, security, devops
- Risk: low (docs, style), medium (features), high (auth, data, deploy)
- Scope: single file, multi-file, cross-module, system-wide

## Agent Selection Matrix
- Frontend tasks: frontend-specialist
- Backend tasks: backend-specialist
- Schema changes: database-architect (high risk, adversarial review)
- Security: security-auditor + penetration-tester
- Performance: performance-optimizer

## Fallback Strategy
- Primary agent unavailable: route to nearest specialist
- CLI quota exhausted: fall back to native execution
- Agent fails 3 times: escalate to user

## Quality Assurance Pairing
- Low risk: self-check (no QA agent)
- Medium risk: paired (builder + test-engineer)
- High risk: adversarial (builder + security-auditor/judge)
