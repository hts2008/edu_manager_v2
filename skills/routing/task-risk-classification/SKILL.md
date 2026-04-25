---
name: Task Risk Classification
description: Classifying task risk: impact analysis, blast radius, review mode selection
---

# Task Risk Classification

## Risk Levels
- LOW: documentation, style changes, adding comments
- MEDIUM: new features, UI changes, test additions
- HIGH: authentication, database schema, deployment, security
- CRITICAL: data migration, billing logic, access control

## Classification Criteria
- Data sensitivity: does it touch user data or credentials?
- Blast radius: how many components are affected?
- Reversibility: can the change be easily rolled back?
- User impact: does it affect live users immediately?

## Risk Escalation Triggers
- Task touches auth or security: always HIGH+
- Task modifies database schema: always HIGH
- Task changes payment or billing: always CRITICAL
- Task affects more than 3 modules: bump risk by one level

## Review Mode Selection
- LOW: self-check (author reviews own work)
- MEDIUM: paired (builder + QA agent)
- HIGH: adversarial (builder + security-auditor/judge-agent)
- CRITICAL: adversarial + user approval required
