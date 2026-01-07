# 🚨 EMERGENCY RCA - Incident Response Protocol
<!-- VI: Quy trình xử lý sự cố khẩn cấp và phân tích nguyên nhân gốc -->

> **PURPOSE**: Handle critical incidents and perform Root Cause Analysis
> **Trigger**: Critical bug, production down, security breach

---

## 🔴 SEVERITY LEVELS

| Level | Name | Definition | Response Time |
|-------|------|------------|---------------|
| **SEV-1** | 🔴 Critical | Production down, data loss, security breach | **Immediate** (< 15 min) |
| **SEV-2** | 🟠 High | Major feature broken, significant users affected | **< 1 hour** |
| **SEV-3** | 🟡 Medium | Feature impaired, workaround exists | **Same day** |
| **SEV-4** | 🟢 Low | Minor issue, cosmetic, edge case | **Next sprint** |

---

## 🚨 EMERGENCY RESPONSE WORKFLOW

### PHASE 1: INCIDENT DETECTION (0-5 min)
```
WHEN incident detected:
    1. ASSESS severity level
    2. IF SEV-1 or SEV-2:
        → STOP all other work immediately
        → NOTIFY user of incident
        → Enter EMERGENCY MODE
    3. CREATE incident record:
        → .shared/knowledge_base/bugs/active/INCIDENT_{timestamp}.md
```

### PHASE 2: STABILIZATION (5-30 min)
```
PRIORITY: Restore service first, investigate later

ACTIONS:
    1. CHECK: Can we rollback?
        → IF yes: Execute rollback
        → IF no: Continue to hotfix
    
    2. IDENTIFY: What's the immediate cause?
        → Error logs
        → Recent changes
        → External dependencies
    
    3. IMPLEMENT: Hotfix or workaround
        → Minimum viable fix
        → No new features
        → Skip tests if critical
    
    4. VERIFY: Service restored?
        → IF yes: Move to Phase 3
        → IF no: Escalate
```

### PHASE 3: ROOT CAUSE ANALYSIS (30 min - 2 hours)
```
NOW investigate why this happened:

5 WHYS ANALYSIS:
    1. Why did the error occur?
       → [Immediate cause]
    
    2. Why did that happen?
       → [Underlying cause]
    
    3. Why did that happen?
       → [Deeper cause]
    
    4. Why did that happen?
       → [Process/design flaw]
    
    5. Why did that happen?
       → [ROOT CAUSE]
```

### PHASE 4: DOCUMENTATION (After resolution)
```
CREATE full RCA document:
    → .shared/knowledge_base/bugs/resolved/RCA_{incident_id}.md

INCLUDE:
    1. Timeline of events
    2. Impact assessment
    3. Root cause analysis
    4. Solution applied
    5. Prevention measures
    6. Lessons learned

UPDATE:
    → .shared/knowledge_base/lessons_learned/
    → PROJECT_CONTEXT.md
    → KANBAN.md (close incident task)
```

---

## 📋 INCIDENT TEMPLATE

```markdown
# INCIDENT: {ID} - {Title}

## Severity: SEV-{1-4}

## Timeline
| Time | Event |
|------|-------|
| {HH:MM} | Incident detected |
| {HH:MM} | Investigation started |
| {HH:MM} | Root cause identified |
| {HH:MM} | Hotfix deployed |
| {HH:MM} | Service restored |

## Impact
- **Users Affected**: {number or percentage}
- **Duration**: {X minutes/hours}
- **Data Loss**: {Yes/No - details}
- **Revenue Impact**: {if applicable}

## Symptoms
- {Symptom 1}
- {Symptom 2}

## Root Cause
{Detailed explanation of what caused this}

## 5 Whys Analysis
1. Why? → {Answer}
2. Why? → {Answer}
3. Why? → {Answer}
4. Why? → {Answer}
5. Why? → **ROOT CAUSE**: {Answer}

## Resolution
### Immediate Fix (Hotfix)
{What was done to restore service}

### Permanent Fix
{Long-term solution to prevent recurrence}

### Files Changed
- {file1.ts}: {change description}
- {file2.ts}: {change description}

## Prevention
| Action | Owner | Due | Status |
|--------|-------|-----|--------|
| Add monitoring | DevOps | {date} | ⬜ |
| Add test coverage | QA | {date} | ⬜ |
| Update documentation | Docs | {date} | ⬜ |

## Lessons Learned
- {Lesson 1}
- {Lesson 2}
```

---

## 🛠️ COMMON INCIDENT PATTERNS

### Pattern 1: Database Connection Exhaustion
```yaml
symptoms:
  - "Connection timeout" errors
  - Slow response times
  - Random 500 errors

likely_causes:
  - Connection pool too small
  - Connections not released
  - Long-running queries

quick_fixes:
  - Increase pool size
  - Restart application
  - Kill long queries

permanent_fixes:
  - Implement connection pooling properly
  - Add query timeouts
  - Add connection monitoring
```

### Pattern 2: Memory Leak
```yaml
symptoms:
  - Increasing memory usage over time
  - OOM kills
  - Degrading performance

likely_causes:
  - Event listeners not cleaned up
  - Cache without expiry
  - Circular references

quick_fixes:
  - Restart containers
  - Increase memory limits temporarily

permanent_fixes:
  - Profile memory usage
  - Implement proper cleanup
  - Add memory monitoring
```

### Pattern 3: Authentication Failure
```yaml
symptoms:
  - All users logged out
  - 401/403 errors spike
  - Token validation failures

likely_causes:
  - JWT secret changed/expired
  - Auth service down
  - Clock skew

quick_fixes:
  - Verify auth service health
  - Check JWT secret
  - Sync server time

permanent_fixes:
  - Add auth service monitoring
  - Multiple JWT secrets for rotation
  - NTP sync automation
```

### Pattern 4: Deployment Failure
```yaml
symptoms:
  - New version not loading
  - 502/503 errors
  - Health checks failing

likely_causes:
  - Container not starting
  - Missing environment variables
  - Database migration failed

quick_fixes:
  - Rollback to previous version
  - Check container logs
  - Verify env vars

permanent_fixes:
  - Pre-deployment verification
  - Canary deployments
  - Automated rollback triggers
```

---

## 📞 ESCALATION MATRIX

| Condition | Action |
|-----------|--------|
| SEV-1 not resolved in 30 min | Notify additional agents |
| SEV-1 not resolved in 2 hours | Request human intervention |
| Security breach confirmed | Immediate lockdown protocol |
| Data loss detected | Backup restoration procedure |

---

## ⚡ QUICK COMMANDS

```
/emergency [description]     # Start emergency protocol
/rca [incident-id]           # Perform RCA on incident
/rollback [version]          # Rollback to specific version
/incident-status             # Check ongoing incident status
```

---

**Version**: 2.0
**Protocol Type**: Emergency Response
