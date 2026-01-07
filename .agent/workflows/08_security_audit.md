---
description: Security audit for features or components
---

# 🔒 SECURITY AUDIT WORKFLOW
<!-- VI: Quy trình audit bảo mật -->

> **Trigger**: `/security-audit [target]`, before sensitive releases
> **Agent**: Security Agent

---

## WORKFLOW STEPS

### Step 1: Define Audit Scope
```
IDENTIFY:
  - Target: [feature/module/full-app]
  - Sensitive areas: [auth, payments, PII]
  - Previous vulnerabilities
  - Compliance requirements
```

### Step 2: Run Audit Checks
```
EXECUTE audit for each category:

AUTHENTICATION:
  - Password handling
  - Session management
  - Token security

AUTHORIZATION:
  - Access control checks
  - IDOR vulnerabilities
  - Privilege escalation

INPUT VALIDATION:
  - SQL injection
  - XSS vulnerabilities
  - Command injection

DATA PROTECTION:
  - Encryption at rest
  - Encryption in transit
  - Sensitive data exposure
```

### Step 3: Risk Assessment
```
FOR each finding:
  - Assign severity (Critical/High/Medium/Low)
  - Assess exploitability
  - Determine impact
  - Note affected components
```

### Step 4: Generate Report
```
CREATE security audit report:
  - Executive summary
  - Findings with severity
  - Remediation guidance
  - Priority recommendations
```

### Step 5: Track Remediation
```
FOR critical/high findings:
  - Create blocking bug
  - Assign to appropriate agent
  - Set deadline
  - Require verification fix
```

---

## COMMAND TEMPLATE

```
/security-audit auth-module
/security-audit full-app
/security-audit api-endpoints
```

---

## AUDIT OUTPUT

```markdown
## Security Audit: {target}

### Summary
| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 1 |
| Medium | 3 |
| Low | 5 |

### Critical/High Findings
[Details with remediation]

### Recommendation
[Priority actions]
```
