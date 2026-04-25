---
description: Security audit — OWASP scan, secrets, auth, pen-test, report
version: "4.0"
---

# Workflow: security-audit

## Overview
Security audit — OWASP scan, secrets, auth, pen-test, report.

## Steps
1. DEPENDENCY SCAN: Check for known vulnerabilities`n2. SECRETS SCAN: Search for exposed credentials`n3. OWASP TOP 10: Check all 10 categories`n4. AUTH REVIEW: Authentication and authorization flows`n5. INPUT VALIDATION: SQL injection, XSS, CSRF`n6. PEN TEST: Simulated attack scenarios`n7. REPORT: Findings with severity and remediation

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