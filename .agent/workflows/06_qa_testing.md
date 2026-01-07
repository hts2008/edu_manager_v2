---
description: Run QA testing for features or components
---

# 🧪 QA TESTING WORKFLOW
<!-- VI: Quy trình kiểm thử QA -->

> **Trigger**: `/qa [feature]`, task in TESTING column
> **Agent**: QA Engineer

---

## WORKFLOW STEPS

### Step 1: Load Test Context
```
READ:
  - Feature requirements from task
  - Related code changes
  - .agent/agents/qa_engineer.agent.md

IDENTIFY:
  - Test scope
  - Critical paths
  - Edge cases
```

### Step 2: Create Test Plan
```
PLAN tests:

UNIT TESTS:
  - Individual functions
  - Service methods
  - Utility functions

INTEGRATION TESTS:
  - API endpoints
  - Database operations
  - Service interactions

E2E TESTS:
  - User flows
  - Critical paths only
```

### Step 3: Write & Run Tests
```
GENERATE tests:
  - Follow templates in qa_engineer.agent.md
  - Use project test framework (Vitest/Jest/Playwright)

RUN tests:
  - Execute test suite
  - Collect coverage
  - Document results
```

### Step 4: Report Results
```
FORMAT:

## QA Report: [Feature Name]

### Summary
- Tests Run: X
- Passed: X
- Failed: X
- Coverage: X%

### Issues Found
[List any bugs with severity]

### Recommendation
✅ Ready for deployment
❌ Needs fixes (see issues)
```

### Step 5: Update Tracking
```
IF all passed:
  MOVE task to DONE
  MARK ready for deploy
ELSE:
  LOG bugs in .shared/knowledge_base/bugs/active/
  RETURN to developer
```

---

## COMMAND TEMPLATE

```
/qa user-authentication

# Or specific test type:
/qa --unit auth-service
/qa --e2e login-flow
```

---

## TEST COVERAGE TARGETS

| Type | Target |
|------|--------|
| Unit | 80%+ |
| Integration | Key paths |
| E2E | Critical flows |
