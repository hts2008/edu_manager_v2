---
description: Feature development from planning to completion
---

# 🚀 FEATURE DEVELOPMENT WORKFLOW
<!-- VI: Quy trình phát triển tính năng từ A-Z -->

> **Trigger**: `/plan [feature]`, new feature request
> **Agents**: PM → Architect → Developer(s) → QA → DevOps
> **Duration**: Varies by complexity

---

## WORKFLOW STEPS

### Step 1: Requirements Analysis (PM Agent)
```
GATHER requirements:
  - User stories
  - Acceptance criteria
  - Business value
  - Dependencies
  - Constraints

CREATE task breakdown:
  - Technical subtasks
  - Estimates
  - Dependencies

UPDATE KANBAN.md:
  - Add tasks to BACKLOG
  - Prioritize
```

### Step 2: Technical Design (Architect Agent)
```
ANALYZE requirements:
  - System impact
  - Architecture changes needed
  - Tech stack alignment

DESIGN solution:
  - Component diagram
  - Data flow
  - API contracts
  - Database changes

CREATE ADR if needed:
  - Document significant decisions

UPDATE:
  - PROJECT_CONTEXT.md
  - .shared/knowledge_base/architecture/
```

### Step 3: Implementation (Developer Agents)
```
ASSIGN tasks:
  - Backend → Backend Engineer
  - Frontend → Frontend Engineer
  - Database → Database Engineer

FOR each developer:
  1. Move task to IN PROGRESS
  2. Implement code
  3. Write tests
  4. Self-review
  5. Move to REVIEW
```

### Step 4: Code Review (Tech Lead)
```
REVIEW:
  - Code quality
  - Standards compliance
  - Security
  - Performance
  - Test coverage

IF approved:
  - Move to TESTING
ELSE:
  - Return to developer with feedback
```

### Step 5: QA Testing (QA Agent)
```
EXECUTE:
  - Unit test verification
  - Integration tests
  - E2E tests
  - Edge case testing
  - Regression testing

IF passed:
  - Move to DONE
  - Mark ready for deploy
ELSE:
  - Log bugs
  - Return to developer
```

### Step 6: Deployment (DevOps Agent)
```
DEPLOY:
  - Stage environment
  - Smoke tests
  - Production (if approved)
  - Monitor

UPDATE:
  - PROJECT_CONTEXT.md
  - Close related tasks
```

---

## COMMAND TEMPLATE

```
/plan user-authentication

# Or step by step:
/assign architect "Design authentication system"
/assign backend "Implement auth API"
/assign frontend "Build login UI"
/qa authentication-flow
```

---

## FEATURE CHECKLIST

- [ ] Requirements documented
- [ ] Technical design approved
- [ ] Code implemented
- [ ] Tests written
- [ ] Code reviewed
- [ ] QA passed
- [ ] Deployed
- [ ] Documented
