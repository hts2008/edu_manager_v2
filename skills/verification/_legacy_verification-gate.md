---
name: verification-gate
description: "Quality gate enforcement, evidence collection, definition of done"
---

# Verification Gate Skill

## Quick Reference

### 11 Quality Gates
| # | Gate | Check | Tool |
|---|------|-------|------|
| 1 | Lint | 0 errors, 0 warnings | ESLint |
| 2 | Type-check | TypeScript strict pass | tsc --noEmit |
| 3 | Unit tests | All pass, coverage ≥ 80% | Jest/Vitest |
| 4 | Integration | API endpoints correct | Supertest |
| 5 | Security | No HIGH/CRITICAL vulns | npm audit |
| 6 | Memory update | activeContext + progress updated | Manual check |
| 7 | Browser/UI | All states + responsive | Playwright |
| 8 | Deploy/smoke | Health check pass | curl /health |
| 9 | Release | Release-manager sign-off | Checklist |
| 10 | Project control | KANBAN updated, evidence linked | Manual check |
| 11 | Session hygiene | Handoff updated, risks recorded | Manual check |

### Evidence Types
| Task Type | Required Evidence |
|-----------|-------------------|
| Feature | Test results, screenshot/recording, API response |
| Bug fix | Regression test output (before/after) |
| Refactor | Before/after metrics (lines, complexity, coverage) |
| Deploy | Health check response, monitoring screenshot |
| Security | Audit report, vulnerability scan results |

### Definition of Done
```
□ Code builds     □ Lint clean       □ Tests pass
□ Coverage ≥ 80%  □ No secrets       □ No mock data
□ Error handling  □ Loading states   □ Input validation
□ Queries parameterized              □ Memory updated
□ Receipt evidence exists            □ KANBAN updated
```

## Anti-Patterns
- Claiming "done" without evidence
- Skipping quality gates for speed
- Marking IMPLEMENTED without running tests