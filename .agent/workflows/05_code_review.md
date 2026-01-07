---
description: Perform code review following project standards
---

# 👀 CODE REVIEW WORKFLOW
<!-- VI: Quy trình review code -->

> **Trigger**: `/review`, PR created, task in REVIEW column
> **Agent**: Tech Lead

---

## WORKFLOW STEPS

### Step 1: Load Context
```
READ:
  - PROJECT_CONTEXT.md (tech stack, standards)
  - .shared/knowledge_base/lessons_learned/BEST_PRACTICES.md
  - .shared/knowledge_base/lessons_learned/ANTI_PATTERNS.md
  - Related task from KANBAN.md
```

### Step 2: Review Code Changes
```
CHECK each category:

FUNCTIONALITY:
  - Does it work as intended?
  - Edge cases handled?
  - Error handling complete?

SECURITY:
  - Input validation?
  - No hardcoded secrets?
  - SQL injection safe?
  - XSS safe?

PERFORMANCE:
  - Efficient algorithms?
  - No N+1 queries?
  - Proper caching?

CODE QUALITY:
  - Follows naming conventions?
  - No code duplication?
  - Appropriate abstraction?
  - Comments explain WHY?

TESTS:
  - Unit tests present?
  - Edge cases covered?
  - Tests meaningful?
```

### Step 3: Generate Review
```
FORMAT output:

## Code Review: [Feature/Change Name]

### Verdict: APPROVE ✅ / REQUEST_CHANGES 🔄 / REJECT ❌

### Critical Issues (Must Fix)
[List blocking issues]

### Suggestions (Should Consider)
[List improvements]

### What's Good 👍
[Positive observations]
```

### Step 4: Update Tracking
```
IF approved:
  MOVE task to TESTING in KANBAN.md
ELSE:
  ADD comments to task
  RETURN to developer
```

---

## COMMAND TEMPLATE

```
/review

# Or specific:
/review src/services/auth.service.ts
```

---

## REVIEW CHECKLIST

```markdown
## Functionality
- [ ] Works as expected
- [ ] Edge cases handled
- [ ] Error handling appropriate

## Security  
- [ ] No hardcoded secrets
- [ ] Inputs validated
- [ ] Auth/authz correct

## Performance
- [ ] No obvious issues
- [ ] Efficient queries

## Quality
- [ ] Follows conventions
- [ ] No duplication
- [ ] Well commented

## Testing
- [ ] Tests included
- [ ] Coverage adequate
```
