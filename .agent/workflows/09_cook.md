---
description: Research, plan, and implement new features with agent collaboration
---

# 🍳 COOK WORKFLOW
<!-- VI: Workflow /cook để implement features end-to-end -->

> **Core Command**: `/cook [feature description]`

---

## 🚀 QUICK START

```
/cook "Add user authentication with OAuth"
```

---

## 📋 WORKFLOW PHASES

### Phase 1: Research (Optional)
```
IF feature.is_complex:
    @researcher: Research best practices
    @researcher: Analyze similar implementations
    @researcher: Evaluate libraries/frameworks
    
    OUTPUT: research-report.md
```

### Phase 2: Planning
```
@brainstormer: Explore approaches (YAGNI/KISS/DRY)
@solution_architect: Design architecture
@project_manager: Create implementation plan

OUTPUT: plans/{date}-{feature}.md
```

### Phase 3: Implementation
```
FOR each phase IN plan:
    @fullstack_engineer: Implement code
    @qa_engineer: Write tests
    
    IF tests.fail:
        @fullstack_engineer: Fix issues
```

### Phase 4: Review
```
@tech_lead: Code review
@security: Security audit (if applicable)
@performance: Performance check (if applicable)
```

### Phase 5: Documentation
```
@docs_manager: Update documentation
@git_manager: Create commit
```

---

## 🔧 VARIANTS

### Standard Cook
```
/cook [description]
# Full workflow with plan review
```

### Auto Cook
```
/cook:auto [description]
# Autonomous implementation without plan review
```

### Fast Cook
```
/cook:auto:fast [description]
# Skip research, minimal planning
```

---

## 📊 OUTPUT

```
✓ Research complete (if needed)
✓ Plan created: plans/251030-auth.md
✓ Implementation complete (8 files)
✓ Tests passing (24/24)
✓ Code review passed
✓ Documentation updated
✓ Committed: feat(auth): add OAuth login
```

---

## ⚠️ RULES

```yaml
must:
  - CREATE plan before implementing
  - RUN tests after implementation
  - REVIEW before committing
  - UPDATE documentation

can_skip:
  - Research (for simple features)
  - Security audit (non-security features)
  - Performance check (non-critical features)
```

---

**Version**: 1.0
**Reference**: ClaudeKit /cook workflow
