---
description: Debug and fix bugs with proper RCA
---

# 🐛 BUG FIX WORKFLOW
<!-- VI: Quy trình sửa lỗi với Root Cause Analysis -->

> **Trigger**: `/fix-bug [bug-id]`, bug reported, test failure
> **Agents**: QA (RCA) → Developer (fix) → QA (verify)

---

## WORKFLOW STEPS

### Step 1: Load Bug Context
```
READ: .shared/knowledge_base/bugs/active/BUG_{id}.md
UNDERSTAND:
  - Description
  - Steps to reproduce
  - Expected vs actual behavior
  - Severity
```

### Step 2: Reproduce the Bug
```
EXECUTE steps to reproduce:
  - Confirm bug still exists
  - Note exact error messages
  - Identify affected files
```

### Step 3: Root Cause Analysis
```
ANALYZE using 5 Whys:
  1. Why did error occur? → {immediate cause}
  2. Why? → {underlying cause}
  3. Why? → {deeper cause}
  4. Why? → {process/design issue}
  5. Why? → {ROOT CAUSE}

DOCUMENT in bug file
```

### Step 4: Implement Fix
```
PLAN fix:
  - Files to modify
  - Approach
  - Risk assessment
  
IMPLEMENT:
  - Write fix code
  - Add/update tests
  - Test locally
```

### Step 5: Verify Fix
```
TEST:
  - Run specific test case
  - Run related tests
  - Check for regressions
  - Test edge cases
```

### Step 6: Document Resolution
```
MOVE: Bug file to .shared/knowledge_base/bugs/resolved/

UPDATE bug file:
  - Status: 🟢 Resolved
  - Solution Applied
  - Lessons Learned

IF lesson is valuable:
  APPEND to .shared/knowledge_base/lessons_learned/
```

### Step 7: Update Tracking
```
UPDATE KANBAN.md:
  - Mark bug task as DONE
  
UPDATE PROJECT_CONTEXT.md:
  - Remove from Active Bugs
  - Add to Recently Completed
```

---

## COMMAND TEMPLATE

```
/fix-bug BUG-042
```

**With RCA first:**
```
/rca BUG-042
# Then after RCA:
/fix-bug BUG-042
```

---

## BUG SEVERITY GUIDE

| Severity | Definition | Response Time |
|----------|------------|---------------|
| 🔴 Critical | System down, data loss | Immediate |
| 🟠 High | Major feature broken | Same day |
| 🟡 Medium | Feature impaired | Within sprint |
| 🟢 Low | Minor issue | Backlog |
